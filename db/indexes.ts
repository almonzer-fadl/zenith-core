import { collections } from "@/db/collections";

export async function ensureIndexes() {
  const c = await collections();

  await Promise.all([
    c.users.createIndex({ email: 1 }, { unique: true }),
    c.sessions.createIndex({ userId: 1, createdAt: -1 }),
    c.sessions.createIndex({ refreshTokenHash: 1 }, { unique: true }),
    c.sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    c.rateLimits.createIndex({ key: 1, createdAt: 1 }),
    c.rateLimits.createIndex({ createdAt: 1 }, { expireAfterSeconds: 3600 }),
    c.auditLogs.createIndex({ userId: 1, createdAt: -1 }),
    c.auditLogs.createIndex({ entity: 1, createdAt: -1 }),
    c.monitoringEvents.createIndex({ createdAt: -1 }),
    c.monitoringEvents.createIndex({ route: 1, method: 1, createdAt: -1 }),
    c.idempotencyKeys.createIndex({ userId: 1, route: 1, key: 1 }, { unique: true }),
    c.idempotencyKeys.createIndex({ userId: 1, updatedAt: -1 }),
    c.idempotencyKeys.createIndex({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 14 }),
    c.reminderRules.createIndex({ userId: 1, domain: 1 }, { unique: true }),
    c.reminderRules.createIndex({ userId: 1, updatedAt: -1 }),
    c.reminderEvents.createIndex({ userId: 1, actedAt: -1 }),
    c.reminderEvents.createIndex({ userId: 1, domain: 1, actedAt: -1 }),
    c.profiles.createIndex({ userId: 1 }, { unique: true }),
    c.biometrics.createIndex({ userId: 1, timestamp: -1 }),
    c.telemetry.createIndex({ userId: 1, timestamp: -1 }),
    c.nutrition.createIndex({ userId: 1, timestamp: -1 }),
    c.sleepLogs.createIndex({ userId: 1, timestamp: -1 }),
    c.spiritualLogs.createIndex({ userId: 1, timestamp: -1 }),
    c.quranMemorization.createIndex({ userId: 1, updatedAt: -1 }),
    c.pushSubscriptions.createIndex({ userId: 1 }),
    c.pushSubscriptions.createIndex({ endpoint: 1 }),
    c.healthLogs.createIndex({ userId: 1, loggedAt: -1 }),
    c.athleticLogs.createIndex({ userId: 1, loggedAt: -1 }),
    c.moneyEntries.createIndex({ userId: 1, loggedAt: -1 }),
    c.moneyEntries.createIndex({ userId: 1, category: 1, loggedAt: -1 }),
    c.refreshTokens.createIndex({ userId: 1, createdAt: -1 }),
    c.refreshTokens.createIndex({ tokenHash: 1 }, { unique: true }),
    c.refreshTokens.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
  ]);
}
