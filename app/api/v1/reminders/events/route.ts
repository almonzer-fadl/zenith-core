import { z } from "zod";
import { collections } from "@/db/collections";
import { handleApiError, ok } from "@/lib/api";
import { requireBearerUserId } from "@/lib/auth";

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
  try {
    const userId = await requireBearerUserId(request);
    const c = await collections();
    const items = await c.reminderEvents.find({ userId }).sort({ actedAt: -1 }).limit(100).toArray();
    return ok({ items });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
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
    return ok({ id: result.insertedId.toString(), ...doc }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
