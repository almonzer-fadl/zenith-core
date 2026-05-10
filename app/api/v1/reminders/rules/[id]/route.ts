import { z } from "zod";
import { collections } from "@/db/collections";
import { ApiError, handleApiError, ok } from "@/lib/api";
import { requireBearerUserId } from "@/lib/auth";
import { toObjectId } from "@/lib/common-route";

const updateRuleSchema = z.object({
  enabled: z.boolean().optional(),
  times: z.array(z.string().regex(/^([01]\\d|2[0-3]):([0-5]\\d)$/)).min(1).max(6).optional(),
  severity: z.enum(["normal", "high"]).optional(),
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireBearerUserId(request);
    const { id } = await params;
    const c = await collections();
    const item = await c.reminderRules.findOne({ _id: toObjectId(id), userId });
    if (!item) throw new ApiError(404, "NOT_FOUND", "Reminder rule not found");
    return ok(item);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireBearerUserId(request);
    const body = updateRuleSchema.parse(await request.json());
    const { id } = await params;
    const c = await collections();
    const item = await c.reminderRules.findOneAndUpdate(
      { _id: toObjectId(id), userId },
      { $set: { ...body, updatedAt: new Date() } },
      { returnDocument: "after" }
    );
    if (!item) throw new ApiError(404, "NOT_FOUND", "Reminder rule not found");
    return ok(item);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireBearerUserId(request);
    const { id } = await params;
    const c = await collections();
    const res = await c.reminderRules.deleteOne({ _id: toObjectId(id), userId });
    if (res.deletedCount !== 1) throw new ApiError(404, "NOT_FOUND", "Reminder rule not found");
    return ok({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
