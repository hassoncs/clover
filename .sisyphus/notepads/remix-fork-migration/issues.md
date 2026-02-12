## Issues Log

## 2026-02-11 Wave 1 Verification: Schema Mismatch (non-blocking)
- Migration script `asset_overrides_json` format: `Record<templateId, { assetId, assetUrl, placement? }>`
- Remix shared type `AssetOverrideSchema` expects: `{ templateId, assetUrl, placement? }`
- The migration stores `assetId` but the schema expects `templateId` as a required field inside the object
- The key is already the templateId, so the object doesn't need it again — but the shared schema requires it
- **Resolution**: Task 3 (Remix API) must align these — either add `templateId` to migration output or relax the shared schema. Recommend: make the DB format authoritative (`{ assetId, assetUrl }`) and adjust the shared Zod schema to match, since `templateId` is already the record key.
