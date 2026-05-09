import { z } from "zod";
import { ObjectId } from "mongodb";
import { collections } from "@/db/collections";
import { ApiError, handleApiError, ok } from "@/lib/api";
import { requireBearerUserId } from "@/lib/auth";
import { buildDateRangeFilter, parseListQuery } from "@/lib/query";

const createHealthSchema = z.object({
  loggedAt: z.coerce.date().optional(),
  stressLevel: z.number().int().min(1).max(10),
  sleepHours: z.number().min(0).max(24),
  restingHr: z.number().int().min(20).max(260).nullable().optional(),
  bodyWeightKg: z.number().min(1).max(500).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export async function GET(request: Request) {
  try {
    const userId = await requireBearerUserId(request);
    const url = new URL(request.url);
    const { page, limit, from, to } = parseListQuery(url);
    const skip = (page - 1) * limit;

    const c = await collections();
    const filter = { userId, ...buildDateRangeFilter(from, to) };

    const [items, total] = await Promise.all([
      c.healthLogs.find(filter).sort({ loggedAt: -1 }).skip(skip).limit(limit).toArray(),
      c.healthLogs.countDocuments(filter),
    ]);

    return ok({ items, pagination: { page, limit, total } });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireBearerUserId(request);
    const body = createHealthSchema.parse(await request.json());
    const now = new Date();

    const doc = {
      userId,
      loggedAt: body.loggedAt ?? now,
      stressLevel: body.stressLevel,
      sleepHours: body.sleepHours,
      restingHr: body.restingHr ?? null,
      bodyWeightKg: body.bodyWeightKg ?? null,
      notes: body.notes ?? null,
      createdAt: now,
      updatedAt: now,
    };

    const c = await collections();
    const result = await c.healthLogs.insertOne(doc);

    return ok({ id: result.insertedId.toString(), ...doc }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export function assertObjectId(id: string) {
  if (!ObjectId.isValid(id)) {
    throw new ApiError(400, "INVALID_ID", "Invalid record id");
  }
  return new ObjectId(id);
}
