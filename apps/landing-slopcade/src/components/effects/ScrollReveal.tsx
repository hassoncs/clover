import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { type ReactNode, useEffect, useRef } from "react";

gsap.registerPlugin(ScrollTrigger);

interface ScrollRevealProps {
	children: ReactNode;
	/** Delay before animation starts (seconds) */
	delay?: number;
	/** Animation duration (seconds) */
	duration?: number;
	/** Stagger between children (seconds) */
	stagger?: number;
	/** Vertical slide distance (pixels) */
	y?: number;
	/** Additional CSS classes */
	className?: string;
}

export function ScrollReveal({
	children,
	delay = 0,
	duration = 0.6,
	stagger = 0.1,
	y = 30,
	className = "",
}: ScrollRevealProps) {
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		// Skip animation for reduced motion preference
		const prefersReducedMotion = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		).matches;

		if (prefersReducedMotion || !containerRef.current) {
			return;
		}

		const ctx = gsap.context(() => {
			const targets = containerRef.current!.children;

			gsap.from(targets, {
				opacity: 0,
				y,
				duration,
				delay,
				stagger,
				ease: "power3.out",
				scrollTrigger: {
					trigger: containerRef.current,
					start: "top 85%",
					once: true,
				},
			});
		});

		return () => ctx.revert();
	}, [delay, duration, stagger, y]);

	return (
		<div ref={containerRef} className={className}>
			{children}
		</div>
	);
}
