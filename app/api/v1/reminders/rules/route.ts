import { z } from "zod";
import { collections } from "@/db/collections";
import { handleApiError, ok } from "@/lib/api";
import { requireBearerUserId } from "@/lib/auth";

const domainSchema = z.enum(["insulin", "glucose", "meals", "sleep", "workout"]);

const createRuleSchema = z.object({
  domain: domainSchema,
  enabled: z.boolean(),
  times: z.array(z.string().regex(/^([01]\\d|2[0-3]):([0-5]\\d)$/)).min(1).max(6),
  severity: z.enum(["normal", "high"]).default("normal"),
});

export async function GET(request: Request) {
  try {
    const userId = await requireBearerUserId(request);
    const c = await collections();
    const items = await c.reminderRules.find({ userId }).sort({ domain: 1 }).toArray();
    return ok({ items });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireBearerUserId(request);
    const body = createRuleSchema.parse(await request.json());
    const now = new Date();
    const c = await collections();

    const result = await c.reminderRules.findOneAndUpdate(
      { userId, domain: body.domain },
      {
        $set: {
          userId,
          domain: body.domain,
          enabled: body.enabled,
          times: body.times,
          severity: body.severity,
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true, returnDocument: "after" }
    );

    return ok(result, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
