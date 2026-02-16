## Hardcoded "Slopcade" String Audit

### Files with hardcoded brand references

| File | Line | Content |
|------|------|---------|
| app/app.json | 3 | `"scheme": "slopcade"` |
| app/app.json | 22 | `"cameraPermissionText": "Slopcade uses your camera for game features"` |
| app/app.json | 34 | `"name": "Slopcade"` |
| app/app.json | 35 | `"slug": "slopcade"` |
| app/app.json | 42 | `"bundleIdentifier": "me.ch5.slopcade.app"` |
| app/app.json | 48 | `"package": "me.ch5.slopcade.app"` |
| app/app/settings/subscription.tsx | 103 | `Welcome to Slopcade Pro!` |
| app/app/(tabs)/feed.tsx | 147 | `message: \`Check out "${game.title}" on Slopcade!\`` |
| app/app/(tabs)/feed.tsx | 165 | `const creatorName = game.userId ? "Slopcade Creator" : "Anonymous";` |
| app/app/(tabs)/profile.tsx | 71 | `"This email hasn't been invited to Slopcade yet. Invited users can sign in."` |
| app/app/(tabs)/profile.tsx | 397 | `const emailName = user?.email?.split("@")[0] ?? "Slopcade Creator";` |
| app/app/(tabs)/profile.tsx | 753 | `Invite someone to join Slopcade by email. They will be able to` |
| app/app/(tabs)/_layout.tsx | 25 | `title: "Slopcade"` |
| app/components/auth/InviteCodeInput.tsx | 70 | `Slopcade is invite-only during beta` |
| app/components/social/SocialFeedCard.tsx | 116 | `message: \`Check out "${game.title}" on Slopcade!\`` |
| app/components/billing/SubscriptionStatus.tsx | 31 | `Slopcade Pro` |
| app/ios/Slopcade/Info.plist | 10 | `<string>Slopcade</string>` |
| app/ios/Slopcade/Info.plist | 30 | `<string>slopcade</string>` |
| app/ios/Slopcade/Info.plist | 31 | `<string>me.ch5.slopcade.app</string>` |
| app/ios/Slopcade/Info.plist | 51 | `<string>Slopcade uses your camera for game features</string>` |
| app/public/godot/index.html | 6 | `<title>Slopcade</title>` |

### Summary
- Total files with user-facing hardcoded strings: ~15
- Total occurrences: ~25 (excluding package imports and internal IDs)
- Priority files to update:
    - `app/app.json` (Core app identity)
    - `app/app/(tabs)/_layout.tsx` (Main navigation title)
    - `app/components/auth/InviteCodeInput.tsx` (Onboarding text)
    - `app/app/(tabs)/profile.tsx` (Profile/Invite text)
    - `app/ios/Slopcade/Info.plist` (Native app metadata)

### Note on Package Imports
The codebase heavily uses `@slopcade/shared`, `@slopcade/theme`, and `@slopcade/ui`. These are monorepo package names and likely don't need to be changed for white-labeling the UI, but should be noted if a full rebrand of the codebase is desired.
