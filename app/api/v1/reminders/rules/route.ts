import { z } from "zod";
import { collections } from "@/db/collections";
import { handleApiError, ok } from "@/lib/api";
import { requireBearerUserId } from "@/lib/auth";
import { getRequestId } from "@/lib/observability";
import { auditLog } from "@/lib/audit";

const domainSchema = z.enum(["insulin", "glucose", "meals", "sleep", "workout"]);

const createRuleSchema = z.object({
  domain: domainSchema,
  enabled: z.boolean(),
  times: z.array(z.string().regex(/^([01]\\d|2[0-3]):([0-5]\\d)$/)).min(1).max(6),
  severity: z.enum(["normal", "high"]).default("normal"),
});

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  try {
    const userId = await requireBearerUserId(request);
    const c = await collections();
    const items = await c.reminderRules.find({ userId }).sort({ domain: 1 }).toArray();
    return ok({ items }, 200, requestId);
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

export async function POST(request: Request) {
  const requestId = getRequestId(request);
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

    await auditLog({
      userId,
      action: "reminder.rule.upsert",
      entity: "reminder_rules",
      entityId: result?._id?.toString() ?? null,
      requestId,
      ip: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent"),
      meta: { domain: body.domain, enabled: body.enabled, severity: body.severity },
    });

    return ok(result, 201, requestId);
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
