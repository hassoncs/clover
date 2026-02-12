# Legacy Deprecation Timeline

## Overview
This document defines the timeline for deprecating the legacy "Packs" system in favor of the new "Remix" architecture.

## Timeline

| Phase | Date | Description |
|-------|------|-------------|
| **Migration Complete** | 2026-02-11 | All Packs migrated to Remixes. Both systems operational. |
| **Remix Default** | 2026-02-12 | `useRemixDefault` flag enabled. New forks/saves use Remixes. |
| **Legacy Read-Only** | 2026-03-15 | Legacy "Packs" UI becomes read-only. No new Packs can be created. |
| **Legacy UI Removal** | 2026-04-15 | Legacy "Packs" UI removed from the app. |
| **Database Cleanup** | 2026-05-15 | Legacy `packs` and `pack_entries` tables dropped from D1. |

## Communication Plan
- **Internal**: Engineering and Product teams notified via Slack/Email.
- **External**: No direct user impact expected as Remixes provide feature parity.
