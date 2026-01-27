import { env } from 'cloudflare:test';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { WalletService, InsufficientBalanceError } from '../wallet-service';
import { initTestDatabase, TEST_USER, createTestUser } from '../../__fixtures__/test-utils';

describe('WalletService', () => {
  let walletService: WalletService;

  beforeAll(async () => {
    await initTestDatabase();
  });

  beforeEach(async () => {
    walletService = new WalletService(env.DB);
    // Clean up wallets and transactions between tests
    await env.DB.prepare('DELETE FROM credit_transactions').run();
    await env.DB.prepare('DELETE FROM user_wallets').run();
    await createTestUser();
  });

  describe('getOrCreateWallet', () => {
    it('creates wallet for new user', async () => {
      const newUserId = 'new-user-' + Date.now();
      const now = Date.now();
      await env.DB.prepare(
        'INSERT INTO users (id, email, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
      ).bind(newUserId, `${newUserId}@test.com`, 'New User', now, now).run();
      const wallet = await walletService.getOrCreateWallet(newUserId);

      expect(wallet).toBeDefined();
      expect(wallet.userId).toBe(newUserId);
      expect(wallet.balanceMicros).toBe(0);
      expect(wallet.lifetimeEarnedMicros).toBe(0);
      expect(wallet.lifetimeSpentMicros).toBe(0);
      expect(wallet.createdAt).toBeGreaterThan(0);
      expect(wallet.updatedAt).toBeGreaterThan(0);
    });

    it('returns existing wallet', async () => {
      const wallet1 = await walletService.getOrCreateWallet(TEST_USER.id);
      const wallet2 = await walletService.getOrCreateWallet(TEST_USER.id);

      expect(wallet1.userId).toBe(wallet2.userId);
      expect(wallet1.createdAt).toBe(wallet2.createdAt);
    });

    it('creates wallet with zero balance', async () => {
      const wallet = await walletService.getOrCreateWallet(TEST_USER.id);

      expect(wallet.balanceMicros).toBe(0);
    });
  });

  describe('getBalance', () => {
    it('returns 0 for new wallet', async () => {
      const newUserId = 'balance-test-user-' + Date.now();
      const now = Date.now();
      await env.DB.prepare(
        'INSERT INTO users (id, email, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
      ).bind(newUserId, `${newUserId}@test.com`, 'Test User', now, now).run();
      const balance = await walletService.getBalance(newUserId);

      expect(balance).toBe(0);
    });

    it('returns correct balance after credit', async () => {
      await walletService.getOrCreateWallet(TEST_USER.id);
      await walletService.credit({
        userId: TEST_USER.id,
        type: 'signup_code_grant',
        amountMicros: 1000000,
        description: 'Test credit',
      });

      const balance = await walletService.getBalance(TEST_USER.id);
      expect(balance).toBe(1000000);
    });
  });

  describe('credit', () => {
    it('adds to balance and creates transaction', async () => {
      await walletService.getOrCreateWallet(TEST_USER.id);

      const newBalance = await walletService.credit({
        userId: TEST_USER.id,
        type: 'signup_code_grant',
        amountMicros: 500000,
        description: 'Test credit',
      });

      expect(newBalance).toBe(500000);

      const balance = await walletService.getBalance(TEST_USER.id);
      expect(balance).toBe(500000);
    });

    it('accumulates multiple credits', async () => {
      await walletService.getOrCreateWallet(TEST_USER.id);

      await walletService.credit({
        userId: TEST_USER.id,
        type: 'signup_code_grant',
        amountMicros: 1000000,
        description: 'First credit',
      });

      await walletService.credit({
        userId: TEST_USER.id,
        type: 'promo_code_grant',
        amountMicros: 250000,
        description: 'Second credit',
      });

      const balance = await walletService.getBalance(TEST_USER.id);
      expect(balance).toBe(1250000);
    });

    it('updates lifetime earned', async () => {
      await walletService.getOrCreateWallet(TEST_USER.id);

      await walletService.credit({
        userId: TEST_USER.id,
        type: 'signup_code_grant',
        amountMicros: 1000000,
        description: 'Test credit',
      });

      const wallet = await walletService.getOrCreateWallet(TEST_USER.id);
      expect(wallet.lifetimeEarnedMicros).toBe(1000000);
    });

    it('throws error for non-positive amount', async () => {
      await walletService.getOrCreateWallet(TEST_USER.id);

      await expect(
        walletService.credit({
          userId: TEST_USER.id,
          type: 'signup_code_grant',
          amountMicros: 0,
          description: 'Zero credit',
        })
      ).rejects.toThrow('Credit amount must be positive');

      await expect(
        walletService.credit({
          userId: TEST_USER.id,
          type: 'signup_code_grant',
          amountMicros: -100,
          description: 'Negative credit',
        })
      ).rejects.toThrow('Credit amount must be positive');
    });

    it('handles idempotency key', async () => {
      await walletService.getOrCreateWallet(TEST_USER.id);
      const idempotencyKey = 'test-key-' + Date.now();

      const result1 = await walletService.credit({
        userId: TEST_USER.id,
        type: 'signup_code_grant',
        amountMicros: 1000000,
        description: 'Idempotent credit',
        idempotencyKey,
      });

      const result2 = await walletService.credit({
        userId: TEST_USER.id,
        type: 'signup_code_grant',
        amountMicros: 1000000,
        description: 'Idempotent credit',
        idempotencyKey,
      });

      // Should return same balance (idempotent)
      expect(result1).toBe(result2);
      expect(await walletService.getBalance(TEST_USER.id)).toBe(1000000);
    });
  });

  describe('debit', () => {
    it('subtracts from balance and creates transaction', async () => {
      await walletService.getOrCreateWallet(TEST_USER.id);

      // First credit some funds
      await walletService.credit({
        userId: TEST_USER.id,
        type: 'signup_code_grant',
        amountMicros: 1000000,
        description: 'Initial credit',
      });

      // Then debit
      const newBalance = await walletService.debit({
        userId: TEST_USER.id,
        type: 'generation_debit',
        amountMicros: -250000,
        description: 'Test debit',
      });

      expect(newBalance).toBe(750000);

      const balance = await walletService.getBalance(TEST_USER.id);
      expect(balance).toBe(750000);
    });

    it('throws InsufficientBalanceError when balance too low', async () => {
      await walletService.getOrCreateWallet(TEST_USER.id);

      // No credits, try to debit
      await expect(
        walletService.debit({
          userId: TEST_USER.id,
          type: 'generation_debit',
          amountMicros: -1000000,
          description: 'Test debit',
        })
      ).rejects.toThrow(InsufficientBalanceError);
    });

    it('throws error for non-negative amount', async () => {
      await walletService.getOrCreateWallet(TEST_USER.id);

      await expect(
        walletService.debit({
          userId: TEST_USER.id,
          type: 'generation_debit',
          amountMicros: 100,
          description: 'Positive debit',
        })
      ).rejects.toThrow('Debit amount must be negative');

      await expect(
        walletService.debit({
          userId: TEST_USER.id,
          type: 'generation_debit',
          amountMicros: 0,
          description: 'Zero debit',
        })
      ).rejects.toThrow('Debit amount must be negative');
    });

    it('updates lifetime spent', async () => {
      await walletService.getOrCreateWallet(TEST_USER.id);

      await walletService.credit({
        userId: TEST_USER.id,
        type: 'signup_code_grant',
        amountMicros: 1000000,
        description: 'Initial credit',
      });

      await walletService.debit({
        userId: TEST_USER.id,
        type: 'generation_debit',
        amountMicros: -250000,
        description: 'Test debit',
      });

      const wallet = await walletService.getOrCreateWallet(TEST_USER.id);
      expect(wallet.lifetimeSpentMicros).toBe(250000);
    });

    it('debits exact balance to zero', async () => {
      await walletService.getOrCreateWallet(TEST_USER.id);

      await walletService.credit({
        userId: TEST_USER.id,
        type: 'signup_code_grant',
        amountMicros: 1000000,
        description: 'Initial credit',
      });

      const newBalance = await walletService.debit({
        userId: TEST_USER.id,
        type: 'generation_debit',
        amountMicros: -1000000,
        description: 'Full debit',
      });

      expect(newBalance).toBe(0);
      expect(await walletService.getBalance(TEST_USER.id)).toBe(0);
    });
  });
});
