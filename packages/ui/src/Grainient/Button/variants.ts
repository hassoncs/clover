import { cva } from "class-variance-authority";

export const buttonVariants = cva(
	"flex-row items-center justify-center font-medium transition-all active:scale-95 disabled:pointer-events-none disabled:opacity-50",
	{
		variants: {
			variant: {
				grainient: "overflow-hidden border-0 shadow-lg shadow-purple-500/20",
				glass:
					"border border-white/10 bg-white/5 backdrop-blur-md shadow-md shadow-black/10",
				solid: "bg-zinc-900 border border-zinc-800 shadow-sm",
				outline:
					"border border-zinc-700 bg-transparent hover:bg-zinc-800/50 active:bg-zinc-800/50",
				ghost: "bg-transparent hover:bg-zinc-800/30 active:bg-zinc-800/30",
			},
			size: {
				sm: "h-8 px-3 rounded-md text-xs",
				md: "h-10 px-4 rounded-lg text-sm",
				lg: "h-12 px-6 rounded-xl text-base",
			},
		},
		defaultVariants: {
			variant: "grainient",
			size: "md",
		},
	},
);

export const buttonTextVariants = cva("font-medium text-center", {
	variants: {
		variant: {
			grainient: "text-white font-bold tracking-wide",
			glass: "text-white/90",
			solid: "text-zinc-100",
			outline: "text-zinc-300 group-hover:text-white",
			ghost: "text-zinc-400 group-hover:text-zinc-200",
		},
		size: {
			sm: "text-xs",
			md: "text-sm",
			lg: "text-base",
		},
	},
	defaultVariants: {
		variant: "grainient",
		size: "md",
	},
});
