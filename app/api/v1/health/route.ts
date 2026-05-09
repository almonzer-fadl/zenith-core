import { z } from "zod";
import { ObjectId } from "mongodb";
import { collections } from "@/db/collections";
import { ApiError, handleApiError, ok } from "@/lib/api";
import { requireBearerUserId } from "@/lib/auth";
import { buildDateRangeFilter, parseListQuery } from "@/lib/query";
import { decryptText, encryptText } from "@/lib/crypto";
import { env } from "@/lib/env";
import { auditLog } from "@/lib/audit";
import { getRequestId } from "@/lib/observability";

const createHealthSchema = z.object({ loggedAt: z.coerce.date().optional(), stressLevel: z.number().int().min(1).max(10), sleepHours: z.number().min(0).max(24), restingHr: z.number().int().min(20).max(260).nullable().optional(), bodyWeightKg: z.number().min(1).max(500).nullable().optional(), notes: z.string().max(2000).nullable().optional() });

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  try {
    const userId = await requireBearerUserId(request);
    const url = new URL(request.url);
    const { page, limit, from, to } = parseListQuery(url);
    const skip = (page - 1) * limit;
    const c = await collections();
    const filter = { userId, ...buildDateRangeFilter(from, to) };
    const [items, total] = await Promise.all([c.healthLogs.find(filter).sort({ loggedAt: -1 }).skip(skip).limit(limit).toArray(), c.healthLogs.countDocuments(filter)]);
    const hydrated = items.map((item) => ({ ...item, notes: item.notes ? decryptText(item.notes, env.FIELD_ENCRYPTION_SECRET) : null }));
    return ok({ items: hydrated, pagination: { page, limit, total } }, 200, requestId);
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  try {
    const userId = await requireBearerUserId(request);
    const body = createHealthSchema.parse(await request.json());
    const now = new Date();
    const doc = { userId, loggedAt: body.loggedAt ?? now, stressLevel: body.stressLevel, sleepHours: body.sleepHours, restingHr: body.restingHr ?? null, bodyWeightKg: body.bodyWeightKg ?? null, notes: body.notes ? encryptText(body.notes, env.FIELD_ENCRYPTION_SECRET) : null, createdAt: now, updatedAt: now };
    const c = await collections();
    const result = await c.healthLogs.insertOne(doc);
    await auditLog({ userId, action: "health.create", entity: "health_logs", entityId: result.insertedId.toString(), requestId, ip: request.headers.get("x-forwarded-for"), userAgent: request.headers.get("user-agent") });
    return ok({ id: result.insertedId.toString(), ...doc, notes: body.notes ?? null }, 201, requestId);
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

export function assertObjectId(id: string) { if (!ObjectId.isValid(id)) throw new ApiError(400, "INVALID_ID", "Invalid record id"); return new ObjectId(id); }
