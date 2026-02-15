import Stripe from "stripe";

export class StripeService {
	private stripe: Stripe;

	constructor(stripeSecretKey: string) {
		this.stripe = new Stripe(stripeSecretKey);
	}

	async getOrCreateCustomer(userId: string, email: string): Promise<string> {
		const existingCustomers = await this.stripe.customers.list({
			email,
			limit: 100,
		});

		const exactMatch = existingCustomers.data.find((customer) => {
			if (customer.deleted) {
				return false;
			}
			return customer.metadata.userId === userId;
		});

		if (exactMatch) {
			return exactMatch.id;
		}

		const firstActiveCustomer = existingCustomers.data.find(
			(customer) => !customer.deleted,
		);
		if (firstActiveCustomer) {
			return firstActiveCustomer.id;
		}

		const customer = await this.stripe.customers.create({
			email,
			metadata: {
				userId,
			},
		});

		return customer.id;
	}

	async createSubscription(
		customerId: string,
		priceId: string,
	): Promise<{ subscriptionId: string; clientSecret: string | null }> {
		const subscription = await this.stripe.subscriptions.create({
			customer: customerId,
			items: [{ price: priceId }],
			payment_behavior: "default_incomplete",
			expand: ["latest_invoice.payment_intent"],
		});

		let clientSecret: string | null = null;
		if (
			subscription.latest_invoice &&
			typeof subscription.latest_invoice !== "string"
		) {
			const invoice = subscription.latest_invoice as Stripe.Invoice & {
				payment_intent?: string | Stripe.PaymentIntent | null;
			};

			if (
				invoice.payment_intent &&
				typeof invoice.payment_intent !== "string"
			) {
				clientSecret = invoice.payment_intent.client_secret;
			}
		}

		return {
			subscriptionId: subscription.id,
			clientSecret,
		};
	}

	async createPortalSession(
		customerId: string,
		returnUrl: string,
	): Promise<string> {
		const session = await this.stripe.billingPortal.sessions.create({
			customer: customerId,
			return_url: returnUrl,
		});

		return session.url;
	}

	constructWebhookEvent(
		payload: string,
		signature: string,
		webhookSecret: string,
	): Stripe.Event {
		return this.stripe.webhooks.constructEvent(
			payload,
			signature,
			webhookSecret,
		);
	}
}
