declare module "vitest" {
	type Matcher = {
		readonly not: Matcher;
		readonly [name: string]: (...args: readonly unknown[]) => unknown;
	};

	export const describe: (
		name: string,
		run: () => void | Promise<void>,
	) => void;
	export const it: (name: string, run: () => void | Promise<void>) => void;
	export const beforeEach: (run: () => void | Promise<void>) => void;
	export const afterEach: (run: () => void | Promise<void>) => void;
	export const expect: (value: unknown) => Matcher;
}
