import { collections } from "@/db/collections";

export async function ensureIndexes() {
  const c = await collections();

  await Promise.all([
    c.healthLogs.createIndex({ userId: 1, loggedAt: -1 }),
    c.athleticLogs.createIndex({ userId: 1, loggedAt: -1 }),
    c.moneyEntries.createIndex({ userId: 1, loggedAt: -1 }),
    c.moneyEntries.createIndex({ userId: 1, category: 1, loggedAt: -1 }),
    c.refreshTokens.createIndex({ userId: 1, createdAt: -1 }),
    c.refreshTokens.createIndex({ tokenHash: 1 }, { unique: true }),
    c.refreshTokens.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
  ]);
}
