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
```

**Success Criteria**: Canvas renders with Skia effects, no WASM errors in console.

### Phase 2: Static Deployment

Deploy built web app statically to Cloudflare Pages:

1. Build: `npx expo export -p web`
2. Setup `wrangler.toml`:

   ```toml
   name = "skia-test"
   compatibility_date = "2025-01-01"
   pages_build_output_dir = "dist"
   ```

3. Setup `public/_headers`:

   ```
   /*
     Cross-Origin-Embedder-Policy: require-corp
     Cross-Origin-Opener-Policy: same-origin

   /*.wasm
     Content-Type: application/wasm
     Cache-Control: public, max-age=31536000, immutable
   ```

4. Copy canvaskit.wasm to `public/`:

   ```bash
   mkdir -p public && cp $(node -p "require.resolve('canvaskit-wasm/bin/full/canvaskit.wasm', { paths: [require.resolve('@shopify/react-native-skia')] })") public/canvaskit.wasm
   ```

5. Deploy: `npx wrangler pages deploy dist`

**Success Criteria**: Canvas renders on deployed site, `/canvaskit.wasm` downloads as binary (not HTML).

### Phase 3: Cloudflare R2 CDN

If Phase 2 fails due to routing issues, upload WASM to R2 and serve from CDN:

1. Create R2 bucket: `npx wrangler r2 bucket create wasm-assets`
2. Upload WASM:

   ```bash
   npx wrangler r2 object put wasm-assets/canvaskit.wasm \
     --file public/canvaskit.wasm \
     --content-type application/wasm
   ```

3. Enable public access via R2 custom domain
4. Update code to load from R2:
   ```typescript
   LoadSkiaWeb({
     locateFile: (file) => `https://wasm.yourdomain.com/${file}`,
   });
   ```

**Success Criteria**: CanvasKit loads from R2 CDN, bypassing all routing issues.

## Debugging Checklist

- [ ] Local dev works (`npx expo start --web`)
- [ ] WASM files copied to `public/` directory
- [ ] `_headers` file includes COOP/COEP headers
- [ ] `wrangler.toml` configured correctly
- [ ] Can download `/canvaskit.wasm` directly (returns binary, not HTML)
- [ ] Browser console shows no WASM magic word errors
- [ ] Canvas/Skia effects render correctly

## Key Files

- `public/_headers` - Cloudflare headers configuration
- `wrangler.toml` - Cloudflare Pages configuration
- `components/SkiaCanvas.tsx` - Skia loading logic (adjust `locateFile` here)
- `public/canvaskit.wasm` - WASM binary (copy from node_modules)

## Expected Errors & Solutions

| Error                                                                        | Cause                                    | Solution                                       |
| ---------------------------------------------------------------------------- | ---------------------------------------- | ---------------------------------------------- |
| `expected magic word 00 61 73 6d, found 3c 21 44 4f`                         | WASM served as HTML                      | Check `_headers`, verify direct download works |
| `Failed to execute 'compile' on 'WebAssembly': Incorrect response MIME type` | Missing `Content-Type: application/wasm` | Add to `_headers`                              |
| `HTTP status code is not ok`                                                 | 404 on WASM file                         | Verify file exists, check routing rules        |

## Success Metrics

**MVP Complete When**:

1. CanvasKit loads without errors
2. Skia canvas renders visual effects
3. Deployment process documented
4. Strategy can be replicated for liftlog-25 project

---

Based on systematic testing approach from liftlog-25 project's [`plans/WASM_DEPLOYMENT_PLAN.md`](../../liftlog-25/plans/WASM_DEPLOYMENT_PLAN.md).
