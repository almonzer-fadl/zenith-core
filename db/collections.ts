import { ObjectId } from "mongodb";
import { getDb } from "@/db";

export interface BaseDoc {
  _id?: ObjectId;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BiometricsDoc extends BaseDoc {
  timestamp: Date;
  bgLevel: string;
  insulinUnits: string | null;
  carbs: number | null;
  rpe: number | null;
  notes?: string | null;
}

export interface TelemetryDoc extends BaseDoc {
  timestamp: Date;
  type: string;
  distanceKm: string;
  paceSeconds: number | null;
  elevationGainM: number | null;
  avgHr: number | null;
  rpe: number | null;
  splits?: string | null;
  notes?: string | null;
}

export interface NutritionDoc extends BaseDoc {
  timestamp: Date;
  itemName: string;
  itemType: "food" | "drink";
  quantity: number;
  unit: string;
  carbsGrams: number;
  proteinGrams: number | null;
  fatGrams: number | null;
  calories: number | null;
  mealType: string | null;
  notes?: string | null;
}

export interface SleepLogDoc extends BaseDoc {
  timestamp: Date;
  bedtime: Date | null;
  wakeTime: Date | null;
  quality: number | null;
  totalHours: string | null;
}

export interface SpiritualLogDoc extends BaseDoc {
  timestamp: Date;
  prayerName: string;
  status: string;
  quranPages: number;
  dhikrCount: number;
}

export interface QuranMemorizationDoc extends BaseDoc {
  juzNumber: number;
  surahNumber: number | null;
  status: string;
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

export interface PushSubscriptionDoc extends BaseDoc {
  endpoint: string;
  subscription: Record<string, unknown>;
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
    biometrics: db.collection<BiometricsDoc>("biometrics"),
    telemetry: db.collection<TelemetryDoc>("telemetry"),
    nutrition: db.collection<NutritionDoc>("nutrition"),
    sleepLogs: db.collection<SleepLogDoc>("sleep_logs"),
    spiritualLogs: db.collection<SpiritualLogDoc>("spiritual_logs"),
    quranMemorization: db.collection<QuranMemorizationDoc>("quran_memorization"),
    pushSubscriptions: db.collection<PushSubscriptionDoc>("push_subscriptions"),
    healthLogs: db.collection<HealthLogDoc>("health_logs"),
    athleticLogs: db.collection<AthleticLogDoc>("athletic_logs"),
    moneyEntries: db.collection<MoneyEntryDoc>("money_entries"),
    refreshTokens: db.collection<RefreshTokenDoc>("auth_refresh_tokens"),
  };
}
