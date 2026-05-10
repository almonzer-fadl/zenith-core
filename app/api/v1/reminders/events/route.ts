import { z } from "zod";
import { collections } from "@/db/collections";
import { handleApiError, ok } from "@/lib/api";
import { requireBearerUserId } from "@/lib/auth";
import { getRequestId } from "@/lib/observability";
import { auditLog } from "@/lib/audit";

const domainSchema = z.enum(["insulin", "glucose", "meals", "sleep", "workout"]);
const actionSchema = z.enum(["done", "missed", "snooze"]);

const eventSchema = z.object({
  ruleId: z.string().nullable().optional(),
  domain: domainSchema,
  action: actionSchema,
  scheduledAt: z.coerce.date().nullable().optional(),
  actedAt: z.coerce.date().optional(),
  note: z.string().max(500).nullable().optional(),
});

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  try {
    const userId = await requireBearerUserId(request);
    const c = await collections();
    const items = await c.reminderEvents.find({ userId }).sort({ actedAt: -1 }).limit(100).toArray();
    return ok({ items }, 200, requestId);
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  try {
    const userId = await requireBearerUserId(request);
    const body = eventSchema.parse(await request.json());
    const now = new Date();
    const doc = {
      userId,
      ruleId: body.ruleId ?? null,
      domain: body.domain,
      action: body.action,
      scheduledAt: body.scheduledAt ?? null,
      actedAt: body.actedAt ?? now,
      note: body.note ?? null,
      createdAt: now,
      updatedAt: now,
    };
    const c = await collections();
    const result = await c.reminderEvents.insertOne(doc);
    await auditLog({
      userId,
      action: "reminder.event.create",
      entity: "reminder_events",
      entityId: result.insertedId.toString(),
      requestId,
      ip: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent"),
      meta: { domain: body.domain, action: body.action },
    });
    return ok({ id: result.insertedId.toString(), ...doc }, 201, requestId);
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
