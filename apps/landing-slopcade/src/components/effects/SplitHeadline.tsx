import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { type ReactNode, useEffect, useRef } from "react";
import SplitType from "split-type";

gsap.registerPlugin(ScrollTrigger);

export type SplitBy = "chars" | "words" | "lines";
export type AnimationType = "fadeUp" | "fadeIn" | "scaleIn";

export interface SplitHeadlineProps {
	/** Text content to animate (string or React node with text) */
	children: ReactNode;
	/** How to split the text */
	splitBy?: SplitBy;
	/** Animation preset */
	animation?: AnimationType;
	/** Stagger delay between elements (seconds) */
	stagger?: number;
	/** Animation duration (seconds) */
	duration?: number;
	/** Additional CSS classes */
	className?: string;
	/** Element to render as */
	as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span" | "div";
	/** ScrollTrigger start threshold */
	start?: string;
	/** Mark as important for accessibility (screen readers) */
	"aria-label"?: string;
}

// Animation presets
const animationPresets: Record<
	AnimationType,
	{ from: gsap.TweenVars; to: gsap.TweenVars }
> = {
	fadeUp: {
		from: { opacity: 0, y: 60 },
		to: { opacity: 1, y: 0 },
	},
	fadeIn: {
		from: { opacity: 0 },
		to: { opacity: 1 },
	},
	scaleIn: {
		from: { opacity: 0, scale: 0.5 },
		to: { opacity: 1, scale: 1 },
	},
};

/**
 * SplitHeadline - Character/word/line text reveal on scroll
 *
 * Splits text into animatable elements and reveals them with GSAP
 * when scrolling into view. Respects reduced motion preferences.
 *
 * @example
 * ```tsx
 * <SplitHeadline splitBy="chars" animation="fadeUp">
 *   Hello World
 * </SplitHeadline>
 * ```
 */
export function SplitHeadline({
	children,
	splitBy = "words",
	animation = "fadeUp",
	stagger = 0.02,
	duration = 0.8,
	className = "",
	as: Component = "h2",
	start = "top 85%",
	"aria-label": ariaLabel,
}: SplitHeadlineProps) {
	const containerRef = useRef<HTMLElement>(null);
	const splitRef = useRef<SplitType | null>(null);
	const scrollTriggerRef = useRef<ScrollTrigger | null>(null);
	const animationRef = useRef<gsap.core.Timeline | null>(null);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		// Check for reduced motion preference
		const prefersReducedMotion =
			typeof window !== "undefined" &&
			window.matchMedia("(prefers-reduced-motion: reduce)").matches;

		// If reduced motion, just show the text without animation
		if (prefersReducedMotion) {
			gsap.set(container, { visibility: "visible", opacity: 1 });
			return;
		}

		// Get the preset for this animation type
		const preset = animationPresets[animation];

		// Split the text
		// Using 'types' option matching the splitBy prop
		splitRef.current = new SplitType(container, {
			types: splitBy,
			tagName: "span",
		});

		// Get the split elements based on type
		const elements =
			splitRef.current[
				splitBy === "chars" ? "chars" : splitBy === "words" ? "words" : "lines"
			];

		if (!elements || elements.length === 0) {
			gsap.set(container, { visibility: "visible" });
			return;
		}

		// Set initial state (hidden)
		gsap.set(elements, {
			...preset.from,
			willChange: "transform, opacity",
		});

		// Make container visible after split
		gsap.set(container, { visibility: "visible" });

		// Create the timeline with ScrollTrigger
		const tl = gsap.timeline({
			scrollTrigger: {
				trigger: container,
				start,
				once: true, // Only animate once
				onEnter: () => {
					// Animation plays on enter
				},
			},
		});

		// Animate elements
		tl.to(elements, {
			...preset.to,
			duration,
			stagger,
			ease: "power3.out",
			onComplete: () => {
				// Clean up will-change for performance
				gsap.set(elements, { willChange: "auto" });
			},
		});

		animationRef.current = tl;
		scrollTriggerRef.current = tl.scrollTrigger as ScrollTrigger | null;

		// Cleanup
		return () => {
			// Kill animation
			if (animationRef.current) {
				animationRef.current.kill();
			}
			// Kill ScrollTrigger
			if (scrollTriggerRef.current) {
				scrollTriggerRef.current.kill();
			}
			// Revert split text
			if (splitRef.current) {
				splitRef.current.revert();
				splitRef.current = null;
			}
		};
	}, [splitBy, animation, stagger, duration, start]);

	// Extract text content for aria-label if not provided
	const textContent =
		typeof children === "string" ? children : ariaLabel || "Animated headline";

	return (
		<Component
			ref={containerRef as React.RefObject<HTMLHeadingElement>}
			className={`split-headline ${className}`}
			style={{ visibility: "hidden" }}
			aria-label={ariaLabel || textContent}
		>
			{children}
		</Component>
	);
}

export default SplitHeadline;
