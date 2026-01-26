# IAP Automation Guide

## Overview
Automate the creation and management of 7 In-App Purchase products using Fastlane + App Store Connect API.

---

## Prerequisites (One-Time Manual Setup)

Before running automation, complete these in [App Store Connect](https://appstoreconnect.apple.com):

### 1. Sign Paid Apps Agreement
- Navigate to **Agreements, Tax, and Banking**
- Sign the **Paid Apps Agreement**
- Status must show "Active"

### 2. Configure Banking & Tax
- Add bank account details
- Complete tax information (W-9 or equivalent)
- Verify status shows "Ready for Sale"

**Estimated Time:** 5-10 minutes

---

## Automation Setup

### Step 1: Install Fastlane

```bash
# macOS (recommended)
brew install fastlane

# Or via RubyGems
gem install fastlane
```

### Step 2: Initialize Fastlane

```bash
cd app/
fastlane init
```

Follow prompts:
- **Apple ID:** `hassoncs@gmail.com`
- **App Identifier:** `me.ch5.slopcade.app`
- **Scheme:** Select default

### Step 3: Configure App Store Connect API Key

```bash
cd app/
npx eas credentials
```

Follow prompts to upload your `.p8` API key (from Step 2 in DEPLOYMENT.md).

---

## IAP Product Definition

Create `app/fastlane/metadata/iaps.yml`:

```yaml
# Slopcade IAP Products
products:
  # Consumables - Gems
  - product_id: slopcade.gems.100
    type: consumable
    reference_name: Gems 100
    cleared_for_sale: true
    review_notes: "100 gems for unlocking templates and generation"
    localizations:
      en-US:
        name: "Gems 100"
        description: "100 gems to unlock premium game templates and effects"
    pricing:
      tier: 2  # $1.99

  - product_id: slopcade.gems.300
    type: consumable
    reference_name: Gems 300
    cleared_for_sale: true
    review_notes: "300 gems bundle"
    localizations:
      en-US:
        name: "Gems 300"
        description: "300 gems with better value"
    pricing:
      tier: 5  # $4.99

  - product_id: slopcade.gems.1500
    type: consumable
    reference_name: Gems 1500
    cleared_for_sale: true
    review_notes: "1500 gems best value pack"
    localizations:
      en-US:
        name: "Gems 1500"
        description: "1500 gems - best value!"
    pricing:
      tier: 20  # $19.99

  # Consumables - Sparks
  - product_id: slopcade.sparks.50
    type: consumable
    reference_name: Sparks 50
    cleared_for_sale: true
    review_notes: "50 sparks for asset tweaks"
    localizations:
      en-US:
        name: "Sparks 50"
        description: "50 sparks for re-rolling sprites and tweaks"
    pricing:
      tier: 1  # $0.99

  - product_id: slopcade.sparks.200
    type: consumable
    reference_name: Sparks 200
    cleared_for_sale: true
    review_notes: "200 sparks bundle"
    localizations:
      en-US:
        name: "Sparks 200"
        description: "200 sparks with better value"
    pricing:
      tier: 3  # $2.99

  - product_id: slopcade.sparks.1000
    type: consumable
    reference_name: Sparks 1000
    cleared_for_sale: true
    review_notes: "1000 sparks best value"
    localizations:
      en-US:
        name: "Sparks 1000"
        description: "1000 sparks - best value!"
    pricing:
      tier: 10  # $9.99

  # Subscription
  - product_id: slopcade.pro.monthly
    type: auto_renewable_subscription
    reference_name: Slopcade Pro Monthly
    subscription_group: slopcade_pro
    cleared_for_sale: true
    review_notes: "Monthly subscription for offline play and premium features"
    localizations:
      en-US:
        name: "Slopcade Pro"
        description: "Offline play + 500 Gems/mo + 100 Sparks/mo"
    pricing:
      tier: 10  # $9.99/month
```

**Apple Price Tier Reference:**
- Tier 1 = $0.99
- Tier 2 = $1.99
- Tier 3 = $2.99
- Tier 5 = $4.99
- Tier 10 = $9.99
- Tier 20 = $19.99

---

## Fastlane Lane

Add to `app/fastlane/Fastfile`:

```ruby
lane :sync_iaps do
  require 'spaceship'

  # Authenticate
  Spaceship::ConnectAPI.login

  # Get the app
  app = Spaceship::ConnectAPI::App.find("me.ch5.slopcade.app")
  UI.user_error!("App not found") unless app

  # Load IAP config
  iaps_config = YAML.load_file("./metadata/iaps.yml")

  iaps_config["products"].each do |product_def|
    product_id = product_def["product_id"]
    UI.message("Processing: #{product_id}")

    # Check if product exists
    existing = Spaceship::ConnectAPI::InAppPurchase.all(
      app_id: app.id,
      filter: { productId: product_id }
    ).first

    if existing
      UI.message("  ✅ Already exists, updating metadata...")
      # Update metadata if needed (name, description)
      existing.update_localizations(product_def["localizations"])
    else
      UI.message("  🆕 Creating new product...")
      
      # Create new IAP
      iap = Spaceship::ConnectAPI::InAppPurchase.create(
        app_id: app.id,
        attributes: {
          productId: product_id,
          name: product_def["reference_name"],
          inAppPurchaseType: product_def["type"].upcase,
          reviewNote: product_def["review_notes"]
        }
      )

      # Set pricing
      price_tier = product_def["pricing"]["tier"]
      iap.create_price_schedule(price_tier: price_tier)

      # Set localizations
      product_def["localizations"].each do |locale, strings|
        iap.create_localization(
          locale: locale,
          name: strings["name"],
          description: strings["description"]
        )
      end

      UI.success("  ✅ Created: #{product_id}")
    end
  end

  UI.success("🎉 All IAPs synced!")
end
```

---

## Usage

### Sync All IAPs to App Store Connect

```bash
cd app/
fastlane sync_iaps
```

**What it does:**
1. Authenticates with App Store Connect
2. Reads `metadata/iaps.yml`
3. For each product:
   - Creates if doesn't exist
   - Updates metadata if exists
   - Sets pricing tier
   - Configures localizations

**Idempotent:** Safe to run multiple times.

---

## Adding to Deployment Workflow

Update `scripts/ship.mjs` to include IAP sync:

```javascript
// Add new command
if (args.includes('iaps')) {
  console.log('📦 Syncing IAP products...');
  await execa('fastlane', ['sync_iaps'], { cwd: 'app', stdio: 'inherit' });
  process.exit(0);
}
```

Then add to `package.json`:

```json
{
  "scripts": {
    "ship:iaps": "node scripts/ship.mjs iaps"
  }
}
```

Usage:
```bash
pnpm ship:iaps
```

---

## Price Tier Management

When prices change:

1. Update `iaps.yml` with new tier
2. Run `fastlane sync_iaps`
3. Apple applies price change on next sync

**Effective Date:** You can set future effective dates via the API if needed for scheduled sales.

---

## Review Screenshots (Optional)

Add screenshots for each IAP in:
```
app/fastlane/metadata/iaps/
  slopcade.gems.100/
    screenshot.png
  slopcade.gems.300/
    screenshot.png
  ...
```

Fastlane will auto-upload during `deliver`.

---

## Testing IAPs (Sandbox)

### 1. Create Sandbox Testers

In App Store Connect:
- **Users and Access** > **Sandbox Testers**
- Create test account (e.g., `slopcade.test@icloud.com`)

### 2. Configure Device

On iOS device:
- **Settings** > **App Store** > **Sandbox Account**
- Sign in with test account

### 3. Test Purchases

Purchases will show `[Sandbox]` in StoreKit and won't charge real money.

---

## Common Issues

### "Agreement Not Signed"
- Complete manual setup steps above
- Wait 24 hours for Apple processing

### "Invalid Price Tier"
- Verify tier number matches [Apple's price matrix](https://developer.apple.com/help/app-store-connect/manage-pricing/schedule-price-changes)

### "Product Already Exists"
- Script is idempotent; will update metadata
- To delete, use App Store Connect UI

---

## Next Steps

1. Complete manual prerequisites
2. Run `fastlane sync_iaps`
3. Verify products in App Store Connect
4. Test purchases in sandbox
5. Submit for review

---

## References

- [App Store Connect API - IAPs](https://developer.apple.com/documentation/appstoreconnectapi/in-app_purchase)
- [Fastlane Spaceship](https://github.com/fastlane/fastlane/tree/master/spaceship)
- [Apple Price Tiers](https://developer.apple.com/help/app-store-connect/manage-pricing/schedule-price-changes)
