import { WalletService } from '@/economy/wallet-service';

type D1Database = import('@cloudflare/workers-types').D1Database;

export interface SettleMessageParams {
  userId: string;
  threadId: string;
  messageId: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costMicros: number;
}

export interface SettleMessageResult {
  settled: boolean;
  costMicros: number;
  newBalance: number;
}

export class AgentBillingService {
  constructor(
    private db: D1Database,
    private walletService: WalletService
  ) {}

  async settleMessage(params: SettleMessageParams): Promise<SettleMessageResult> {
    const {
      userId,
      threadId,
      messageId,
      provider,
      model,
      inputTokens,
      outputTokens,
      costMicros,
    } = params;

    if (costMicros < 0) {
      throw new Error('costMicros must be non-negative');
    }

    if (costMicros === 0) {
      return { settled: true, costMicros: 0, newBalance: await this.walletService.getBalance(userId) };
    }

    const idempotencyKey = `msg-settle:${messageId}`;

    const existingTx = await this.db
      .prepare('SELECT id FROM credit_transactions WHERE idempotency_key = ?')
      .bind(idempotencyKey)
      .first<{ id: string }>();

    if (existingTx) {
      const balance = await this.walletService.getBalance(userId);
      return { settled: true, costMicros, newBalance: balance };
    }

    const message = await this.db
      .prepare('SELECT id FROM messages WHERE id = ? AND thread_id = ?')
      .bind(messageId, threadId)
      .first<{ id: string }>();

    if (!message) {
      throw new Error(`Message ${messageId} not found in thread ${threadId}`);
    }

    const newBalance = await this.walletService.debit({
      userId,
      type: 'agent_message_settlement',
      amountMicros: -costMicros,
      referenceType: 'message',
      referenceId: messageId,
      idempotencyKey,
      description: `LLM usage: ${model}`,
      metadata: { threadId, messageId, provider, model, inputTokens, outputTokens },
    });

    await this.db
      .prepare(
        `UPDATE messages SET cost_micros = ?, input_tokens = ?, output_tokens = ?, model = ?
         WHERE id = ? AND thread_id = ?`
      )
      .bind(costMicros, inputTokens, outputTokens, model, messageId, threadId)
      .run();

    return { settled: true, costMicros, newBalance };
  }
}
