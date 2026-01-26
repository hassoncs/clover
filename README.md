# Slopcade

Physics-based game engine and AI-powered game maker built with React Native.

---

## External Services

### Authentication & Database
- **Supabase Dashboard**: https://supabase.com/dashboard/project/bqoepxmdaiggnwjjszsd/
  - Project ID: `bqoepxmdaiggnwjjszsd`
  - Manages authentication, database, and storage

### OAuth Configuration
- **Google Cloud Console (OAuth Clients)**: https://console.cloud.google.com/auth/clients?project=slopcade
  - Manages Google OAuth credentials for authentication

### AI Asset Generation
- **Scenario.com**: Sprite and image generation
- **ElevenLabs**: Sound effects generation ([docs](docs/shared/reference/sound-generation.md))

---

## Documentation

### Interactive Documentation Site
- **Live Docs**: `pnpm docs` → http://localhost:3000
  - Auto-updating TypeScript documentation
  - 5 interactive pages: Behaviors, Effects, Particles, Rules, Examples
  - 7 comprehensive guides
  - Full TypeDoc API reference

### Static Documentation
- **Project Guide**: [app/AGENTS.md](./app/AGENTS.md)
- **Documentation Hub**: [docs/INDEX.md](./docs/INDEX.md)

## Quick Start

```bash
# Start all development servers (Metro + API + Docs)
pnpm dev

# Start just the documentation site
pnpm docs

# Build documentation for production
pnpm docs:build

# Run on device
pnpm ios
pnpm android
```

For more details, see [app/AGENTS.md](./app/AGENTS.md).
