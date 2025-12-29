# CanvasKit WASM Deployment Template

Working template for deploying React Native Skia with CanvasKit WASM to Cloudflare Pages.

## Features

- React Native Skia with CanvasKit WASM
- NativeWind (Tailwind CSS for React Native)
- Cloudflare Pages deployment

## Quick Start

1. Use `<WithSkiaWeb />` for any lazy-loaded Skia components
2. Place Skia components outside the `app/` directory
3. Use Tailwind classes (`className`) for styling
4. Copy `canvaskit.wasm` to `public/` via postinstall script
5. Deploy with Wrangler

## Deployment

```bash
pnpm run deploy
```

🌐 **Production URL**: https://41827302.skia-canvas-wasm-deploy-test.pages.dev

## Documentation

- **[docs/WORKING_SOLUTION.md](./docs/WORKING_SOLUTION.md)** - Core Skia deployment guide
- **[docs/TEMPLATE_FEATURES.md](./docs/TEMPLATE_FEATURES.md)** - NativeWind features

## Key Files

| File | Purpose |
|------|---------|
| `app/index.tsx` | Uses `<WithSkiaWeb />` for code-splitting |
| `components/iridescence.tsx` | Example Skia component |
| `public/_headers` | WASM MIME type configuration |
| `wrangler.toml` | Cloudflare Pages configuration |
| `tailwind.config.js` | NativeWind configuration |
