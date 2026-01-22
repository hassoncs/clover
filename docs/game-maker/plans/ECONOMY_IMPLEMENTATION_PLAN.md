# Platform Economics & Creator Incentives Implementation Plan

## Executive Summary

This document outlines the implementation of a **kid-safe, creator-focused economy** for our GameMaker platform. Based on research into Roblox, Scratch, and Core, we will implement a **Dual Currency System** that separates creative potential (AI generation) from monetization, underpinned by a robust **Attribution Genealogy** system that ensures credit always flows back to original creators.

**Core Philosophy:**
1.  **Creativity First:** AI generation is fueled by "Sparks" (Soft Currency) earned through engagement, not just money.
2.  **Credit is Sacred:** Automatic attribution chains prevent "stolen" content and reward original inventors.
3.  **Safety by Design:** COPPA-compliant parental controls and spending limits are foundational, not afterthoughts.

---

## 1. Core Architecture

### 1.1 Dual Currency Model

| Currency | Name | Symbol | Source | Use Cases |
| :--- | :--- | :--- | :--- | :--- |
| **Soft (Earned)** | **Sparks** | ⚡ | Daily login, publishing games, getting plays, remixing | AI Asset Generation (capped), unlocking basic templates |
| **Hard (Paid)** | **Gems** | 💎 | IAP, Subscriptions | Premium cosmetics, bulk AI generation, advanced analytics |

*   **Conversion:** Gems can buy Sparks (Time-saver), but Sparks *cannot* buy Gems (No cash-out yet).
*   **Cap:** Sparks have a "Wallet Cap" to encourage usage rather than hoarding.

### 1.2 Unit Economics & Profitability
To ensure the platform remains profitable, we treat Sparks as a **Customer Acquisition Cost (CAC)**.

*   **Cost Basis:**
    *   AI Image Gen (Scenario): ~$0.02 / image
    *   AI Logic Gen (OpenAI): ~$0.01 / request
*   **Spark Valuation:**
    *   100 Sparks ≈ $0.10 (Daily Free Allowance)
    *   **Generation Cost:** 20 Sparks per Image Gen ($0.02 value)
*   **The Safety Valve:**
    *   **Daily Cap:** Free users are capped at ~5 generations/day (100 Sparks).
    *   **Caching:** Generated assets are cached globally. Re-using an existing asset costs 1 Spark (Server cost) vs 20 Sparks (AI cost).
*   **Profit Model:**
    *   Free users pay with **Engagement** (populating the gallery).
    *   Paid users (Gems) pay for the infrastructure.
    *   Target: 3% Conversion Rate to Gems covers the AI costs of the 97% free users.

### 1.3 Global Identity & Customization
Since games are diverse, we introduce a **Global Avatar System** to drive cosmetic sales.

*   **The "Player" Entity:** A special Entity Template that games can choose to use.
    *   *Example:* A platformer uses the "Player" template. If I play it, I see *my* custom robot. If you play it, you see *your* custom wizard.
*   **Customization Slots:**
    *   **Avatar Skin:** The visual sprite (Robot, Wizard, Cat).
    *   **Cursor/Hand:** For touch/drag games.
    *   **Particles:** Trail effects when moving.
*   **Monetization:** Users buy "Skin Packs" or "Particle Trails" with Gems.

### 1.4 Attribution Genealogy

We will track the "DNA" of every game. When a user forks a game, we record a parent-child relationship.
*   **Visual Attribution:** Every game header shows "Remixed from [Original Game] by [Creator]".
*   **Revenue/Reward Sharing:** If a remix goes viral, the original creator earns a % of the Sparks generated.

---

## 2. Database Schema Changes

We need to extend our D1/Postgres schema (`api/schema.sql`) with the following tables.

### 2.1 Economy Tables

```sql
-- User Wallets
CREATE TABLE wallets (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  sparks_balance INTEGER DEFAULT 0,
  gems_balance INTEGER DEFAULT 0,
  lifetime_sparks_earned INTEGER DEFAULT 0,
  updated_at INTEGER NOT NULL
);

-- Transaction Ledger (Immutable History)
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  currency TEXT NOT NULL CHECK (currency IN ('sparks', 'gems')),
  amount INTEGER NOT NULL, -- Positive for credit, negative for debit
  source_type TEXT NOT NULL, -- 'daily_login', 'game_play_reward', 'iap', 'ai_generation', 'remix_reward'
  source_id TEXT, -- Reference to game_id, purchase_id, or job_id
  description TEXT,
  created_at INTEGER NOT NULL
);

-- Products (IAP Definitions)
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE, -- e.g., 'gems_pack_small'
  name TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL,
  currency_amount INTEGER NOT NULL, -- How many Gems/Sparks
  currency_type TEXT NOT NULL,
  is_active INTEGER DEFAULT 1
);

-- Purchases (Real Money Transactions)
CREATE TABLE purchases (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  product_id TEXT NOT NULL REFERENCES products(id),
  platform TEXT NOT NULL, -- 'ios', 'android', 'web'
  platform_transaction_id TEXT,
  status TEXT NOT NULL, -- 'pending', 'completed', 'refunded'
  created_at INTEGER NOT NULL
);
```

