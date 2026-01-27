import { nanoid } from 'nanoid';
import { GRANTS } from './pricing';
import { WalletService } from './wallet-service';

type D1Database = import('@cloudflare/workers-types').D1Database;

export interface SignupCode {
  code: string;
  name: string;
  maxUses: number | null;
  currentUses: number;
  grantAmountMicros: number;
  isActive: boolean;
  expiresAt: number | null;
}

export class SignupCodeService {
  constructor(private db: D1Database) {}

  /**
   * Validate a signup code (called during registration)
   * Returns the grant amount if valid, throws if invalid
   */
  async validateCode(code: string): Promise<{ valid: true; grantAmountMicros: number }> {
    const now = Date.now();
    
    const signupCode = await this.db
      .prepare(`
        SELECT * FROM signup_codes 
        WHERE code = ? AND is_active = 1
      `)
      .bind(code.toUpperCase())
      .first<any>();
    
    if (!signupCode) {
      throw new InvalidSignupCodeError(code, 'Code not found or inactive');
    }
    
    // Check expiration
    if (signupCode.expires_at && now > signupCode.expires_at) {
      throw new InvalidSignupCodeError(code, 'Code has expired');
    }
    
    // Check usage limit
    if (signupCode.max_uses !== null && signupCode.current_uses >= signupCode.max_uses) {
      throw new InvalidSignupCodeError(code, 'Code has reached maximum uses');
    }
    
    return {
      valid: true,
      grantAmountMicros: signupCode.grant_amount_micros,
    };
  }

  /**
   * Redeem a signup code for a new user
   * Called AFTER user is created in Supabase Auth
   */
  async redeemCode(
    code: string, 
    userId: string, 
    walletService: WalletService
  ): Promise<{ newBalance: number }> {
    const now = Date.now();
    const redemptionId = nanoid();
    
    // Validate first
    const { grantAmountMicros } = await this.validateCode(code);
    
    // Check user hasn't already redeemed a signup code
    const existingRedemption = await this.db
      .prepare('SELECT id FROM signup_code_redemptions WHERE user_id = ?')
      .bind(userId)
      .first();
    
    if (existingRedemption) {
      throw new InvalidSignupCodeError(code, 'User has already used a signup code');
    }
    
    // Atomically: increment usage count + record redemption + credit wallet
    const upperCode = code.toUpperCase();
    await this.db.batch([
      // Increment usage count
      this.db.prepare(`
        UPDATE signup_codes 
        SET current_uses = current_uses + 1, updated_at = ?
        WHERE code = ?
      `).bind(now, upperCode),
      
      // Record redemption
      this.db.prepare(`
        INSERT INTO signup_code_redemptions (id, code, user_id, grant_amount_micros, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).bind(redemptionId, upperCode, userId, grantAmountMicros, now),
    ]);
    
    // Credit the wallet (creates wallet if needed)
    const newBalance = await walletService.credit({
      userId,
      type: 'signup_code_grant',
      amountMicros: grantAmountMicros,
      referenceType: 'signup_code',
      referenceId: upperCode,
      idempotencyKey: `signup_${userId}`,
      description: `Welcome bonus with code ${code}`,
    });
    
    return { newBalance };
  }

  /**
   * Create a new signup code (admin only)
   */
  async createCode(params: {
    code: string;
    name: string;
    maxUses?: number;
    grantAmountMicros?: number;
    expiresAt?: number;
    createdBy?: string;
    notes?: string;
  }): Promise<void> {
    const now = Date.now();
    
    await this.db.prepare(`
      INSERT INTO signup_codes 
      (code, name, max_uses, grant_amount_micros, expires_at, created_by, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      params.code.toUpperCase().trim(),
      params.name,
      params.maxUses ?? null,
      params.grantAmountMicros ?? GRANTS.SIGNUP_CODE_DEFAULT,
      params.expiresAt ?? null,
      params.createdBy ?? null,
      params.notes ?? null,
      now,
      now
    ).run();
  }
}

export class InvalidSignupCodeError extends Error {
  constructor(public code: string, public reason: string) {
    super(`Invalid signup code "${code}": ${reason}`);
    this.name = 'InvalidSignupCodeError';
  }
}
