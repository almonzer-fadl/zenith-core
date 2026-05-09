# Zenith Core

Zenith Core is the backend-for-frontend API for Zenith clients (starting with iOS Swift).

## Stack

- Next.js 16 App Router (Route Handlers)
- Node.js runtime
- MongoDB
- JWT access tokens + rotating refresh tokens
- Zod request validation

## Environment

Create `.env.local`:

```bash
MONGODB_URI="mongodb://localhost:27017"
MONGODB_DB="zenith_core"

AUTH_SECRET="replace-with-very-long-random-secret-min-32"
APP_PASSWORD="replace-with-strong-password"

ACCESS_TOKEN_TTL_SECONDS="900"
REFRESH_TOKEN_TTL_SECONDS="2592000"
```

## Scripts

- `npm run dev` start dev server
- `npm run lint` lint
- `npm run build` production build
- `npm run db:indexes` create required Mongo indexes

## Auth Flow (iOS)

1. `POST /api/v1/auth/login` with app password
2. Store `accessToken` + `refreshToken` securely in Keychain
3. Send `Authorization: Bearer <accessToken>` on protected requests
4. On 401, call `POST /api/v1/auth/refresh`
5. Replace both tokens with rotated values
6. `POST /api/v1/auth/logout` to revoke refresh token

## API v1

### Auth

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`

### Health Logs

- `GET /api/v1/health?page=1&limit=20&from=ISO&to=ISO`
- `POST /api/v1/health`
- `GET /api/v1/health/:id`
- `PATCH /api/v1/health/:id`
- `DELETE /api/v1/health/:id`

### Athletic Logs

- `GET /api/v1/athletic?page=1&limit=20&from=ISO&to=ISO`
- `POST /api/v1/athletic`
- `GET /api/v1/athletic/:id`
- `PATCH /api/v1/athletic/:id`
- `DELETE /api/v1/athletic/:id`

### Money Entries

- `GET /api/v1/money?page=1&limit=20&from=ISO&to=ISO`
- `POST /api/v1/money`
- `GET /api/v1/money/:id`
- `PATCH /api/v1/money/:id`
- `DELETE /api/v1/money/:id`

## Standard Response Shape

Success:

```json
{ "success": true, "data": {} }
```

Failure:

```json
{ "success": false, "error": { "code": "...", "message": "..." } }
```