### 2.2 Attribution & Social Tables

```sql
-- Genealogy Tree (Tracks Remix Chains)
CREATE TABLE game_genealogy (
  child_game_id TEXT NOT NULL REFERENCES games(id),
  parent_game_id TEXT NOT NULL REFERENCES games(id),
  fork_type TEXT NOT NULL, -- 'direct_fork', 'asset_borrow'
  created_at INTEGER NOT NULL,
  PRIMARY KEY (child_game_id, parent_game_id)
);

-- Social Engagement
CREATE TABLE game_stats (
  game_id TEXT PRIMARY KEY REFERENCES games(id),
  likes_count INTEGER DEFAULT 0,
  remix_count INTEGER DEFAULT 0,
  unique_plays INTEGER DEFAULT 0,
  updated_at INTEGER NOT NULL
);

CREATE TABLE game_likes (
  user_id TEXT NOT NULL REFERENCES users(id),
  game_id TEXT NOT NULL REFERENCES games(id),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, game_id)
);
```

### 2.3 Safety & Compliance

```sql
CREATE TABLE parental_controls (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  is_under_13 INTEGER DEFAULT 0,
  parent_email TEXT,
  daily_spend_limit_cents INTEGER,
  can_use_ai INTEGER DEFAULT 1,
  can_socialize INTEGER DEFAULT 0, -- Chat/Comments
  pin_hash TEXT, -- For changing settings
  updated_at INTEGER NOT NULL
);
```

---

## 3. UI/UX Components

### 3.1 HUD & Wallet
*   **Top Bar Component:** Displays current Sparks ⚡ and Gems 💎 balances.
*   **Animation:** "Sparks" fly into the counter when earned (e.g., after finishing a tutorial).
*   **Low Balance Warning:** When trying to generate AI assets with insufficient Sparks, prompt to "Play games to earn more" or "Ask parent for Gems".

### 3.2 Attribution Header
*   **Location:** Top of the Game Details / Play screen.
*   **Content:**
    *   If Original: "Created by [User]"
    *   If Remix: "Remixed by [User] • Based on [Original Game] by [Original User]"
*   **Interaction:** Tapping [Original Game] navigates to the parent game.

### 3.3 Parental Dashboard
*   **Access:** Protected by PIN (if set) or email verification.
*   **Features:**
    *   Toggle AI Generation (On/Off).
    *   Set Daily Spending Limit ($0 - $100).
    *   View Transaction History (Where did the Gems go?).
    *   "Ask to Buy" notifications.

### 3.4 Creator Studio Integration
*   **Asset Generation:** Show cost in Sparks (e.g., "Generate Sprite: 5 ⚡").
*   **Publishing Flow:**
    *   "Allow Remixing?" toggle (Default: Yes).
    *   "Earn 10% of Sparks generated by remixes!" incentive text.

---

## 4. Implementation Roadmap

### Phase 1: Foundation (The "Credit" Economy)
*   **Goal:** Establish attribution and basic stats without monetization.
*   **Tasks:**
    1.  Implement `game_genealogy` table.
    2.  Update `forkGame` API to record genealogy.
    3.  Add `AttributionHeader` UI component.
    4.  Implement `game_likes` and `game_stats`.

### Phase 2: The Spark Engine (Soft Currency)
*   **Goal:** Gamify engagement and limit AI costs.
*   **Tasks:**
    1.  Implement `wallets` and `transactions` tables.
    2.  Create `WalletService` (credit/debit logic).
    3.  Add "Daily Login Bonus" (Give 50 Sparks).
    4.  Gate AI Generation behind Spark costs (e.g., 10 Sparks/gen).
    5.  Add UI for "Not enough Sparks".

### Phase 3: Monetization (Hard Currency)
*   **Goal:** Revenue generation via IAP.
*   **Tasks:**
    1.  Implement `products` and `purchases` tables.
    2.  Integrate RevenueCat or similar for mobile IAP.
    3.  Create "Gem Store" UI.
    4.  Implement Gem -> Spark exchange.

### Phase 4: Safety & Compliance (COPPA)
*   **Goal:** Full legal compliance for <13 users.
*   **Tasks:**
    1.  Implement `parental_controls` table.
    2.  Add Age Gate during signup.
    3.  Build Parental Dashboard.
    4.  Implement "Ask to Buy" flow.

---

## 5. Technical Specifications

### 5.1 API Routes (tRPC)

*   `economy.getBalance`: Returns { sparks, gems }.
*   `economy.getTransactions`: Returns history.
*   `economy.claimDailyReward`: Adds Sparks if eligible.
*   `games.fork`: Creates copy + genealogy entry.
*   `parental.updateSettings`: Updates controls (requires auth).

### 5.2 AI Cost Logic
To prevent abuse and manage costs, AI generation is priced in Sparks:
*   **Sprite Gen:** 10 ⚡
*   **Background Gen:** 20 ⚡
*   **Music Gen:** 50 ⚡

*Users get ~100 free Sparks/day, enough for 10 sprites.*

### 5.3 Anti-Abuse
*   **Rate Limiting:** Max 500 Sparks earned per day from gameplay.
*   **Fraud Detection:** Flag accounts with impossible win-rates or rapid remixing.
