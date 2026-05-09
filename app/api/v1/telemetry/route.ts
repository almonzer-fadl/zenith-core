import { z } from "zod";
import { collections } from "@/db/collections";
import { handleApiError, ok } from "@/lib/api";
import { requireBearerUserId } from "@/lib/auth";
import { parseListQuery } from "@/lib/query";

const schema = z.object({
  timestamp: z.coerce.date().optional(),
  type: z.string().min(1),
  distanceKm: z.union([z.string(), z.number()]),
  paceSeconds: z.union([z.string(), z.number()]).nullable().optional(),
  elevationGainM: z.union([z.string(), z.number()]).nullable().optional(),
  avgHr: z.union([z.string(), z.number()]).nullable().optional(),
  rpe: z.union([z.string(), z.number()]).nullable().optional(),
  splits: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function GET(request: Request) { try { const userId = await requireBearerUserId(request); const { page, limit } = parseListQuery(new URL(request.url)); const skip = (page - 1) * limit; const c = await collections(); const [items, total] = await Promise.all([c.telemetry.find({ userId }).sort({ timestamp: -1 }).skip(skip).limit(limit).toArray(), c.telemetry.countDocuments({ userId })]); return ok({ items, pagination: { page, limit, total } }); } catch (error) { return handleApiError(error); } }
export async function POST(request: Request) { try { const userId = await requireBearerUserId(request); const body = schema.parse(await request.json()); const now = new Date(); const doc = { userId, timestamp: body.timestamp ?? now, type: body.type, distanceKm: String(body.distanceKm), paceSeconds: body.paceSeconds == null ? null : Number(body.paceSeconds), elevationGainM: body.elevationGainM == null ? null : Number(body.elevationGainM), avgHr: body.avgHr == null ? null : Number(body.avgHr), rpe: body.rpe == null ? null : Number(body.rpe), splits: body.splits ?? null, notes: body.notes ?? null, createdAt: now, updatedAt: now }; const c = await collections(); const result = await c.telemetry.insertOne(doc); return ok({ id: result.insertedId.toString(), ...doc }, 201); } catch (error) { return handleApiError(error); } }
