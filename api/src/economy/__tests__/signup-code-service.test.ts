import { env } from 'cloudflare:test';
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { SignupCodeService, InvalidSignupCodeError } from '../signup-code-service';
import { WalletService } from '../wallet-service';
import { initTestDatabase, TEST_USER, createTestUser, TEST_USER_2 } from '../../__fixtures__/test-utils';

describe('SignupCodeService', () => {
  let signupCodeService: SignupCodeService;
  let walletService: WalletService;

  beforeAll(async () => {
    await initTestDatabase();
  });

  beforeEach(async () => {
    signupCodeService = new SignupCodeService(env.DB);
    walletService = new WalletService(env.DB);
    // Clean up tables between tests
    await env.DB.prepare('DELETE FROM signup_code_redemptions').run();
    await env.DB.prepare('DELETE FROM signup_codes').run();
    await env.DB.prepare('DELETE FROM credit_transactions').run();
    await env.DB.prepare('DELETE FROM user_wallets').run();
    await createTestUser();
    await createTestUser(TEST_USER_2);
    vi.clearAllMocks();
  });

  describe('validateCode', () => {
    it('returns valid code info for active, non-expired code', async () => {
      const now = Date.now();
      const futureExpiry = now + 86400000; // 24 hours from now
      await insertSignupCode({
        code: 'VALID123',
        name: 'Valid Test Code',
        maxUses: 100,
        currentUses: 0,
        grantAmountMicros: 5000000,
        expiresAt: futureExpiry,
        isActive: 1,
      });

      const result = await signupCodeService.validateCode('VALID123');

      expect(result.valid).toBe(true);
      expect(result.grantAmountMicros).toBe(5000000);
    });

    it('returns valid code info regardless of case', async () => {
      const now = Date.now();
      await insertSignupCode({
        code: 'MIXEDCASE',
        name: 'Mixed Case Test',
        maxUses: null,
        currentUses: 0,
        grantAmountMicros: 3000000,
        expiresAt: null,
        isActive: 1,
      });

      const resultLower = await signupCodeService.validateCode('mixedcase');
      const resultUpper = await signupCodeService.validateCode('MIXEDCASE');
      const resultMixed = await signupCodeService.validateCode('MixedCase');

      expect(resultLower.valid).toBe(true);
      expect(resultUpper.valid).toBe(true);
      expect(resultMixed.valid).toBe(true);
      expect(resultLower.grantAmountMicros).toBe(3000000);
    });

    it('throws InvalidSignupCodeError for non-existent code', async () => {
      await expect(
        signupCodeService.validateCode('NONEXISTENT')
      ).rejects.toThrow(InvalidSignupCodeError);
    });

    it('throws InvalidSignupCodeError for inactive code', async () => {
      await insertSignupCode({
        code: 'INACTIVE',
        name: 'Inactive Test Code',
        maxUses: null,
        currentUses: 0,
        grantAmountMicros: 1000000,
        expiresAt: null,
        isActive: 0,
      });

      await expect(
        signupCodeService.validateCode('INACTIVE')
      ).rejects.toThrow(InvalidSignupCodeError);
    });

    it('throws InvalidSignupCodeError for expired code', async () => {
      const pastExpiry = Date.now() - 86400000; // 24 hours ago
      await insertSignupCode({
        code: 'EXPIRED',
        name: 'Expired Test Code',
        maxUses: null,
        currentUses: 0,
        grantAmountMicros: 1000000,
        expiresAt: pastExpiry,
        isActive: 1,
      });

      await expect(
        signupCodeService.validateCode('EXPIRED')
      ).rejects.toThrow(InvalidSignupCodeError);
    });

    it('throws InvalidSignupCodeError when max uses reached', async () => {
      await insertSignupCode({
        code: 'MAXEDOUT',
        name: 'Maxed Out Test Code',
        maxUses: 5,
        currentUses: 5,
        grantAmountMicros: 1000000,
        expiresAt: null,
        isActive: 1,
      });

      await expect(
        signupCodeService.validateCode('MAXEDOUT')
      ).rejects.toThrow(InvalidSignupCodeError);
    });

    it('allows code when currentUses is less than maxUses', async () => {
      await insertSignupCode({
        code: 'NEARLYFULL',
        name: 'Nearly Full Test Code',
        maxUses: 10,
        currentUses: 9,
        grantAmountMicros: 1000000,
        expiresAt: null,
        isActive: 1,
      });

      const result = await signupCodeService.validateCode('NEARLYFULL');

      expect(result.valid).toBe(true);
    });

    it('ignores maxUses when set to null (unlimited)', async () => {
      await insertSignupCode({
        code: 'UNLIMITED',
        name: 'Unlimited Test Code',
        maxUses: null,
        currentUses: 999,
        grantAmountMicros: 1000000,
        expiresAt: null,
        isActive: 1,
      });

      const result = await signupCodeService.validateCode('UNLIMITED');

      expect(result.valid).toBe(true);
    });

    it('throws for code with whitespace that does not match', async () => {
      await insertSignupCode({
        code: 'TRIMMED',
        name: 'Trimmed Test Code',
        maxUses: null,
        currentUses: 0,
        grantAmountMicros: 1000000,
        expiresAt: null,
        isActive: 1,
      });

      await expect(
        signupCodeService.validateCode('  TRIMMED  ')
      ).rejects.toThrow(InvalidSignupCodeError);
    });
  });

  describe('redeemCode', () => {
    it('grants credits to user wallet', async () => {
      const now = Date.now();
      await insertSignupCode({
        code: 'WELCOME',
        name: 'Welcome Bonus',
        maxUses: 100,
        currentUses: 0,
        grantAmountMicros: 5000000,
        expiresAt: now + 86400000,
        isActive: 1,
      });

      const { newBalance } = await signupCodeService.redeemCode(
        'WELCOME',
        TEST_USER.id,
        walletService
      );

      expect(newBalance).toBe(5000000);

      // Verify wallet was created and credited
      const balance = await walletService.getBalance(TEST_USER.id);
      expect(balance).toBe(5000000);
    });

    it('increments current uses count after redemption', async () => {
      await insertSignupCode({
        code: 'BONUS',
        name: 'Bonus Code',
        maxUses: 10,
        currentUses: 5,
        grantAmountMicros: 2000000,
        expiresAt: null,
        isActive: 1,
      });

      await signupCodeService.redeemCode('BONUS', TEST_USER.id, walletService);

      const code = await env.DB
        .prepare('SELECT current_uses FROM signup_codes WHERE code = ?')
        .bind('BONUS')
        .first();

      expect(code?.current_uses).toBe(6);
    });

    it('records redemption in signup_code_redemptions table', async () => {
      await insertSignupCode({
        code: 'RECORDTEST',
        name: 'Record Test Code',
        maxUses: null,
        currentUses: 0,
        grantAmountMicros: 3000000,
        expiresAt: null,
        isActive: 1,
      });

      await signupCodeService.redeemCode('RECORDTEST', TEST_USER.id, walletService);

      const redemption = await env.DB
        .prepare('SELECT * FROM signup_code_redemptions WHERE user_id = ?')
        .bind(TEST_USER.id)
        .first();

      expect(redemption).not.toBeNull();
      expect(redemption?.code).toBe('RECORDTEST');
      expect(redemption?.grant_amount_micros).toBe(3000000);
      expect(redemption?.created_at).toBeGreaterThan(0);
    });

    it('throws if user has already redeemed a signup code', async () => {
      await insertSignupCode({
        code: 'FIRSTCODE',
        name: 'First Code',
        maxUses: null,
        currentUses: 0,
        grantAmountMicros: 1000000,
        expiresAt: null,
        isActive: 1,
      });

      // First redemption succeeds
      await signupCodeService.redeemCode('FIRSTCODE', TEST_USER.id, walletService);

      // Second redemption with same user throws
      await expect(
        signupCodeService.redeemCode('FIRSTCODE', TEST_USER.id, walletService)
      ).rejects.toThrow(InvalidSignupCodeError);
    });

    it('allows different users to redeem the same code', async () => {
      await insertSignupCode({
        code: 'SHARED',
        name: 'Shared Code',
        maxUses: 10,
        currentUses: 0,
        grantAmountMicros: 1000000,
        expiresAt: null,
        isActive: 1,
      });

      await signupCodeService.redeemCode('SHARED', TEST_USER.id, walletService);
      await signupCodeService.redeemCode('SHARED', TEST_USER_2.id, walletService);

      const code = await env.DB
        .prepare('SELECT current_uses FROM signup_codes WHERE code = ?')
        .bind('SHARED')
        .first();

      expect(code?.current_uses).toBe(2);

      const balance1 = await walletService.getBalance(TEST_USER.id);
      const balance2 = await walletService.getBalance(TEST_USER_2.id);
      expect(balance1).toBe(1000000);
      expect(balance2).toBe(1000000);
    });

    it('respects max uses limit during redemption', async () => {
      await insertSignupCode({
        code: 'LIMITED',
        name: 'Limited Code',
        maxUses: 2,
        currentUses: 2,
        grantAmountMicros: 1000000,
        expiresAt: null,
        isActive: 1,
      });

      await expect(
        signupCodeService.redeemCode('LIMITED', TEST_USER.id, walletService)
      ).rejects.toThrow(InvalidSignupCodeError);
    });

    it('throws for expired code during redemption', async () => {
      const pastExpiry = Date.now() - 86400000;
      await insertSignupCode({
        code: 'EXPIREDREDEEM',
        name: 'Expired Redeem Test',
        maxUses: null,
        currentUses: 0,
        grantAmountMicros: 1000000,
        expiresAt: pastExpiry,
        isActive: 1,
      });

      await expect(
        signupCodeService.redeemCode('EXPIREDREDEEM', TEST_USER.id, walletService)
      ).rejects.toThrow(InvalidSignupCodeError);
    });

    it('throws for inactive code during redemption', async () => {
      await insertSignupCode({
        code: 'INACTIVEREDEEM',
        name: 'Inactive Redeem Test',
        maxUses: null,
        currentUses: 0,
        grantAmountMicros: 1000000,
        expiresAt: null,
        isActive: 0,
      });

      await expect(
        signupCodeService.redeemCode('INACTIVEREDEEM', TEST_USER.id, walletService)
      ).rejects.toThrow(InvalidSignupCodeError);
    });
  });
});

// Helper function to insert a signup code for testing
async function insertSignupCode(params: {
  code: string;
  name: string;
  maxUses: number | null;
  currentUses: number;
  grantAmountMicros: number;
  expiresAt: number | null;
  isActive: number;
}): Promise<void> {
  const now = Date.now();
  const id = `code-${params.code.toLowerCase()}`;
  
  await env.DB.prepare(`
    INSERT INTO signup_codes 
    (id, code, name, max_uses, current_uses, grant_amount_micros, expires_at, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    params.code.toUpperCase(),
    params.name,
    params.maxUses,
    params.currentUses,
    params.grantAmountMicros,
    params.expiresAt,
    params.isActive,
    now,
    now
  ).run();
}
