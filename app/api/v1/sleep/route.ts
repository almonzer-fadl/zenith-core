import { z } from "zod";
import { collections } from "@/db/collections";
import { handleApiError, ok } from "@/lib/api";
import { requireBearerUserId } from "@/lib/auth";
import { parseListQuery } from "@/lib/query";
import { resolveIdempotentCreate } from "@/lib/idempotency";

const schema = z.object({
  timestamp: z.coerce.date().optional(),
  bedtime: z.coerce.date().nullable().optional(),
  wakeTime: z.coerce.date().nullable().optional(),
  quality: z.union([z.string(), z.number()]).nullable().optional(),
  totalHours: z.union([z.string(), z.number()]).nullable().optional(),
});

export async function GET(request: Request) {
  try {
    const userId = await requireBearerUserId(request);
    const { page, limit } = parseListQuery(new URL(request.url));
    const skip = (page - 1) * limit;
    const c = await collections();
    const [items, total] = await Promise.all([
      c.sleepLogs.find({ userId }).sort({ timestamp: -1 }).skip(skip).limit(limit).toArray(),
      c.sleepLogs.countDocuments({ userId }),
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

    const response = await resolveIdempotentCreate({
      userId,
      request,
      route: "v1/sleep.create",
      payload: body,
      create: async () => {
        const now = new Date();
        const doc = {
          userId,
          timestamp: body.timestamp ?? now,
          bedtime: body.bedtime ?? null,
          wakeTime: body.wakeTime ?? null,
          quality: body.quality == null ? null : Number(body.quality),
          totalHours: body.totalHours == null ? null : String(body.totalHours),
          createdAt: now,
          updatedAt: now,
        };
        const c = await collections();
        const result = await c.sleepLogs.insertOne(doc);
        return { id: result.insertedId.toString(), ...doc };
      },
    });

    return ok(response, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
