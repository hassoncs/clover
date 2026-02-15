## 2026-02-15 Phase A Blockers (Manual/External Tasks)

### BLOCKED: Stripe account setup, product/price creation
- Requires human to log into Stripe Dashboard
- Create Product "Slopcade Pro" and Price "$9.99/mo"
- Cannot be automated

### BLOCKED: Domain registration + Apple Pay verification file
- Requires serving `.well-known/apple-developer-merchantid-domain-association`
- Requires HTTPS domain registration in Stripe Dashboard
- Cannot be automated

### BLOCKED: Add secrets to hush
- `STRIPE_SECRET_KEY` — from Stripe Dashboard → Developers → API keys
- `STRIPE_WEBHOOK_SECRET` — from Stripe webhook endpoint config
- Requires human to copy from Stripe Dashboard and run `hush set`

### BLOCKED: Add EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY to app config
- Requires the publishable key from Stripe Dashboard
- Depends on Stripe account setup being complete
