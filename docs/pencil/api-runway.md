# Pencil API Runway

## Near-Term API Shape

The local-first MVP should center around session and document operations, not hosted product concerns.

Preferred future surface:
- `pencilSessions.list`
- `pencilSessions.start`
- `pencilSessions.stop`
- `pencilSessions.attach`
- `pencilDocs.discover`
- `pencilDocs.render`
- `pencilDocs.load`
- `pencilDocs.save`

These names fit both local CLI/MCP use and any future hosted control plane.

## What This Intentionally Excludes

Not part of the MVP runway:
- auth
- billing
- hosted multi-tenant workspaces
- account ownership models
- cloud sync orchestration

The point of this runway is to avoid painting ourselves into a Slopcade-shaped corner, not to prematurely build a SaaS backend.

## Slopcade's Long-Term Role

Slopcade should become one host/integration for Pencil, not Pencil's defining backend.

That means:
- Slopcade can provide one `PencilDocumentStore` implementation.
- Slopcade can expose one hosted control surface if needed later.
- Pencil core contracts remain product-neutral.

## Recommended Landing Zones

- Local session/runtime orchestration: `packages/pencil-core/src/session/*`
- Future hosted adapters: separate integration modules, not core contracts
- Document APIs: should operate on project/file/session identity first

## Upgrade Path

1. Finish local-first CLI + MCP flows.
2. Move any remaining runtime entrypoints to session/project/file addressing.
3. If hosted Pencil becomes necessary, add a new host adapter instead of mutating core contracts.
