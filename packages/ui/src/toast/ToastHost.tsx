import { Suspense, useEffect, useState } from "react";
import { View } from "react-native";
import type { ToasterProps } from "sonner-native";

const LazyToaster = () => {
	const [ToasterComponent, setToasterComponent] =
		useState<React.ComponentType<ToasterProps> | null>(null);

	useEffect(() => {
		import("sonner-native").then((module) => {
			setToasterComponent(() => module.Toaster);
		});
	}, []);

	if (!ToasterComponent) {
		return null;
	}

	return <ToasterComponent position="bottom-center" />;
};

interface ToastHostProps {
	subscribe: (listener: () => void) => () => void;
	isRequested: () => boolean;
}

export function ToastHost({ subscribe, isRequested }: ToastHostProps) {
	const [shouldRender, setShouldRender] = useState(isRequested());

	useEffect(() => {
		return subscribe(() => {
			setShouldRender(isRequested());
		});
	}, [subscribe, isRequested]);

	if (!shouldRender) {
		return null;
	}

	return (
		<Suspense fallback={<View />}>
			<LazyToaster />
		</Suspense>
	);
}
