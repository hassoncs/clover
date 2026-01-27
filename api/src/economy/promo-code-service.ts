import { nanoid } from 'nanoid';
import { WalletService } from './wallet-service';

type D1Database = import('@cloudflare/workers-types').D1Database;
import { microsToSparks } from './pricing';

export interface PromoCode {
  code: string;
  name: string;
  maxUses: number | null;
  currentUses: number;
  grantAmountMicros: number;
  isActive: boolean;
  startsAt: number | null;
  expiresAt: number | null;
  minAccountAgeDays: number | null;
  requiresPurchaseHistory: boolean;
}

export class PromoCodeService {
  constructor(private db: D1Database) {}

  /**
   * Redeem a promo code for an existing user
   * Idempotent: returns success if already redeemed (no double-grant)
   */
  async redeemCode(
    code: string, 
    userId: string, 
    walletService: WalletService
  ): Promise<{ 
    success: boolean; 
    newBalance?: number; 
    alreadyRedeemed?: boolean;
    grantedSparks?: number;
  }> {
    const now = Date.now();
    const normalizedCode = code.toUpperCase();
    
    // Check if already redeemed (idempotent)
    const existingRedemption = await this.db
      .prepare('SELECT id FROM promo_code_redemptions WHERE user_id = ? AND code = ?')
      .bind(userId, normalizedCode)
      .first();
    
    if (existingRedemption) {
      return { success: true, alreadyRedeemed: true };
    }
    
    // Get promo code
    const promoCode = await this.db
      .prepare('SELECT * FROM promo_codes WHERE code = ? AND is_active = 1')
      .bind(normalizedCode)
      .first<any>();
    
    if (!promoCode) {
      throw new InvalidPromoCodeError(code, 'Code not found or inactive');
    }
    
    // Check start time
    if (promoCode.starts_at && now < promoCode.starts_at) {
      throw new InvalidPromoCodeError(code, 'Code is not yet active');
    }
    
    // Check expiration
    if (promoCode.expires_at && now > promoCode.expires_at) {
      throw new InvalidPromoCodeError(code, 'Code has expired');
    }
    
    // Check usage limit
    if (promoCode.max_uses !== null && promoCode.current_uses >= promoCode.max_uses) {
      throw new InvalidPromoCodeError(code, 'Code has reached maximum uses');
    }
    
    // Check account age requirement
    if (promoCode.min_account_age_days) {
      const user = await this.db
        .prepare('SELECT created_at FROM users WHERE id = ?')
        .bind(userId)
        .first<any>();
      
      if (user) {
        const accountAgeDays = (now - user.created_at) / (1000 * 60 * 60 * 24);
        if (accountAgeDays < promoCode.min_account_age_days) {
          throw new InvalidPromoCodeError(
            code, 
            `Account must be at least ${promoCode.min_account_age_days} days old`
          );
        }
      }
    }
    
    // Check purchase history requirement
    if (promoCode.requires_purchase_history) {
      const hasPurchase = await this.db
        .prepare('SELECT id FROM iap_purchases WHERE user_id = ? AND status = ? LIMIT 1')
        .bind(userId, 'completed')
        .first();
      
      if (!hasPurchase) {
        throw new InvalidPromoCodeError(code, 'Code requires previous purchase');
      }
    }
    
    // Credit wallet first (so we get the transaction ID)
    const newBalance = await walletService.credit({
      userId,
      type: 'promo_code_grant',
      amountMicros: promoCode.grant_amount_micros,
      referenceType: 'promo_code',
      referenceId: normalizedCode,
      idempotencyKey: `promo_${userId}_${normalizedCode}`,
      description: `Promo code: ${promoCode.name}`,
    });
    
    // Get the transaction ID we just created
    const tx = await this.db
      .prepare('SELECT id FROM credit_transactions WHERE idempotency_key = ?')
      .bind(`promo_${userId}_${normalizedCode}`)
      .first<any>();
    
    // Record redemption + increment usage
    await this.db.batch([
      this.db.prepare(`
        UPDATE promo_codes 
        SET current_uses = current_uses + 1, updated_at = ?
        WHERE code = ?
      `).bind(now, normalizedCode),
      
      this.db.prepare(`
        INSERT INTO promo_code_redemptions (id, code, user_id, grant_amount_micros, transaction_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(nanoid(), normalizedCode, userId, promoCode.grant_amount_micros, tx?.id ?? null, now),
    ]);
    
    return { 
      success: true, 
      newBalance,
      grantedSparks: microsToSparks(promoCode.grant_amount_micros),
    };
  }

  /**
    * Create a new promo code (admin only)
    */
  async createCode(params: {
    code: string;
    name: string;
    grantAmountMicros: number;
    maxUses?: number;
    startsAt?: number;
    expiresAt?: number;
    minAccountAgeDays?: number;
    requiresPurchaseHistory?: boolean;
    createdBy?: string;
    notes?: string;
  }): Promise<void> {
    const now = Date.now();
    
    await this.db.prepare(`
      INSERT INTO promo_codes 
      (id, code, name, grant_amount_micros, max_uses, starts_at, expires_at, 
       min_account_age_days, requires_purchase_history, created_by, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      nanoid(),
      params.code.toUpperCase(),
      params.name,
      params.grantAmountMicros,
      params.maxUses ?? null,
      params.startsAt ?? null,
      params.expiresAt ?? null,
      params.minAccountAgeDays ?? null,
      params.requiresPurchaseHistory ? 1 : 0,
      params.createdBy ?? null,
      params.notes ?? null,
      now,
      now
    ).run();
  }

  /**
    * List all promo codes (admin only)
    */
  async listCodes(): Promise<PromoCode[]> {
    const result = await this.db
      .prepare('SELECT * FROM promo_codes ORDER BY created_at DESC')
      .all<any>();
    return (result.results ?? []).map(row => ({
      code: row.code,
      name: row.name,
      maxUses: row.max_uses,
      currentUses: row.current_uses,
      grantAmountMicros: row.grant_amount_micros,
      isActive: row.is_active === 1,
      startsAt: row.starts_at,
      expiresAt: row.expires_at,
      minAccountAgeDays: row.min_account_age_days,
      requiresPurchaseHistory: row.requires_purchase_history === 1,
    }));
  }
}

export class InvalidPromoCodeError extends Error {
  constructor(public code: string, public reason: string) {
    super(`Invalid promo code "${code}": ${reason}`);
    this.name = 'InvalidPromoCodeError';
  }
}
