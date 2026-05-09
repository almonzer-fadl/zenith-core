import { z } from "zod";
import { collections } from "@/db/collections";
import { handleApiError, ok } from "@/lib/api";
import { requireBearerUserId } from "@/lib/auth";
import { buildDateRangeFilter, parseListQuery } from "@/lib/query";

const createAthleticSchema = z.object({
  loggedAt: z.coerce.date().optional(),
  activityType: z.enum(["run", "walk", "cycle", "swim", "gym", "other"]),
  durationMin: z.number().int().min(1).max(3000),
  distanceKm: z.number().min(0).max(2000).nullable().optional(),
  avgHr: z.number().int().min(20).max(260).nullable().optional(),
  rpe: z.number().int().min(1).max(10).nullable().optional(),
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
      c.athleticLogs.find(filter).sort({ loggedAt: -1 }).skip(skip).limit(limit).toArray(),
      c.athleticLogs.countDocuments(filter),
    ]);

    return ok({ items, pagination: { page, limit, total } });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireBearerUserId(request);
    const body = createAthleticSchema.parse(await request.json());
    const now = new Date();

    const doc = {
      userId,
      loggedAt: body.loggedAt ?? now,
      activityType: body.activityType,
      durationMin: body.durationMin,
      distanceKm: body.distanceKm ?? null,
      avgHr: body.avgHr ?? null,
      rpe: body.rpe ?? null,
      notes: body.notes ?? null,
      createdAt: now,
      updatedAt: now,
    };

    const c = await collections();
    const result = await c.athleticLogs.insertOne(doc);

    return ok({ id: result.insertedId.toString(), ...doc }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
