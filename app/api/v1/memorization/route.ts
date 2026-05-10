import { z } from "zod";
import { collections } from "@/db/collections";
import { handleApiError, ok } from "@/lib/api";
import { requireBearerUserId } from "@/lib/auth";
import { resolveIdempotentCreate } from "@/lib/idempotency";

const schema = z.object({
  juzNumber: z.union([z.string(), z.number()]),
  surahNumber: z.union([z.string(), z.number()]).nullable().optional(),
  status: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const userId = await requireBearerUserId(request);
    const body = schema.parse(await request.json());

    const response = await resolveIdempotentCreate({
      userId,
      request,
      route: "v1/memorization.create",
      payload: body,
      create: async () => {
        const now = new Date();
        const doc = {
          userId,
          juzNumber: Number(body.juzNumber),
          surahNumber: body.surahNumber ? Number(body.surahNumber) : null,
          status: body.status,
          createdAt: now,
          updatedAt: now,
        };
        const c = await collections();
        const result = await c.quranMemorization.insertOne(doc);
        return { id: result.insertedId.toString(), ...doc };
      },
    });

    return ok(response, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
