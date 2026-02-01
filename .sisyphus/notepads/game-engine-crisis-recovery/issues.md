
- Initial ESM/CJS resolution issues with `vite-tsconfig-paths` and `jsdom` in Vitest.
- `pnpm add -D <package> --filter app` did not work as expected, requiring `workdir: "app"` for installation.
- Some tests in `app` package are still failing, specifically `ScriptSandboxRuntimeSystem.test.ts` and `EntityManager.tags.test.ts`. These need further investigation.
