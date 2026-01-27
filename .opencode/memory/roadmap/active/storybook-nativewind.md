# Storybook + NativeWind Setup

**Status**: active
**Source**: docs
**Created**: 2026-01-24
**Updated**: 2026-01-24

## Objective

Web-based component previews with full NativeWind (Tailwind CSS) styling support

## Progress

- [x] Webpack configuration for monorepo packages
- [x] Babel loader for TypeScript transpilation
- [x] PostCSS + Tailwind CSS integration
- [x] React Native Web aliasing
- [x] Platform-specific extensions (.web.ts, .native.ts)

## Blockers

None

## Notes

Complete setup guide in docs/storybook-setup.md

### Key Configuration Files
- `apps/storybook/.storybook/main.ts` - Webpack & babel config
- `apps/storybook/.storybook/preview.ts` - Story decorators & globals
- `apps/storybook/.storybook/global.css` - Tailwind directives
- `apps/storybook/tailwind.config.js` - Tailwind configuration
- `apps/storybook/postcss.config.js` - PostCSS configuration

### Running Storybook

```bash
# From monorepo root
pnpm storybook

# Or from the storybook directory
cd apps/storybook && pnpm storybook
```

Storybook will be available at `http://localhost:6006`

### Common Issues
See docs/storybook-setup.md troubleshooting section for:
- TypeScript transpilation errors
- NativeWind styles not appearing
- Module resolution issues
- Babel configuration problems
