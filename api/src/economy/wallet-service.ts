import { nanoid } from 'nanoid';

export type TransactionType =
  | 'signup_code_grant'
  | 'promo_code_grant'
  | 'purchase'
  | 'generation_debit'
  | 'generation_refund'
  | 'admin_adjustment';

export interface TransactionParams {
  userId: string;
  type: TransactionType;
  amountMicros: number;
  referenceType?: string;
  referenceId?: string;
  idempotencyKey?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface Wallet {
  userId: string;
  balanceMicros: number;
  lifetimeEarnedMicros: number;
  lifetimeSpentMicros: number;
  lastDailyClaimAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface CreditTransaction {
  id: string;
  userId: string;
  type: TransactionType;
  amountMicros: number;
  balanceBeforeMicros: number;
  balanceAfterMicros: number;
  referenceType: string | null;
  referenceId: string | null;
  idempotencyKey: string | null;
  description: string | null;
  metadataJson: string | null;
  createdAt: number;
}

export class InsufficientBalanceError extends Error {
  constructor(
    public userId: string,
    public requiredMicros: number,
    public availableMicros: number
  ) {
    super(`Insufficient balance: required ${requiredMicros}, available ${availableMicros}`);
    this.name = 'InsufficientBalanceError';
  }
}

export class WalletService {
  constructor(private db: D1Database) {}

  /**
   * Get or create wallet for user
   * NOTE: New wallets start with ZERO balance
   * Credits are granted via signup code redemption, NOT automatically
   */
  async getOrCreateWallet(userId: string): Promise<Wallet> {
    const now = Date.now();
    
    // Try to get existing wallet
    const existing = await this.db
      .prepare('SELECT * FROM user_wallets WHERE user_id = ?')
      .bind(userId)
      .first<any>();
    
    if (existing) {
      return {
        userId: existing.user_id,
        balanceMicros: existing.balance_micros,
        lifetimeEarnedMicros: existing.lifetime_earned_micros,
        lifetimeSpentMicros: existing.lifetime_spent_micros,
        lastDailyClaimAt: existing.last_daily_claim_at,
        createdAt: existing.created_at,
        updatedAt: existing.updated_at,
      };
    }
    
    // Create new wallet with ZERO balance (credits come from signup code)
    await this.db.prepare(`
      INSERT INTO user_wallets (user_id, balance_micros, lifetime_earned_micros, lifetime_spent_micros, created_at, updated_at)
      VALUES (?, 0, 0, 0, ?, ?)
    `).bind(userId, now, now).run();
    
    return {
      userId,
      balanceMicros: 0,
      lifetimeEarnedMicros: 0,
      lifetimeSpentMicros: 0,
      lastDailyClaimAt: null,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Get current balance
   */
  async getBalance(userId: string): Promise<number> {
    const wallet = await this.getOrCreateWallet(userId);
    return wallet.balanceMicros;
  }

  /**
   * Check if user has sufficient balance for an operation
   */
  async hasSufficientBalance(userId: string, requiredMicros: number): Promise<boolean> {
    const balance = await this.getBalance(userId);
    return balance >= requiredMicros;
  }

  /**
   * Credit user's wallet (add funds)
   * Returns the new balance
   */
  async credit(params: TransactionParams): Promise<number> {
    if (params.amountMicros <= 0) {
      throw new Error('Credit amount must be positive');
    }
    return this.executeTransaction(params);
  }

  /**
   * Debit user's wallet (subtract funds)
   * Throws if insufficient balance
   * Returns the new balance
   */
  async debit(params: TransactionParams): Promise<number> {
    if (params.amountMicros >= 0) {
      throw new Error('Debit amount must be negative');
    }
    
    // Pre-check balance (defense in depth, actual check is in transaction)
    const hasFunds = await this.hasSufficientBalance(params.userId, Math.abs(params.amountMicros));
    if (!hasFunds) {
      throw new InsufficientBalanceError(
        params.userId,
        Math.abs(params.amountMicros),
        await this.getBalance(params.userId)
      );
    }
    
    return this.executeTransaction(params);
  }

  /**
   * Execute a transaction atomically
   */
  private async executeTransaction(params: TransactionParams): Promise<number> {
    const { userId, type, amountMicros, referenceType, referenceId, idempotencyKey, description, metadata } = params;
    const now = Date.now();
    const txId = nanoid();
    
    // Check idempotency
    if (idempotencyKey) {
      const existing = await this.db
        .prepare('SELECT id FROM credit_transactions WHERE idempotency_key = ?')
        .bind(idempotencyKey)
        .first();
      
      if (existing) {
        // Already processed, return current balance
        return this.getBalance(userId);
      }
    }
    
    // Get current wallet state
    const wallet = await this.getOrCreateWallet(userId);
    const balanceBefore = wallet.balanceMicros;
    const balanceAfter = balanceBefore + amountMicros;
    
    // Validate balance won't go negative
    if (balanceAfter < 0) {
      throw new InsufficientBalanceError(userId, Math.abs(amountMicros), balanceBefore);
    }
    
    // Calculate lifetime updates
    const lifetimeEarnedDelta = amountMicros > 0 ? amountMicros : 0;
    const lifetimeSpentDelta = amountMicros < 0 ? Math.abs(amountMicros) : 0;
    
    // Execute atomic update
    await this.db.batch([
      // Update wallet balance
      this.db.prepare(`
        UPDATE user_wallets 
        SET balance_micros = balance_micros + ?,
            lifetime_earned_micros = lifetime_earned_micros + ?,
            lifetime_spent_micros = lifetime_spent_micros + ?,
            updated_at = ?
        WHERE user_id = ? AND balance_micros + ? >= 0
      `).bind(amountMicros, lifetimeEarnedDelta, lifetimeSpentDelta, now, userId, amountMicros),
      
      // Insert transaction record
      this.db.prepare(`
        INSERT INTO credit_transactions 
        (id, user_id, type, amount_micros, balance_before_micros, balance_after_micros, 
         reference_type, reference_id, idempotency_key, description, metadata_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        txId, userId, type, amountMicros, balanceBefore, balanceAfter,
        referenceType ?? null,
        referenceId ?? null,
        idempotencyKey ?? null,
        description ?? null,
        metadata ? JSON.stringify(metadata) : null,
        now
      ),
    ]);
    
    return balanceAfter;
  }

  // Daily bonus DISABLED for launch
  // async claimDailyBonus() { ... }

  /**
    * Get transaction history
    */
  async getTransactionHistory(userId: string, limit = 50, offset = 0): Promise<CreditTransaction[]> {
    const results = await this.db
      .prepare(`
        SELECT * FROM credit_transactions 
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
      amountMicros: row.amount_micros,
      balanceBeforeMicros: row.balance_before_micros,
      balanceAfterMicros: row.balance_after_micros,
      referenceType: row.reference_type,
      referenceId: row.reference_id,
      idempotencyKey: row.idempotency_key,
      description: row.description,
      metadataJson: row.metadata_json,
      createdAt: row.created_at,
    }));
  }

  /**
   * Check rate limit for an action
   */
  async checkRateLimit(userId: string, actionType: string, limit: number, windowMs: number): Promise<boolean> {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Get or create rate limit record
    const record = await this.db
      .prepare('SELECT * FROM rate_limits WHERE user_id = ? AND action_type = ?')
      .bind(userId, actionType)
      .first<{ userId: string; actionType: string; windowStart: number; count: number }>();
    
    if (!record || record.windowStart < windowStart) {
      // New window, reset count
      await this.db.prepare(`
        INSERT OR REPLACE INTO rate_limits (user_id, action_type, window_start, count)
        VALUES (?, ?, ?, 1)
      `).bind(userId, actionType, now).run();
      return true;
    }
    
    if (record.count >= limit) {
      return false; // Rate limited
    }
    
    // Increment count
    await this.db.prepare(`
      UPDATE rate_limits SET count = count + 1 WHERE user_id = ? AND action_type = ?
    `).bind(userId, actionType).run();
    
    return true;
  }
}
