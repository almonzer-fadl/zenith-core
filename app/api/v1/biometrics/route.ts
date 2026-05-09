import { z } from "zod";
import { collections } from "@/db/collections";
import { handleApiError, ok } from "@/lib/api";
import { requireBearerUserId } from "@/lib/auth";
import { parseListQuery } from "@/lib/query";

const schema = z.object({
  timestamp: z.coerce.date().optional(),
  bgLevel: z.union([z.string(), z.number()]),
  insulinUnits: z.union([z.string(), z.number()]).nullable().optional(),
  carbs: z.union([z.string(), z.number()]).nullable().optional(),
  rpe: z.union([z.string(), z.number()]).nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function GET(request: Request) {
  try {
    const userId = await requireBearerUserId(request);
    const { page, limit } = parseListQuery(new URL(request.url));
    const skip = (page - 1) * limit;
    const c = await collections();
    const [items, total] = await Promise.all([
      c.biometrics.find({ userId }).sort({ timestamp: -1 }).skip(skip).limit(limit).toArray(),
      c.biometrics.countDocuments({ userId }),
    ]);
    return ok({ items, pagination: { page, limit, total } });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireBearerUserId(request);
    const body = schema.parse(await request.json());
    const now = new Date();
    const doc = {
      userId,
      timestamp: body.timestamp ?? now,
      bgLevel: String(body.bgLevel),
      insulinUnits: body.insulinUnits == null ? null : String(body.insulinUnits),
      carbs: body.carbs == null ? null : Number(body.carbs),
      rpe: body.rpe == null ? null : Number(body.rpe),
      notes: body.notes ?? null,
      createdAt: now,
      updatedAt: now,
    };
    const c = await collections();
    const result = await c.biometrics.insertOne(doc);
    return ok({ id: result.insertedId.toString(), ...doc }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
