# Audit Coverage Matrix

## Sensitive Mutations (Required Audit)
- Auth/session:
  - `POST /api/v1/auth/login` -> `auth.login`
  - `POST /api/v1/auth/refresh` -> `auth.refresh`
  - `POST /api/v1/auth/logout` -> `auth.logout`
  - `DELETE /api/v1/sessions/{id}` -> session revoke
- Profile:
  - `PUT /api/v1/profile` -> `profile.update`
- Reminders:
  - `POST /api/v1/reminders/rules` -> `reminder.rule.upsert`
  - `PATCH /api/v1/reminders/rules/{id}` -> `reminder.rule.update`
  - `DELETE /api/v1/reminders/rules/{id}` -> `reminder.rule.delete`
  - `POST /api/v1/reminders/events` -> `reminder.event.create`
- Push:
  - `POST /api/v1/push` -> `push.subscribe`
  - `DELETE /api/v1/push` -> `push.unsubscribe`
  - `POST /api/v1/notifications/trigger` -> `push.trigger`
- Data entities (update/delete):
  - health, money, biometrics, telemetry, nutrition, sleep, athletic

## Enforcement
- Contract test: `tests/integration/contracts.ts`
- OpenAPI parity test: `tests/integration/openapi-parity.ts`
