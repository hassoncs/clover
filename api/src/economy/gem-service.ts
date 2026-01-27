import { nanoid } from 'nanoid';

export type GemTransactionType =
  | 'signup_bonus'
  | 'daily_login'
  | 'game_played'
  | 'admin_adjustment'
  | 'purchase';

export interface GemTransactionParams {
  userId: string;
  type: GemTransactionType;
  amount: number;
  referenceType?: string;
  referenceId?: string;
  idempotencyKey?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface GemWallet {
  userId: string;
  balance: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
  createdAt: number;
  updatedAt: number;
}

export interface GemTransaction {
  id: string;
  userId: string;
  type: GemTransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  referenceType: string | null;
  referenceId: string | null;
  idempotencyKey: string | null;
  description: string | null;
  metadataJson: string | null;
  createdAt: number;
}

export class InsufficientGemsError extends Error {
  constructor(
    public userId: string,
    public requiredAmount: number,
    public availableAmount: number
  ) {
    super(`Insufficient gems: required ${requiredAmount}, available ${availableAmount}`);
    this.name = 'InsufficientGemsError';
  }
}

export class GemService {
  constructor(private db: D1Database) {}

  /**
   * Get or create gem wallet for user
   * NOTE: New wallets start with ZERO balance
   * Gems are granted via transactions (signup bonus, daily login, etc.)
   */
  async getOrCreateGemWallet(userId: string): Promise<GemWallet> {
    const now = Date.now();

    // Try to get existing wallet
    const existing = await this.db
      .prepare('SELECT * FROM user_gems WHERE user_id = ?')
      .bind(userId)
      .first<any>();

    if (existing) {
      return {
        userId: existing.user_id,
        balance: existing.balance,
        lifetimeEarned: existing.lifetime_earned,
        lifetimeSpent: existing.lifetime_spent,
        createdAt: existing.created_at,
        updatedAt: existing.updated_at,
      };
    }

    // Create new wallet with ZERO balance
    await this.db.prepare(`
      INSERT INTO user_gems (user_id, balance, lifetime_earned, lifetime_spent, created_at, updated_at)
      VALUES (?, 0, 0, 0, ?, ?)
    `).bind(userId, now, now).run();

    return {
      userId,
      balance: 0,
      lifetimeEarned: 0,
      lifetimeSpent: 0,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Get current gem balance
   */
  async getBalance(userId: string): Promise<number> {
    const wallet = await this.getOrCreateGemWallet(userId);
    return wallet.balance;
  }

  /**
   * Check if user has sufficient gems for an operation
   */
  async hasSufficientBalance(userId: string, requiredAmount: number): Promise<boolean> {
    const balance = await this.getBalance(userId);
    return balance >= requiredAmount;
  }

  /**
   * Credit user's gem wallet (add gems)
   * Returns the new balance
   */
  async credit(params: GemTransactionParams): Promise<number> {
    if (params.amount <= 0) {
      throw new Error('Credit amount must be positive');
    }
    return this.executeTransaction(params);
  }

  /**
   * Debit user's gem wallet (subtract gems)
   * Throws if insufficient balance
   * Returns the new balance
   */
  async debit(params: GemTransactionParams): Promise<number> {
    if (params.amount >= 0) {
      throw new Error('Debit amount must be negative');
    }

    // Pre-check balance (defense in depth, actual check is in transaction)
    const hasFunds = await this.hasSufficientBalance(params.userId, Math.abs(params.amount));
    if (!hasFunds) {
      throw new InsufficientGemsError(
        params.userId,
        Math.abs(params.amount),
        await this.getBalance(params.userId)
      );
    }

    return this.executeTransaction(params);
  }

  /**
   * Execute a transaction atomically
   */
  private async executeTransaction(params: GemTransactionParams): Promise<number> {
    const { userId, type, amount, referenceType, referenceId, idempotencyKey, description, metadata } = params;
    const now = Date.now();
    const txId = nanoid();

    // Check idempotency
    if (idempotencyKey) {
      const existing = await this.db
        .prepare('SELECT id FROM gem_transactions WHERE idempotency_key = ?')
        .bind(idempotencyKey)
        .first();

      if (existing) {
        // Already processed, return current balance
        return this.getBalance(userId);
      }
    }

    // Get current wallet state
    const wallet = await this.getOrCreateGemWallet(userId);
    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore + amount;

    // Validate balance won't go negative
    if (balanceAfter < 0) {
      throw new InsufficientGemsError(userId, Math.abs(amount), balanceBefore);
    }

    // Calculate lifetime updates
    const lifetimeEarnedDelta = amount > 0 ? amount : 0;
    const lifetimeSpentDelta = amount < 0 ? Math.abs(amount) : 0;

    // Execute atomic update
    await this.db.batch([
      // Update wallet balance
      this.db.prepare(`
        UPDATE user_gems 
        SET balance = balance + ?,
            lifetime_earned = lifetime_earned + ?,
            lifetime_spent = lifetime_spent + ?,
            updated_at = ?
        WHERE user_id = ? AND balance + ? >= 0
      `).bind(amount, lifetimeEarnedDelta, lifetimeSpentDelta, now, userId, amount),

      // Insert transaction record
      this.db.prepare(`
        INSERT INTO gem_transactions 
        (id, user_id, type, amount, balance_before, balance_after, 
         reference_type, reference_id, idempotency_key, description, metadata_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        txId, userId, type, amount, balanceBefore, balanceAfter,
        referenceType ?? null, referenceId ?? null, idempotencyKey ?? null,
        description ?? null, metadata ? JSON.stringify(metadata) : null, now
      ),
    ]);

    return balanceAfter;
  }

  /**
    * Get transaction history
    */
  async getTransactionHistory(userId: string, limit = 50, offset = 0): Promise<GemTransaction[]> {
    const results = await this.db
      .prepare(`
        SELECT * FROM gem_transactions 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
      `)
      .bind(userId, limit, offset)
      .all<any>();

    return (results.results ?? []).map(row => ({
      id: row.id,
      userId: row.user_id,
      type: row.type,
      amount: row.amount,
      balanceBefore: row.balance_before,
      balanceAfter: row.balance_after,
      referenceType: row.reference_type,
      referenceId: row.reference_id,
      idempotencyKey: row.idempotency_key,
      description: row.description,
      metadataJson: row.metadata_json,
      createdAt: row.created_at,
    }));
  }
}
