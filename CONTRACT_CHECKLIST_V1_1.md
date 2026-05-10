# Zenith Core Contract Checklist v1.1

## Scope
This checklist is the source of truth for backend/iOS contract alignment.

## Envelope
- Success envelope: `{"ok": true, "data": ...}`
- Error envelope: `{"ok": false, "error": {"code","message","details?"}}`
- Error code set: `VALIDATION_ERROR`, `AUTH_ERROR`, `CONFLICT_ERROR`, `DUPLICATE_ERROR`, `RATE_LIMIT_ERROR`, `DOWNSTREAM_ERROR`, `SERVER_ERROR`

## Date/Time and Numeric Rules
- Storage: UTC timestamps.
- Transport: ISO-8601.
- Client render: local timezone.
- Numeric precision:
  - clinical metrics: 1 decimal display, full precision in API payload.
  - percentages: 0-100 numeric values.

## Idempotency
- Required on all POST writes from mobile sync/quick-entry.
- Header: `Idempotency-Key`.
- Replays return same semantic result.

## Conflict Policy
- Optimistic conflict: `expectedUpdatedAt` on mutable entities.
- On mismatch, return `CONFLICT_ERROR` with `details` containing client/server references.

## OpenAPI Parity Gates
- Every route file in `app/api/v1/**/route.ts` must exist in `openapi.json`.
- Every exported method in route file must exist in matching OpenAPI path item.
- Guarded by `tests/integration/openapi-parity.ts`.

## Endpoint Matrix (v1.1)
- Auth: `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/me`
- Sessions: `/sessions`, `/sessions/{id}`
- Core logs:
  - `/biometrics`, `/biometrics/{id}`
  - `/telemetry`, `/telemetry/{id}`
  - `/nutrition`, `/nutrition/{id}`
  - `/sleep`, `/sleep/{id}`
  - `/health`, `/health/{id}`
  - `/athletic`, `/athletic/{id}`
  - `/money`, `/money/{id}`
  - `/spiritual`, `/memorization`
- Dashboard/Reports: `/dashboard`, `/reports`
- Reminders: `/reminders/rules`, `/reminders/rules/{id}`, `/reminders/events`, `/reminders/adherence`
- Profile/Sync: `/profile`, `/sync/status`
- Push/Monitoring: `/push`, `/notifications/trigger`, `/monitoring/summary`

## Reports Contract Minimum
- `/reports` must return:
  - `metrics`
  - `comparisons` (`current`, `previous`)
  - `insights`
  - `drivers`
  - `windowDays`
  - `generatedAt`

## Definition of Done (Contract Layer)
- OpenAPI parity test passes.
- Contract integration tests pass.
- iOS decodes all currently used contract fields without fallback errors.
