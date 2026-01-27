import { Hono } from 'hono';
import { createHmac } from 'crypto';
import { nanoid } from 'nanoid';
import { WalletService } from '../../economy/wallet-service';
import type { Env } from '../../trpc/context';

const router = new Hono<{ Bindings: Env }>();

interface RevenueCatWebhookPayload {
  event: {
    type: string;
    app_user_id?: string;
    product_id?: string;
    price_in_purchased_currency?: number;
    currency?: string;
    transaction_id?: string;
    subscriber_attributes?: {
      $userId?: { value: string };
      [key: string]: any;
    };
  };
}

function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  if (!secret) {
    console.warn('REVENUECAT_WEBHOOK_SECRET not configured - accepting all webhooks');
    return true;
  }

  try {
    const hmac = createHmac('sha256', secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');
    return signature === expectedSignature;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

function extractUserId(payload: RevenueCatWebhookPayload): string | null {
  if (payload.event.subscriber_attributes?.$userId?.value) {
    return payload.event.subscriber_attributes.$userId.value;
  }
  if (payload.event.app_user_id) {
    return payload.event.app_user_id;
  }
  return null;
}

router.post('/', async (c) => {
  try {
    const rawBody = await c.req.text();
    const signature = c.req.header('x-revenuecat-signature') || '';
    const secret = c.env.REVENUECAT_WEBHOOK_SECRET || '';

    // SECURITY: Reject requests with invalid signatures when secret is configured
    if (!verifyWebhookSignature(rawBody, signature, secret)) {
      console.error('Invalid webhook signature - rejecting request');
      return c.json({ error: 'Invalid signature' }, 401);
    }

    let payload: RevenueCatWebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch (error) {
      console.error('Failed to parse webhook payload:', error);
      return c.json({ error: 'Invalid JSON' }, 400);
    }

    const eventType = payload.event?.type;
    const userId = extractUserId(payload);

    console.log(`[RevenueCat Webhook] Event: ${eventType}, User: ${userId}`);

    if (eventType === 'INITIAL_PURCHASE' || eventType === 'RENEWAL') {
      if (!userId) {
        console.error('No user ID found in webhook payload');
        return c.json({ success: true });
      }

      const productId = payload.event.product_id;
      const transactionId = payload.event.transaction_id;

      if (!productId || !transactionId) {
        console.error('Missing product_id or transaction_id in webhook');
        return c.json({ success: true });
      }

      try {
        const product = await c.env.DB
          .prepare('SELECT * FROM iap_products WHERE sku = ?')
          .bind(productId)
          .first<{
            id: string;
            sku: string;
            name: string;
            creditAmountMicros: number;
            priceCents: number;
          }>();

        if (!product) {
          console.warn(`Product not found: ${productId}`);
          return c.json({ success: true });
        }

        const existing = await c.env.DB
          .prepare('SELECT id FROM iap_purchases WHERE revenuecat_transaction_id = ?')
          .bind(transactionId)
          .first();

        if (existing) {
          console.log(`Purchase already processed: ${transactionId}`);
          return c.json({ success: true, alreadyProcessed: true });
        }

        const purchaseId = nanoid();
        const now = Date.now();

        await c.env.DB.batch([
          c.env.DB.prepare(`
            INSERT INTO iap_purchases 
            (id, user_id, product_id, platform, revenuecat_transaction_id, 
             price_cents, credits_granted_micros, status, purchased_at, processed_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?)
          `).bind(
            purchaseId,
            userId,
            product.id,
            'ios',
            transactionId,
            product.priceCents,
            product.creditAmountMicros,
            now,
            now
          ),
        ]);

        const walletService = new WalletService(c.env.DB);
        const newBalance = await walletService.credit({
          userId,
          type: 'purchase',
          amountMicros: product.creditAmountMicros,
          referenceType: 'iap_purchase',
          referenceId: purchaseId,
          idempotencyKey: `purchase_${transactionId}`,
          description: `Purchased ${product.name}`,
          metadata: {
            productId: product.id,
            sku: product.sku,
            revenuecatTransactionId: transactionId,
          },
        });

        console.log(
          `[RevenueCat] Purchase processed: user=${userId}, product=${product.sku}, credits=${product.creditAmountMicros}, newBalance=${newBalance}`
        );

        return c.json({
          success: true,
          purchaseId,
          newBalance,
          creditsGranted: product.creditAmountMicros,
        });
      } catch (error) {
        console.error('Error processing purchase:', error);
        return c.json({ success: false, error: String(error) }, 200);
      }
    }

    if (eventType === 'CANCELLATION' || eventType === 'EXPIRATION') {
      console.log(`[RevenueCat] ${eventType} event for user: ${userId}`);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return c.json({ success: false, error: String(error) }, 200);
  }
});

export default router;
