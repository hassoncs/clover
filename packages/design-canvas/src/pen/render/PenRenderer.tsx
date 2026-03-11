import type React from "react";
import { lazy, Suspense } from "react";

export type { PenRendererProps } from "./PenRendererImpl";

import type { PenRendererProps } from "./PenRendererImpl";

const PenRendererImpl = lazy(() => import("./PenRendererImpl"));

function PenRenderer(props: PenRendererProps): React.ReactNode {
	return (
		<Suspense fallback={null}>
			<PenRendererImpl {...props} />
		</Suspense>
	);
}

export { PenRenderer };
export default PenRenderer;
