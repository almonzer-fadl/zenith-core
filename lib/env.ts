import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  MONGODB_URI: z.string().min(1),
  MONGODB_DB: z.string().min(1).default("zenith_core"),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 chars"),
  APP_PASSWORD: z.string().min(8, "APP_PASSWORD must be at least 8 chars").optional(),
  OWNER_EMAIL: z.string().email().default("owner@zenith.local"),
  OWNER_PASSWORD: z.string().min(8).default("changeme123"),
  FIELD_ENCRYPTION_SECRET: z.string().min(16).default("zenith-default-secret"),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  REFRESH_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(60 * 60 * 24 * 30),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n");
  throw new Error(`Invalid environment configuration:\n${issues}`);
}
export const env = parsed.data;
