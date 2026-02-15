---
name: admin-access
description: "Admin access management for Slopcade API. Covers ADMIN_EMAILS configuration, admin procedure, and access control. Use when working on admin features or checking admin permissions."
---

# Admin Access Management

This skill provides guidance for managing admin access in the Slopcade API.

## Quick Reference

| Task | Command/Action |
|------|----------------|
| View current admins | Check `ADMIN_EMAILS` in hush secrets |
| Add admin | Edit `.hush` and add email to `ADMIN_EMAILS` |
| Remove admin | Edit `.hush` and remove email from `ADMIN_EMAILS` |
| Production secrets | `wrangler secret put ADMIN_EMAILS` |

## How Admin Access Works

Admin access is controlled by the `ADMIN_EMAILS` environment variable:

```
ADMIN_EMAILS=email1@example.com,email2@example.com
```

- Comma-separated list of email addresses
- Case-insensitive matching
- Must be set as a **secret** (not a regular env var)

## Setting Admin Emails

### Local Development

1. Decrypt secrets:
   ```bash
   pnpm hush:decrypt
   ```

2. Edit the `.hush` file:
   ```bash
   pnpm hush:edit
   # or
   z .hush
   ```

3. Add or modify `ADMIN_EMAILS`:
   ```
   ADMIN_EMAILS=hassoncs@gmail.com,another-admin@example.com
   ```

4. Encrypt secrets:
   ```bash
   pnpm hush:encrypt
   ```

5. Restart the API server.

### Production (Cloudflare Workers)

Set the secret via Wrangler:

```bash
cd api
wrangler secret put ADMIN_EMAILS
# When prompted, enter: hassoncs@gmail.com,another-admin@example.com
```

Or via Cloudflare Dashboard:
1. Go to Workers & Pages > slopcade-api
2. Settings > Variables > Add variable
3. Name: `ADMIN_EMAILS`, Value: comma-separated emails
4. Check "Encrypt" and deploy

## Admin-Protected Endpoints

These endpoints require admin access:

| Router | Endpoint | Purpose |
|--------|----------|---------|
| `adminTools` | `generateSound` | ElevenLabs sound generation |
| `adminTools` | `generateVoice` | ElevenLabs TTS |
| `adminTools` | `generatePartyContent` | AI party game content |
| `adminTools` | `seedDatabase` | Database seeding |
| `admin` | `backfillContentHash` | Asset hash migration |

## Troubleshooting

### "No admin emails configured" error

The `ADMIN_EMAILS` env var is not set. Add at least one admin email.

### "Admin access required" error

The authenticated user's email is not in the admin list. Check the email is spelled correctly and the list is comma-separated with no extra spaces.

### Changes not taking effect

- Local: Restart the API server after editing `.hush`
- Production: Redeploy after changing secrets

## Related Files

- `api/src/trpc/index.ts` - `adminProcedure` definition
- `api/src/trpc/context.ts` - Env type definitions
- `.hush.template` - Secrets template
