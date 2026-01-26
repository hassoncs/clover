# Slopcade: Path to App Store Launch

## 1. Vision: "The AI-Powered Game Skinning Machine"
Slopcade is a platform where users take proven game mechanics (Templates) and use AI to completely reskin them with a single prompt. Launch priority is 100% reliability on the core 6 games, a robust credit system for monetization, and a unique BLE-based social hook.

---

## 2. Tier 1: Core Game Templates (6 Games)
Every template must have: **Win/Lose conditions**, **Polished HUD**, **Themed Asset Pack**, and **1-tap AI Regeneration**.

| Game | Type | Current Status | Polish Needed |
| :--- | :--- | :--- | :--- |
| **Slopeggle** | Peggle Clone | 🚧 Template only | Needs canonical example in `app/examples/` |
| **Pinball** | Physics Pinball | ✅ Functional | HUD styling, scoring animations |
| **Gem Crush** | Match-3 | ❌ Missing | Needs full implementation in Godot bridge |
| **Jumpy Cat** | Platformer | ⚠️ AI Template | Needs 100% polished "Mario-feel" example |
| **Stack Attack** | Tower Stacker | ✅ Functional | Win conditions, block variety |
| **Breakout** | Arcade Bouncer | ✅ Functional | Level layouts, power-ups |

---

## 3. Monetization & Credits (Economy Phase)
AI generation is the cost driver. The economy gates creation while allowing free play.

### 3.1 Currency System
- **Sparks (⚡)**: Soft currency. Earned by playing, daily logins, and remixing.
- **Gems (💎)**: Hard currency. Purchased via IAP.
- **Costs**: 
    - Full Game Reskin: 100 ⚡ or 10 💎
    - Single Asset Swap: 10 ⚡ or 1 💎
    - *Scenario.com Cost Basis*: ~$0.02 per image.

### 3.2 Implementation (RevenueCat)
- **Goal**: Integrate `react-native-purchases` for iOS/Android.
- **Tasks**:
    - [ ] Initialize `wallets` and `transactions` tables (D1/Supabase).
    - [ ] Implement `economy` tRPC router (spend/earn logic).
    - [ ] Add Gem Store UI and IAP hooks.
    - [ ] Rate limit AI APIs at the worker level.

---

## 4. The "Social Hook": BLE Local Multiplayer
We want 2-player synced physics worlds over Bluetooth.

### 4.1 Technical Fix (Android Bridge)
- **Current Issue**: "Not implemented on native" error on non-iOS devices.
- **Fix**: Port `BLEPeripheralModule.swift` logic to Kotlin for Android.
- **Goal**: 100% parity for `BLEPeripheralManager.ts` to enable "Host Game" on any phone.

---

## 5. UI & Polish (The "App Store" Bar)
Moving away from "developer UI" to a production game feel.

### 5.1 Custom Fonts & Styling
- **Godot Fonts**: Implement a pipeline for custom `.ttf` / `.otf` loading in Godot via the bridge.
- **Standardized HUD**: Create a `GameHUD` component with:
    - Retro-styled score counters.
    - Health/Lives bars that match the current theme.
    - High-quality "You Win" / "Game Over" animations.

### 5.2 Asset Generation UX
- **Live Preview**: Generate a sprite → see it instantly in a mini-world before saving.
- **Prompt Tuner**: Allow users to "Edit Prompt" if the AI misses the vibe.

---

## 6. Execution Roadmap (8 Weeks)

| Phase | Duration | Focus |
| :--- | :--- | :--- |
| **Phase 1: Foundation** | 2 Weeks | Fix BLE Android, Implement Wallet DB, Godot Font support. |
| **Phase 2: Templates** | 2 Weeks | Build 6 Polished Templates + Win/Lose conditions. |
| **Phase 3: Economy** | 2 Weeks | RevenueCat IAP integration, Spark/Gem UI, Daily Rewards. |
| **Phase 4: Lockdown** | 2 Weeks | Rate-limiting, API security, App Store assets, Submission. |

---

## 7. Success Metrics
- **Performance**: 60fps physics on iPhone 12 / Galaxy S21.
- **Cost**: 3% Gem conversion covers 100% of AI generation costs.
- **Retention**: User returns on Day 2 to claim "Daily Sparks".
- **Social**: 10% of sessions are multi-player (BLE).
