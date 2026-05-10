import { z } from "zod";
import { collections } from "@/db/collections";
import { handleApiError, ok } from "@/lib/api";
import { requireBearerUserId } from "@/lib/auth";
import { parseListQuery } from "@/lib/query";
import { decryptText, encryptText } from "@/lib/crypto";
import { env } from "@/lib/env";
import { resolveIdempotentCreate } from "@/lib/idempotency";

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

export async function GET(request: Request) {
  try {
    const userId = await requireBearerUserId(request);
    const { page, limit } = parseListQuery(new URL(request.url));
    const skip = (page - 1) * limit;
    const c = await collections();
    const [items, total] = await Promise.all([
      c.telemetry.find({ userId }).sort({ timestamp: -1 }).skip(skip).limit(limit).toArray(),
      c.telemetry.countDocuments({ userId }),
    ]);
    return ok({
      items: items.map((x) => ({
        ...x,
        splits: x.splits ? decryptText(x.splits, env.FIELD_ENCRYPTION_SECRET) : null,
        notes: x.notes ? decryptText(x.notes, env.FIELD_ENCRYPTION_SECRET) : null,
      })),
      pagination: { page, limit, total },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireBearerUserId(request);
    const body = schema.parse(await request.json());

    const response = await resolveIdempotentCreate({
      userId,
      request,
      route: "v1/telemetry.create",
      payload: body,
      create: async () => {
        const now = new Date();
        const doc = {
          userId,
          timestamp: body.timestamp ?? now,
          type: body.type,
          distanceKm: String(body.distanceKm),
          paceSeconds: body.paceSeconds == null ? null : Number(body.paceSeconds),
          elevationGainM: body.elevationGainM == null ? null : Number(body.elevationGainM),
          avgHr: body.avgHr == null ? null : Number(body.avgHr),
          rpe: body.rpe == null ? null : Number(body.rpe),
          splits: body.splits ? encryptText(body.splits, env.FIELD_ENCRYPTION_SECRET) : null,
          notes: body.notes ? encryptText(body.notes, env.FIELD_ENCRYPTION_SECRET) : null,
          createdAt: now,
          updatedAt: now,
        };
        const c = await collections();
        const result = await c.telemetry.insertOne(doc);
        return { id: result.insertedId.toString(), ...doc, splits: body.splits ?? null, notes: body.notes ?? null };
      },
    });

    return ok(response, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
