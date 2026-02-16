interface StripeCheckoutProps {
	priceId?: string;
	priceDisplay?: string;
	onSuccess: () => void;
	onError: (error: string) => void;
}

export default function StripeCheckout(_props: StripeCheckoutProps) {
	return null;
}
