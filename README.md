# Axone Panel

Axone Panel is a personal health and performance dashboard built with Next.js 16, React 19, MongoDB, and Tailwind CSS 4.

It combines multiple logs (biometrics, telemetry, sleep, nutrition, health, and spiritual tracking) into one authenticated panel, with optional web push notifications and PWA install support.

## Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- MongoDB
- Tailwind CSS 4
- Recharts
- Web Push (`web-push`)
- Vercel Analytics

## Features

- Password-protected access using signed cookie sessions
- Dashboard summary with latest biometrics, exertion, and sleep
- Logging flows for:
  - Biometrics
  - Telemetry
  - Nutrition
  - Health
  - Sleep
  - Spiritual progress
- Reports and charting
- PWA manifest/service worker assets
- Push subscription endpoints and notification trigger endpoint

## Project Structure

- `app/`: App Router pages, API routes, server actions
- `components/`: shared UI components
- `db/`: MongoDB connection and schema helpers
- `lib/`: auth, analytics, and push subscription persistence
- `public/`: PWA/service worker/static assets
- `scripts/`: utility scripts (for example seed scripts)

## Environment Variables

Create a `.env.local` file:

```bash
MONGODB_URI="mongodb://localhost:27017"
MONGODB_DB="axone"

AUTH_SECRET="replace-with-a-long-random-secret"
APP_PASSWORD="replace-with-your-login-password"

NEXT_PUBLIC_VAPID_PUBLIC_KEY=""
VAPID_PRIVATE_KEY=""
```

Notes:

- `AUTH_SECRET` is required for signing/verifying session cookies.
- `APP_PASSWORD` is the password used on the auth page.
- VAPID keys are required for push subscription and notification features.

## Install

```bash
npm install
```

## Run

```bash
npm run dev
```

Then open `http://localhost:3000`.

## Scripts

- `npm run dev`: start dev server (`0.0.0.0`)
- `npm run build`: production build
- `npm run start`: run built app
- `npm run lint`: run ESLint

## API Endpoints

- `POST /api/push`: save web push subscription
- `DELETE /api/push`: remove web push subscription
- `POST /api/trigger-notification`: send a test/triggered notification

## Deployment

Deploy on any Node.js-compatible platform that supports Next.js 16 and environment variables (for example Vercel). Ensure MongoDB and all required env vars are configured in the target environment.
