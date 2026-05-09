import { ObjectId } from "mongodb";
import { getDb } from "@/db";

export interface BaseDoc {
  _id?: ObjectId;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface HealthLogDoc extends BaseDoc {
  loggedAt: Date;
  stressLevel: number;
  sleepHours: number;
  restingHr?: number | null;
  bodyWeightKg?: number | null;
  notes?: string | null;
}

export interface AthleticLogDoc extends BaseDoc {
  loggedAt: Date;
  activityType: "run" | "walk" | "cycle" | "swim" | "gym" | "other";
  durationMin: number;
  distanceKm?: number | null;
  avgHr?: number | null;
  rpe?: number | null;
  notes?: string | null;
}

export interface MoneyEntryDoc extends BaseDoc {
  loggedAt: Date;
  type: "income" | "expense" | "transfer";
  amount: number;
  currency: string;
  category: string;
  account?: string | null;
  note?: string | null;
}

export interface RefreshTokenDoc {
  _id?: ObjectId;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt?: Date | null;
  userAgent?: string | null;
  ip?: string | null;
  createdAt: Date;
}

export async function collections() {
  const db = await getDb();
  return {
    healthLogs: db.collection<HealthLogDoc>("health_logs"),
    athleticLogs: db.collection<AthleticLogDoc>("athletic_logs"),
    moneyEntries: db.collection<MoneyEntryDoc>("money_entries"),
    refreshTokens: db.collection<RefreshTokenDoc>("auth_refresh_tokens"),
  };
}
