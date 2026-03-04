import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { type LenisRef, ReactLenis } from "lenis/react";
import { useEffect, useRef } from "react";

gsap.registerPlugin(ScrollTrigger);

/**
 * ScrollDirector - Lenis smooth scroll with GSAP ScrollTrigger integration
 *
 * Initialize this component once at the root of your Astro page.
 * Use client:visible for optimal hydration.
 *
 * @example
 * ```astro
 * <ScrollDirector client:visible />
 * ```
 */
export function ScrollDirector() {
	const lenisRef = useRef<LenisRef>(null);

	useEffect(() => {
		// SSR guard - don't run on server
		if (typeof window === "undefined") return;

		// Respect user's motion preferences
		const prefersReducedMotion = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		).matches;

		if (prefersReducedMotion) {
			// Skip smooth scroll for users who prefer reduced motion
			return;
		}

		const lenis = lenisRef.current?.lenis;
		if (!lenis) return;

		// Sync Lenis scroll with ScrollTrigger
		lenis.on("scroll", ScrollTrigger.update);

		// Add Lenis raf to GSAP ticker for smooth animation loop
		const update = (time: number) => {
			lenis.raf(time * 1000);
		};

		gsap.ticker.add(update);

		// Disable lag smoothing for immediate scroll responsiveness
		gsap.ticker.lagSmoothing(0);

		// Cleanup on unmount
		return () => {
			gsap.ticker.remove(update);
			lenis.off("scroll", ScrollTrigger.update);
		};
	}, []);

	return (
		<ReactLenis
			root
			ref={lenisRef}
			options={{
				autoRaf: false, // GSAP drives the animation loop
				lerp: 0.1, // Linear interpolation (0-1), lower = smoother/slower
				duration: 1.2, // Scroll duration
				smoothWheel: true, // Smooth wheel scrolling
				touchMultiplier: 2, // Touch scroll sensitivity
			}}
		/>
	);
}

export default ScrollDirector;
