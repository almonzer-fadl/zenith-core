import { z } from "zod";
import { collections } from "@/db/collections";
import { ApiError, handleApiError, ok } from "@/lib/api";
import { requireBearerUserId } from "@/lib/auth";
import { toObjectId } from "@/lib/common-route";
import { getRequestId } from "@/lib/observability";
import { auditLog } from "@/lib/audit";
import { assertNoUpdateConflict } from "@/lib/conflict";

const updateRuleSchema = z.object({
  expectedUpdatedAt: z.string().optional(),
  enabled: z.boolean().optional(),
  times: z.array(z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/)).min(1).max(6).optional(),
  severity: z.enum(["normal", "high"]).optional(),
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const requestId = getRequestId(request);
  try {
    const userId = await requireBearerUserId(request);
    const { id } = await params;
    const c = await collections();
    const item = await c.reminderRules.findOne({ _id: toObjectId(id), userId });
    if (!item) throw new ApiError(404, "NOT_FOUND", "Reminder rule not found");
    return ok(item, 200, requestId);
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const requestId = getRequestId(request);
  try {
    const userId = await requireBearerUserId(request);
    const body = updateRuleSchema.parse(await request.json());
    const { id } = await params;
    const c = await collections();
    const current = await c.reminderRules.findOne({ _id: toObjectId(id), userId });
    if (!current) throw new ApiError(404, "NOT_FOUND", "Reminder rule not found");

    assertNoUpdateConflict({
      expectedUpdatedAt: body.expectedUpdatedAt,
      currentUpdatedAt: current.updatedAt,
      entity: "reminder_rule",
      id,
    });

    const patch = { ...body, updatedAt: new Date() } as Record<string, unknown>;
    delete patch.expectedUpdatedAt;

    const item = await c.reminderRules.findOneAndUpdate({ _id: toObjectId(id), userId }, { $set: patch }, { returnDocument: "after" });
    if (!item) throw new ApiError(404, "NOT_FOUND", "Reminder rule not found");

    await auditLog({
      userId,
      action: "reminder.rule.update",
      entity: "reminder_rules",
      entityId: id,
      requestId,
      ip: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent"),
      meta: { fields: Object.keys(patch) },
    });

    return ok(item, 200, requestId);
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const requestId = getRequestId(request);
  try {
    const userId = await requireBearerUserId(request);
    const { id } = await params;
    const c = await collections();
    const res = await c.reminderRules.deleteOne({ _id: toObjectId(id), userId });
    if (res.deletedCount !== 1) throw new ApiError(404, "NOT_FOUND", "Reminder rule not found");

    await auditLog({
      userId,
      action: "reminder.rule.delete",
      entity: "reminder_rules",
      entityId: id,
      requestId,
      ip: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent"),
    });

    return ok({ deleted: true }, 200, requestId);
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
