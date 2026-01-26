import { env } from 'cloudflare:test';
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { PromoCodeService, InvalidPromoCodeError } from '../promo-code-service';
import { WalletService } from '../wallet-service';
import { initTestDatabase, TEST_USER, createTestUser, TEST_USER_2 } from '../../__fixtures__/test-utils';

describe('PromoCodeService', () => {
  let promoCodeService: PromoCodeService;
  let walletService: WalletService;

  beforeAll(async () => {
    await initTestDatabase();
  });

  beforeEach(async () => {
    promoCodeService = new PromoCodeService(env.DB);
    walletService = new WalletService(env.DB);
    await env.DB.prepare('DELETE FROM promo_code_redemptions').run();
    await env.DB.prepare('DELETE FROM promo_codes').run();
    await env.DB.prepare('DELETE FROM credit_transactions').run();
    await env.DB.prepare('DELETE FROM user_wallets').run();
    await env.DB.prepare('DELETE FROM iap_purchases').run();
    await createTestUser();
    await createTestUser(TEST_USER_2);
    vi.clearAllMocks();
  });

  describe('redeemCode', () => {
    it('grants credits to user wallet', async () => {
      const now = Date.now();
      const futureExpiry = now + 86400000;
      await insertPromoCode({
        code: 'WELCOME',
        name: 'Welcome Bonus',
        maxUses: 100,
        currentUses: 0,
        grantAmountMicros: 5000000,
        startsAt: null,
        expiresAt: futureExpiry,
        isActive: 1,
      });

      const result = await promoCodeService.redeemCode('WELCOME', TEST_USER.id, walletService);

      expect(result.success).toBe(true);
      expect(result.newBalance).toBe(5000000);
      expect(result.grantedSparks).toBe(5000);

      const balance = await walletService.getBalance(TEST_USER.id);
      expect(balance).toBe(5000000);
    });

    it('returns alreadyRedeemed=true if same user tries again (idempotent)', async () => {
      const now = Date.now();
      await insertPromoCode({
        code: 'FIRSTTIME',
        name: 'First Time Code',
        maxUses: null,
        currentUses: 0,
        grantAmountMicros: 1000000,
        startsAt: null,
        expiresAt: null,
        isActive: 1,
      });

      const result1 = await promoCodeService.redeemCode('FIRSTTIME', TEST_USER.id, walletService);
      expect(result1.success).toBe(true);
      expect(result1.alreadyRedeemed).toBeUndefined();

      const result2 = await promoCodeService.redeemCode('FIRSTTIME', TEST_USER.id, walletService);
      expect(result2.success).toBe(true);
      expect(result2.alreadyRedeemed).toBe(true);
      expect(result2.newBalance).toBeUndefined();

      const balance = await walletService.getBalance(TEST_USER.id);
      expect(balance).toBe(1000000);
    });

    it('allows different users to redeem the same promo code', async () => {
      await insertPromoCode({
        code: 'SHARED',
        name: 'Shared Promo Code',
        maxUses: 10,
        currentUses: 0,
        grantAmountMicros: 1000000,
        startsAt: null,
        expiresAt: null,
        isActive: 1,
      });

      const result1 = await promoCodeService.redeemCode('SHARED', TEST_USER.id, walletService);
      const result2 = await promoCodeService.redeemCode('SHARED', TEST_USER_2.id, walletService);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.alreadyRedeemed).toBeUndefined();
      expect(result2.alreadyRedeemed).toBeUndefined();

      const code = await env.DB
        .prepare('SELECT current_uses FROM promo_codes WHERE code = ?')
        .bind('SHARED')
        .first();

      expect(code?.current_uses).toBe(2);

      const balance1 = await walletService.getBalance(TEST_USER.id);
      const balance2 = await walletService.getBalance(TEST_USER_2.id);
      expect(balance1).toBe(1000000);
      expect(balance2).toBe(1000000);
    });

    it('respects max_uses limit during redemption', async () => {
      await insertPromoCode({
        code: 'LIMITED',
        name: 'Limited Code',
        maxUses: 2,
        currentUses: 2,
        grantAmountMicros: 1000000,
        startsAt: null,
        expiresAt: null,
        isActive: 1,
      });

      await expect(
        promoCodeService.redeemCode('LIMITED', TEST_USER.id, walletService)
      ).rejects.toThrow(InvalidPromoCodeError);
    });

    it('increments current uses count after successful redemption', async () => {
      await insertPromoCode({
        code: 'BONUS',
        name: 'Bonus Code',
        maxUses: 10,
        currentUses: 5,
        grantAmountMicros: 2000000,
        startsAt: null,
        expiresAt: null,
        isActive: 1,
      });

      await promoCodeService.redeemCode('BONUS', TEST_USER.id, walletService);

      const code = await env.DB
        .prepare('SELECT current_uses FROM promo_codes WHERE code = ?')
        .bind('BONUS')
        .first();

      expect(code?.current_uses).toBe(6);
    });

    it('records redemption in promo_code_redemptions table', async () => {
      await insertPromoCode({
        code: 'RECORDTEST',
        name: 'Record Test Code',
        maxUses: null,
        currentUses: 0,
        grantAmountMicros: 3000000,
        startsAt: null,
        expiresAt: null,
        isActive: 1,
      });

      await promoCodeService.redeemCode('RECORDTEST', TEST_USER.id, walletService);

      const redemption = await env.DB
        .prepare('SELECT * FROM promo_code_redemptions WHERE user_id = ? AND code = ?')
        .bind(TEST_USER.id, 'RECORDTEST')
        .first();

      expect(redemption).not.toBeNull();
      expect(redemption?.code).toBe('RECORDTEST');
      expect(redemption?.grant_amount_micros).toBe(3000000);
      expect(redemption?.created_at).toBeGreaterThan(0);
    });

    it('throws for non-existent code', async () => {
      await expect(
        promoCodeService.redeemCode('NONEXISTENT', TEST_USER.id, walletService)
      ).rejects.toThrow(InvalidPromoCodeError);
    });

    it('throws for inactive code', async () => {
      await insertPromoCode({
        code: 'INACTIVE',
        name: 'Inactive Code',
        maxUses: null,
        currentUses: 0,
        grantAmountMicros: 1000000,
        startsAt: null,
        expiresAt: null,
        isActive: 0,
      });

      await expect(
        promoCodeService.redeemCode('INACTIVE', TEST_USER.id, walletService)
      ).rejects.toThrow(InvalidPromoCodeError);
    });

    it('throws for expired code', async () => {
      const pastExpiry = Date.now() - 86400000;
      await insertPromoCode({
        code: 'EXPIRED',
        name: 'Expired Code',
        maxUses: null,
        currentUses: 0,
        grantAmountMicros: 1000000,
        startsAt: null,
        expiresAt: pastExpiry,
        isActive: 1,
      });

      await expect(
        promoCodeService.redeemCode('EXPIRED', TEST_USER.id, walletService)
      ).rejects.toThrow(InvalidPromoCodeError);
    });

    it('throws for code that has not yet started', async () => {
      const futureStart = Date.now() + 86400000;
      await insertPromoCode({
        code: 'FUTURE',
        name: 'Future Code',
        maxUses: null,
        currentUses: 0,
        grantAmountMicros: 1000000,
        startsAt: futureStart,
        expiresAt: null,
        isActive: 1,
      });

      await expect(
        promoCodeService.redeemCode('FUTURE', TEST_USER.id, walletService)
      ).rejects.toThrow(InvalidPromoCodeError);
    });

    it('normalizes code to uppercase', async () => {
      await insertPromoCode({
        code: 'CASETEST',
        name: 'Case Test Code',
        maxUses: null,
        currentUses: 0,
        grantAmountMicros: 1000000,
        startsAt: null,
        expiresAt: null,
        isActive: 1,
      });

      const result = await promoCodeService.redeemCode('casetest', TEST_USER.id, walletService);
      expect(result.success).toBe(true);

      const resultMixed = await promoCodeService.redeemCode('CaseTest', TEST_USER_2.id, walletService);
      expect(resultMixed.success).toBe(true);
    });

    it('throws for code with whitespace that does not match', async () => {
      await insertPromoCode({
        code: 'TRIMMED',
        name: 'Trimmed Code',
        maxUses: null,
        currentUses: 0,
        grantAmountMicros: 1000000,
        startsAt: null,
        expiresAt: null,
        isActive: 1,
      });

      await expect(
        promoCodeService.redeemCode('  TRIMMED  ', TEST_USER.id, walletService)
      ).rejects.toThrow(InvalidPromoCodeError);
    });

    it('throws for code requiring min account age when user is too new', async () => {
      const now = Date.now();
      const recentUserId = 'recent-user-id';
      await env.DB.prepare(
        `INSERT OR REPLACE INTO users (id, email, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`
      ).bind(recentUserId, 'recent@example.com', 'Recent User', now - 1000, now).run();

      await insertPromoCode({
        code: 'OLDDOG',
        name: 'Old Dog Code',
        maxUses: null,
        currentUses: 0,
        grantAmountMicros: 1000000,
        startsAt: null,
        expiresAt: null,
        isActive: 1,
        minAccountAgeDays: 7,
      });

      await expect(
        promoCodeService.redeemCode('OLDDOG', recentUserId, walletService)
      ).rejects.toThrow(InvalidPromoCodeError);
    });

    it('allows code requiring min account age when user is old enough', async () => {
      const now = Date.now();
      const oldUserId = 'old-user-id';
      await env.DB.prepare(
        `INSERT OR REPLACE INTO users (id, email, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`
      ).bind(oldUserId, 'old@example.com', 'Old User', now - (10 * 86400000), now).run();

      await insertPromoCode({
        code: 'LOYAL',
        name: 'Loyal Customer Code',
        maxUses: null,
        currentUses: 0,
        grantAmountMicros: 2000000,
        startsAt: null,
        expiresAt: null,
        isActive: 1,
        minAccountAgeDays: 7,
      });

      const result = await promoCodeService.redeemCode('LOYAL', oldUserId, walletService);
      expect(result.success).toBe(true);
    });

    it('throws for code requiring purchase history when user has no purchase', async () => {
      await insertPromoCode({
        code: 'VIP',
        name: 'VIP Code',
        maxUses: null,
        currentUses: 0,
        grantAmountMicros: 5000000,
        startsAt: null,
        expiresAt: null,
        isActive: 1,
        requiresPurchaseHistory: true,
      });

      await expect(
        promoCodeService.redeemCode('VIP', TEST_USER.id, walletService)
      ).rejects.toThrow(InvalidPromoCodeError);
    });

    it('allows code requiring purchase history when user has purchase', async () => {
      const now = Date.now();
      await env.DB.prepare(
        `INSERT INTO iap_purchases (id, user_id, product_id, status, created_at) VALUES (?, ?, ?, ?, ?)`
      ).bind('purchase-1', TEST_USER.id, 'com.test.product', 'completed', now).run();

      await insertPromoCode({
        code: 'VIP',
        name: 'VIP Code',
        maxUses: null,
        currentUses: 0,
        grantAmountMicros: 5000000,
        startsAt: null,
        expiresAt: null,
        isActive: 1,
        requiresPurchaseHistory: true,
      });

      const result = await promoCodeService.redeemCode('VIP', TEST_USER.id, walletService);
      expect(result.success).toBe(true);
    });
  });

  describe('createCode', () => {
    it('creates a new promo code', async () => {
      await promoCodeService.createCode({
        code: 'NEWCODE',
        name: 'New Code',
        grantAmountMicros: 1000000,
        maxUses: 50,
      });

      const code = await env.DB
        .prepare('SELECT * FROM promo_codes WHERE code = ?')
        .bind('NEWCODE')
        .first();

      expect(code).not.toBeNull();
      expect(code?.name).toBe('New Code');
      expect(code?.grant_amount_micros).toBe(1000000);
      expect(code?.max_uses).toBe(50);
      expect(code?.is_active).toBe(1);
    });

    it('normalizes code to uppercase', async () => {
      await promoCodeService.createCode({
        code: 'lowercase',
        name: 'Lowercase Code',
        grantAmountMicros: 1000000,
      });

      const code = await env.DB
        .prepare('SELECT * FROM promo_codes WHERE code = ?')
        .bind('LOWERCASE')
        .first();

      expect(code).not.toBeNull();
    });
  });

  describe('listCodes', () => {
    it('returns all promo codes ordered by created_at DESC', async () => {
      const now = Date.now();
      await env.DB.prepare(`
        INSERT INTO promo_codes (id, code, name, grant_amount_micros, current_uses, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind('code-1', 'CODEA', 'Code A', 1000000, 0, 1, now - 1000, now).run();

      await env.DB.prepare(`
        INSERT INTO promo_codes (id, code, name, grant_amount_micros, current_uses, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind('code-2', 'CODEB', 'Code B', 2000000, 0, 1, now, now).run();

      const codes = await promoCodeService.listCodes();

      expect(codes).toHaveLength(2);
      expect(codes[0].code).toBe('CODEB');
      expect(codes[1].code).toBe('CODEA');
    });

    it('returns empty array when no codes exist', async () => {
      const codes = await promoCodeService.listCodes();
      expect(codes).toEqual([]);
    });
  });
});

async function insertPromoCode(params: {
  code: string;
  name: string;
  maxUses: number | null;
  currentUses: number;
  grantAmountMicros: number;
  startsAt: number | null;
  expiresAt: number | null;
  isActive: number;
  minAccountAgeDays?: number | null;
  requiresPurchaseHistory?: boolean;
}): Promise<void> {
  const now = Date.now();
  const id = `promo-${params.code.toLowerCase()}`;

  await env.DB.prepare(`
    INSERT INTO promo_codes 
    (id, code, name, grant_amount_micros, max_uses, current_uses, starts_at, expires_at, 
     is_active, min_account_age_days, requires_purchase_history, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    params.code.toUpperCase(),
    params.name,
    params.grantAmountMicros,
    params.maxUses,
    params.currentUses,
    params.startsAt,
    params.expiresAt,
    params.isActive,
    params.minAccountAgeDays ?? null,
    params.requiresPurchaseHistory ? 1 : 0,
    now,
    now
  ).run();
}
