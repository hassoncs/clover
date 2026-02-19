interface StripeCheckoutProps {
	priceId?: string;
	priceDisplay?: string;
	onSuccess: () => void;
	onError: (error: string) => void;
}

export function StripeCheckout(_props: StripeCheckoutProps) {
	return null;
}
