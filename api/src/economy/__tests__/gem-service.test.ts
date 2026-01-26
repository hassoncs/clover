import { env } from 'cloudflare:test';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { GemService, InsufficientGemsError } from '../gem-service';
import { initTestDatabase, TEST_USER, createTestUser } from '../../__fixtures__/test-utils';

describe('GemService', () => {
  let gemService: GemService;

  beforeAll(async () => {
    await initTestDatabase();
  });

  beforeEach(async () => {
    gemService = new GemService(env.DB);
    // Clean up transactions and wallets between tests
    await env.DB.prepare('DELETE FROM gem_transactions').run();
    await env.DB.prepare('DELETE FROM user_gems').run();
    await createTestUser();
  });

  describe('getOrCreateGemWallet', () => {
    it('creates wallet for new user', async () => {
      const newUserId = 'new-user-' + Date.now();
      const now = Date.now();
      await env.DB.prepare(
        'INSERT INTO users (id, email, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
      ).bind(newUserId, `${newUserId}@test.com`, 'New User', now, now).run();
      const wallet = await gemService.getOrCreateGemWallet(newUserId);

      expect(wallet).toBeDefined();
      expect(wallet.userId).toBe(newUserId);
      expect(wallet.balance).toBe(0);
      expect(wallet.lifetimeEarned).toBe(0);
      expect(wallet.lifetimeSpent).toBe(0);
      expect(wallet.createdAt).toBeGreaterThan(0);
      expect(wallet.updatedAt).toBeGreaterThan(0);
    });

    it('returns existing wallet', async () => {
      const wallet1 = await gemService.getOrCreateGemWallet(TEST_USER.id);
      const wallet2 = await gemService.getOrCreateGemWallet(TEST_USER.id);

      expect(wallet1.userId).toBe(wallet2.userId);
      expect(wallet1.createdAt).toBe(wallet2.createdAt);
    });

    it('creates wallet with zero balance', async () => {
      const wallet = await gemService.getOrCreateGemWallet(TEST_USER.id);

      expect(wallet.balance).toBe(0);
    });
  });

  describe('getBalance', () => {
    it('returns 0 for new wallet', async () => {
      const newUserId = 'balance-test-user-' + Date.now();
      const now = Date.now();
      await env.DB.prepare(
        'INSERT INTO users (id, email, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
      ).bind(newUserId, `${newUserId}@test.com`, 'Test User', now, now).run();
      const balance = await gemService.getBalance(newUserId);

      expect(balance).toBe(0);
    });

    it('returns correct balance after credit', async () => {
      await gemService.getOrCreateGemWallet(TEST_USER.id);
      await gemService.credit({
        userId: TEST_USER.id,
        type: 'signup_bonus',
        amount: 100,
        description: 'Test credit',
      });

      const balance = await gemService.getBalance(TEST_USER.id);
      expect(balance).toBe(100);
    });

    it('returns correct balance after multiple transactions', async () => {
      await gemService.getOrCreateGemWallet(TEST_USER.id);
      await gemService.credit({
        userId: TEST_USER.id,
        type: 'signup_bonus',
        amount: 50,
        description: 'First credit',
      });
      await gemService.credit({
        userId: TEST_USER.id,
        type: 'daily_login',
        amount: 25,
        description: 'Second credit',
      });

      const balance = await gemService.getBalance(TEST_USER.id);
      expect(balance).toBe(75);
    });
  });

  describe('credit', () => {
    it('adds to balance and creates transaction', async () => {
      await gemService.getOrCreateGemWallet(TEST_USER.id);

      const newBalance = await gemService.credit({
        userId: TEST_USER.id,
        type: 'signup_bonus',
        amount: 100,
        description: 'Test credit',
      });

      expect(newBalance).toBe(100);

      const balance = await gemService.getBalance(TEST_USER.id);
      expect(balance).toBe(100);
    });

    it('accumulates multiple credits', async () => {
      await gemService.getOrCreateGemWallet(TEST_USER.id);

      await gemService.credit({
        userId: TEST_USER.id,
        type: 'signup_bonus',
        amount: 100,
        description: 'First credit',
      });

      await gemService.credit({
        userId: TEST_USER.id,
        type: 'daily_login',
        amount: 50,
        description: 'Second credit',
      });

      const balance = await gemService.getBalance(TEST_USER.id);
      expect(balance).toBe(150);
    });

    it('updates lifetime earned', async () => {
      await gemService.getOrCreateGemWallet(TEST_USER.id);

      await gemService.credit({
        userId: TEST_USER.id,
        type: 'signup_bonus',
        amount: 100,
        description: 'Test credit',
      });

      const wallet = await gemService.getOrCreateGemWallet(TEST_USER.id);
      expect(wallet.lifetimeEarned).toBe(100);
    });

    it('throws error for non-positive amount', async () => {
      await gemService.getOrCreateGemWallet(TEST_USER.id);

      await expect(
        gemService.credit({
          userId: TEST_USER.id,
          type: 'signup_bonus',
          amount: 0,
          description: 'Zero credit',
        })
      ).rejects.toThrow('Credit amount must be positive');

      await expect(
        gemService.credit({
          userId: TEST_USER.id,
          type: 'signup_bonus',
          amount: -100,
          description: 'Negative credit',
        })
      ).rejects.toThrow('Credit amount must be positive');
    });

    it('handles idempotency key', async () => {
      await gemService.getOrCreateGemWallet(TEST_USER.id);
      const idempotencyKey = 'test-key-' + Date.now();

      const result1 = await gemService.credit({
        userId: TEST_USER.id,
        type: 'signup_bonus',
        amount: 100,
        description: 'Idempotent credit',
        idempotencyKey,
      });

      const result2 = await gemService.credit({
        userId: TEST_USER.id,
        type: 'signup_bonus',
        amount: 100,
        description: 'Idempotent credit',
        idempotencyKey,
      });

      // Should return same balance (idempotent)
      expect(result1).toBe(result2);
      expect(await gemService.getBalance(TEST_USER.id)).toBe(100);
    });
  });

  describe('debit', () => {
    it('subtracts from balance and creates transaction', async () => {
      await gemService.getOrCreateGemWallet(TEST_USER.id);

      // First credit some gems
      await gemService.credit({
        userId: TEST_USER.id,
        type: 'signup_bonus',
        amount: 100,
        description: 'Initial credit',
      });

      // Then debit
      const newBalance = await gemService.debit({
        userId: TEST_USER.id,
        type: 'purchase',
        amount: -30,
        description: 'Test debit',
      });

      expect(newBalance).toBe(70);

      const balance = await gemService.getBalance(TEST_USER.id);
      expect(balance).toBe(70);
    });

    it('throws InsufficientGemsError when balance too low', async () => {
      await gemService.getOrCreateGemWallet(TEST_USER.id);

      // No credits, try to debit
      await expect(
        gemService.debit({
          userId: TEST_USER.id,
          type: 'purchase',
          amount: -100,
          description: 'Test debit',
        })
      ).rejects.toThrow(InsufficientGemsError);
    });

    it('throws InsufficientGemsError when balance partially sufficient', async () => {
      await gemService.getOrCreateGemWallet(TEST_USER.id);

      await gemService.credit({
        userId: TEST_USER.id,
        type: 'signup_bonus',
        amount: 50,
        description: 'Initial credit',
      });

      // Try to debit more than available
      await expect(
        gemService.debit({
          userId: TEST_USER.id,
          type: 'purchase',
          amount: -100,
          description: 'Test debit',
        })
      ).rejects.toThrow(InsufficientGemsError);
    });

    it('throws error for non-negative amount', async () => {
      await gemService.getOrCreateGemWallet(TEST_USER.id);

      await expect(
        gemService.debit({
          userId: TEST_USER.id,
          type: 'purchase',
          amount: 100,
          description: 'Positive debit',
        })
      ).rejects.toThrow('Debit amount must be negative');

      await expect(
        gemService.debit({
          userId: TEST_USER.id,
          type: 'purchase',
          amount: 0,
          description: 'Zero debit',
        })
      ).rejects.toThrow('Debit amount must be negative');
    });

    it('updates lifetime spent', async () => {
      await gemService.getOrCreateGemWallet(TEST_USER.id);

      await gemService.credit({
        userId: TEST_USER.id,
        type: 'signup_bonus',
        amount: 100,
        description: 'Initial credit',
      });

      await gemService.debit({
        userId: TEST_USER.id,
        type: 'purchase',
        amount: -25,
        description: 'Test debit',
      });

      const wallet = await gemService.getOrCreateGemWallet(TEST_USER.id);
      expect(wallet.lifetimeSpent).toBe(25);
    });

    it('debits exact balance to zero', async () => {
      await gemService.getOrCreateGemWallet(TEST_USER.id);

      await gemService.credit({
        userId: TEST_USER.id,
        type: 'signup_bonus',
        amount: 100,
        description: 'Initial credit',
      });

      const newBalance = await gemService.debit({
        userId: TEST_USER.id,
        type: 'purchase',
        amount: -100,
        description: 'Full debit',
      });

      expect(newBalance).toBe(0);
      expect(await gemService.getBalance(TEST_USER.id)).toBe(0);
    });
  });

  describe('hasSufficientBalance', () => {
    it('returns true when balance is sufficient', async () => {
      await gemService.getOrCreateGemWallet(TEST_USER.id);

      await gemService.credit({
        userId: TEST_USER.id,
        type: 'signup_bonus',
        amount: 100,
        description: 'Test credit',
      });

      const hasFunds = await gemService.hasSufficientBalance(TEST_USER.id, 50);
      expect(hasFunds).toBe(true);
    });

    it('returns true when balance equals required amount', async () => {
      await gemService.getOrCreateGemWallet(TEST_USER.id);

      await gemService.credit({
        userId: TEST_USER.id,
        type: 'signup_bonus',
        amount: 100,
        description: 'Test credit',
      });

      const hasFunds = await gemService.hasSufficientBalance(TEST_USER.id, 100);
      expect(hasFunds).toBe(true);
    });

    it('returns false when balance is insufficient', async () => {
      await gemService.getOrCreateGemWallet(TEST_USER.id);

      await gemService.credit({
        userId: TEST_USER.id,
        type: 'signup_bonus',
        amount: 50,
        description: 'Test credit',
      });

      const hasFunds = await gemService.hasSufficientBalance(TEST_USER.id, 100);
      expect(hasFunds).toBe(false);
    });

    it('returns false for new user with no balance', async () => {
      const newUserId = 'new-user-no-balance-' + Date.now();
      const now = Date.now();
      await env.DB.prepare(
        'INSERT INTO users (id, email, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
      ).bind(newUserId, `${newUserId}@test.com`, 'Test User', now, now).run();
      const hasFunds = await gemService.hasSufficientBalance(newUserId, 1);
      expect(hasFunds).toBe(false);
    });
  });

  describe('getTransactionHistory', () => {
    it('returns empty array for new user', async () => {
      const newUserId = 'history-user-' + Date.now();
      const now = Date.now();
      await env.DB.prepare(
        'INSERT INTO users (id, email, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
      ).bind(newUserId, `${newUserId}@test.com`, 'Test User', now, now).run();
      await gemService.getOrCreateGemWallet(newUserId);

      const history = await gemService.getTransactionHistory(newUserId);
      expect(history).toEqual([]);
    });

    it('returns transaction history in descending order', async () => {
      await gemService.getOrCreateGemWallet(TEST_USER.id);

      await gemService.credit({
        userId: TEST_USER.id,
        type: 'signup_bonus',
        amount: 100,
        description: 'First credit',
      });

      await new Promise(resolve => setTimeout(resolve, 5));

      await gemService.credit({
        userId: TEST_USER.id,
        type: 'daily_login',
        amount: 50,
        description: 'Second credit',
      });

      const history = await gemService.getTransactionHistory(TEST_USER.id);

      expect(history).toHaveLength(2);
      expect(history[0].type).toBe('daily_login');
      expect(history[1].type).toBe('signup_bonus');
    });

    it('respects limit parameter', async () => {
      await gemService.getOrCreateGemWallet(TEST_USER.id);

      for (let i = 0; i < 5; i++) {
        await gemService.credit({
          userId: TEST_USER.id,
          type: 'daily_login',
          amount: 10,
          description: `Credit ${i}`,
        });
      }

      const history = await gemService.getTransactionHistory(TEST_USER.id, 3);
      expect(history).toHaveLength(3);
    });
  });
});
