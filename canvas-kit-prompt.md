# CanvasKit WASM Deployment Test

Minimal Expo web app to systematically test CanvasKit WASM deployment on Cloudflare Pages.

## Project Scope

- **Framework**: Expo (web only, no native)
- **WASM**: CanvasKit only (react-native-skia)
- **Target Platform**: Cloudflare Pages
- **Goal**: Identify working deployment strategy for WASM + SPA routing

## Test Strategy

### Phase 1: Local Development (Baseline)
Test locally to verify CanvasKit works in development:
```bash
npx expo start --web
