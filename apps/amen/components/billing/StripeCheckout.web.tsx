import {
	Elements,
	PaymentElement,
	useElements,
	useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { env } from "@/lib/config/env";
import { trpc } from "@/lib/trpc/client";

// Initialize Stripe outside component to avoid recreating stripe object on render
const stripePromise = env.stripePublishableKey
	? loadStripe(env.stripePublishableKey)
	: null;

interface StripeCheckoutProps {
	priceId?: string;
	priceDisplay?: string;
	onSuccess: () => void;
	onError: (error: string) => void;
}

function CheckoutForm({
	onSuccess,
	onError,
	priceDisplay,
}: StripeCheckoutProps) {
	const stripe = useStripe();
	const elements = useElements();
	const [isProcessing, setIsProcessing] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const handleSubmit = async () => {
		if (!stripe || !elements) {
			return;
		}

		setIsProcessing(true);
		setErrorMessage(null);

		try {
			const { error } = await stripe.confirmPayment({
				elements,
				confirmParams: {
					// Return to the current page after payment
					return_url: window.location.href,
				},
				redirect: "if_required",
			});

			if (error) {
				setErrorMessage(error.message ?? "An unknown error occurred");
				onError(error.message ?? "Payment failed");
			} else {
				onSuccess();
			}
		} catch (e) {
			const msg = e instanceof Error ? e.message : "Payment failed";
			setErrorMessage(msg);
			onError(msg);
		} finally {
			setIsProcessing(false);
		}
	};

	return (
		<View className="w-full">
			<View className="bg-theme-surface border border-theme-border rounded-xl p-4 mb-4">
				<PaymentElement />
			</View>

			{errorMessage && (
				<View className="bg-theme-error/30 p-4 rounded-xl border border-theme-error mb-4">
					<Text className="text-theme-error text-sm text-center">
						{errorMessage}
					</Text>
				</View>
			)}

			<Pressable
				onPress={handleSubmit}
				disabled={!stripe || isProcessing}
				className={`py-4 rounded-xl items-center ${
					!stripe || isProcessing
						? "bg-theme-surface-elevated"
						: "bg-theme-secondary active:bg-theme-secondary/90"
				}`}
			>
				{isProcessing ? (
					<ActivityIndicator size="small" color="#FDF8F0" />
				) : (
					<Text className="text-theme-text font-semibold text-lg">
						Subscribe — {priceDisplay || "$9.99/mo"}
					</Text>
				)}
			</Pressable>
		</View>
	);
}

export default function StripeCheckout(props: StripeCheckoutProps) {
	const [clientSecret, setClientSecret] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [initError, setInitError] = useState<string | null>(null);
	const onErrorRef = React.useRef(props.onError);
	onErrorRef.current = props.onError;

	useEffect(() => {
		if (!stripePromise) {
			setInitError("Stripe is not configured");
			setIsLoading(false);
			return;
		}

		let mounted = true;

		async function initPayment() {
			try {
				const result = await trpc.billing.createSubscriptionIntent.mutate({
					priceId: props.priceId,
				});
				if (mounted) {
					if (result.clientSecret) {
						setClientSecret(result.clientSecret);
					} else {
						setInitError("Failed to initialize payment");
						onErrorRef.current("Failed to initialize payment");
					}
				}
			} catch (e) {
				if (mounted) {
					const msg =
						e instanceof Error ? e.message : "Failed to load checkout";
					setInitError(msg);
					onErrorRef.current(msg);
				}
			} finally {
				if (mounted) {
					setIsLoading(false);
				}
			}
		}

		initPayment();

		return () => {
			mounted = false;
		};
	}, [props.priceId]);

	if (isLoading) {
		return (
			<View className="py-12 items-center justify-center">
				<ActivityIndicator size="large" color="#C9A84C" />
				<Text className="text-theme-text-secondary mt-4">
					Loading secure checkout...
				</Text>
			</View>
		);
	}

	if (initError || !clientSecret || !stripePromise) {
		return (
			<View className="bg-theme-error/30 p-4 rounded-xl border border-theme-error mb-6">
				<Text className="text-theme-error text-center">
					{initError || "Could not load checkout. Please try again."}
				</Text>
			</View>
		);
	}

	const appearance = {
		theme: "night" as const,
		variables: {
			colorPrimary: "#C9A84C",
			colorBackground: "#152A4D",
			colorText: "#FDF8F0",
			colorDanger: "#EF4444",
			fontFamily: "system-ui, sans-serif",
			borderRadius: "12px",
		},
	};

	return (
		<Elements stripe={stripePromise} options={{ clientSecret, appearance }}>
			<CheckoutForm {...props} />
		</Elements>
	);
}
