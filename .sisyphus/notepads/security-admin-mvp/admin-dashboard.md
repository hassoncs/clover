# Admin Dashboard Implementation

## Overview
Added a lightweight, web-only admin dashboard to surface key metrics without needing direct database access.

## Components
1. **Backend**: `api/src/trpc/routes/admin-dashboard.ts`
   - `getStats`: Returns user counts, spend metrics, moderation rejects, and generation velocity.
   - Uses `adminProcedure` for security (checks `ADMIN_EMAILS`).
   - Aggregates data from `users`, `credit_transactions`, and `audit_events`.

2. **Frontend**: `app/app/admin/dashboard.tsx`
   - Web-only route (checks `Platform.OS === 'web'`).
   - Uses `trpcReact` to fetch stats.
   - Displays simple cards for metrics.
   - Handles 403 Forbidden gracefully.

## Metrics
- **Users**: Total and new today.
- **Economy**: Spend in last 24h and 7d (sum of negative transactions).
- **Operations**: Generation count in last 24h (from audit events).
- **Moderation**: Rejects by category in last 24h (from audit events).

## Security
- Protected by `adminProcedure` which verifies user email against `ADMIN_EMAILS` secret.
- Frontend hides content if not admin (after API check).

## Future Improvements
- Add date range picker.
- Add charts for trends.
- Add drill-down into specific events.
