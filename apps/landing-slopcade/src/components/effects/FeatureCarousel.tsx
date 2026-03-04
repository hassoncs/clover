import Autoplay from "embla-carousel-autoplay";
import useEmblaCarousel from "embla-carousel-react";
import {
	type ImgHTMLAttributes,
	type ReactNode,
	useCallback,
	useEffect,
	useState,
} from "react";

interface SlideImage {
	type: "image";
	src: string;
	alt: string;
	imgProps?: Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt">;
}

interface SlideCustom {
	type: "custom";
	content: ReactNode;
}

export type CarouselSlide = SlideImage | SlideCustom | ReactNode;

interface FeatureCarouselProps {
	/** Array of slides - can be SlideImage objects, SlideCustom objects, or raw React nodes */
	slides: CarouselSlide[];
	/** Enable autoplay (default: true) */
	autoplay?: boolean;
	/** Autoplay interval in milliseconds (default: 5000) */
	interval?: number;
	/** Additional CSS classes for the container */
	className?: string;
	/** Show navigation arrows (default: false) */
	showArrows?: boolean;
}

function isSlideImage(slide: CarouselSlide): slide is SlideImage {
	return (
		typeof slide === "object" &&
		slide !== null &&
		"type" in slide &&
		slide.type === "image"
	);
}

function isSlideCustom(slide: CarouselSlide): slide is SlideCustom {
	return (
		typeof slide === "object" &&
		slide !== null &&
		"type" in slide &&
		slide.type === "custom"
	);
}

export function FeatureCarousel({
	slides,
	autoplay: autoplayEnabled = true,
	interval = 5000,
	className = "",
	showArrows = false,
}: FeatureCarouselProps) {
	const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
	const shouldAutoplay = autoplayEnabled && !prefersReducedMotion;

	const [emblaRef, emblaApi] = useEmblaCarousel(
		{ loop: true, duration: prefersReducedMotion ? 0 : 20 },
		shouldAutoplay
			? [Autoplay({ delay: interval, stopOnInteraction: false })]
			: [],
	);

	const [selectedIndex, setSelectedIndex] = useState(0);
	const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

	const onSelect = useCallback(() => {
		if (!emblaApi) return;
		setSelectedIndex(emblaApi.selectedScrollSnap());
	}, [emblaApi]);

	const scrollTo = useCallback(
		(index: number) => emblaApi?.scrollTo(index),
		[emblaApi],
	);

	const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
	const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

	useEffect(() => {
		const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
		setPrefersReducedMotion(mediaQuery.matches);

		const handler = (e: MediaQueryListEvent) => {
			setPrefersReducedMotion(e.matches);
		};

		mediaQuery.addEventListener("change", handler);
		return () => mediaQuery.removeEventListener("change", handler);
	}, []);

	useEffect(() => {
		if (!emblaApi) return;
		setScrollSnaps(emblaApi.scrollSnapList());
		onSelect();
		emblaApi.on("select", onSelect);
		emblaApi.on("reInit", onSelect);
		return () => {
			emblaApi.off("select", onSelect);
			emblaApi.off("reInit", onSelect);
		};
	}, [emblaApi, onSelect]);

	const renderSlide = (slide: CarouselSlide, index: number): ReactNode => {
		if (isSlideImage(slide)) {
			return (
				<img
					key={index}
					src={slide.src}
					alt={slide.alt}
					loading="lazy"
					className="h-full w-full object-cover"
					{...slide.imgProps}
				/>
			);
		}

		if (isSlideCustom(slide)) {
			return <div key={index}>{slide.content}</div>;
		}

		return <div key={index}>{slide}</div>;
	};

	return (
		<div className={`relative w-full ${className}`}>
			<div className="overflow-hidden" ref={emblaRef}>
				<div className="flex">
					{slides.map((slide, index) => (
						<div
							key={index}
							className="flex-[0_0_100%] min-w-0"
							role="group"
							aria-roledescription="slide"
							aria-label={`Slide ${index + 1} of ${slides.length}`}
						>
							{renderSlide(slide, index)}
						</div>
					))}
				</div>
			</div>

			{/* Navigation Arrows */}
			{showArrows && (
				<>
					<button
						onClick={scrollPrev}
						className="absolute left-4 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white/80 hover:bg-white/20 hover:text-white transition-colors"
						aria-label="Previous slide"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="24"
							height="24"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<polyline points="15 18 9 12 15 6" />
						</svg>
					</button>
					<button
						onClick={scrollNext}
						className="absolute right-4 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white/80 hover:bg-white/20 hover:text-white transition-colors"
						aria-label="Next slide"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="24"
							height="24"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<polyline points="9 18 15 12 9 6" />
						</svg>
					</button>
				</>
			)}

			{/* Dot Indicators */}
			<div className="flex justify-center gap-2 mt-4">
				{scrollSnaps.map((_, index) => (
					<button
						key={index}
						onClick={() => scrollTo(index)}
						className={`h-2 rounded-full transition-all duration-300 ${
							index === selectedIndex
								? "w-6 bg-[#4F46E5]"
								: "w-2 bg-white/30 hover:bg-white/50"
						}`}
						aria-label={`Go to slide ${index + 1}`}
						aria-current={index === selectedIndex ? "true" : undefined}
					/>
				))}
			</div>
		</div>
	);
}
