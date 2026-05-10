import { z } from "zod";
import { collections } from "@/db/collections";
import { ApiError, handleApiError, ok } from "@/lib/api";
import { requireBearerUserId } from "@/lib/auth";
import { toObjectId } from "@/lib/common-route";
import { assertNoUpdateConflict } from "@/lib/conflict";
import { getRequestId } from "@/lib/observability";
import { auditLog } from "@/lib/audit";

const schema = z.object({
  expectedUpdatedAt: z.string().optional(),
  timestamp: z.coerce.date().optional(),
  bedtime: z.coerce.date().nullable().optional(),
  wakeTime: z.coerce.date().nullable().optional(),
  quality: z.union([z.string(), z.number()]).nullable().optional(),
  totalHours: z.union([z.string(), z.number()]).nullable().optional(),
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const requestId = getRequestId(request);
  try {
    const userId = await requireBearerUserId(request);
    const { id } = await params;
    const c = await collections();
    const item = await c.sleepLogs.findOne({ _id: toObjectId(id), userId });
    if (!item) throw new ApiError(404, "NOT_FOUND", "Sleep log not found");
    return ok(item, 200, requestId);
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const requestId = getRequestId(request);
  try {
    const userId = await requireBearerUserId(request);
    const body = schema.parse(await request.json());
    const { id } = await params;
    const c = await collections();
    const current = await c.sleepLogs.findOne({ _id: toObjectId(id), userId });
    if (!current) throw new ApiError(404, "NOT_FOUND", "Sleep log not found");

    assertNoUpdateConflict({ expectedUpdatedAt: body.expectedUpdatedAt, currentUpdatedAt: current.updatedAt, entity: "sleep", id });

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (body.timestamp) patch.timestamp = body.timestamp;
    if (body.bedtime !== undefined) patch.bedtime = body.bedtime;
    if (body.wakeTime !== undefined) patch.wakeTime = body.wakeTime;
    if (body.quality !== undefined) patch.quality = body.quality == null ? null : Number(body.quality);
    if (body.totalHours !== undefined) patch.totalHours = body.totalHours == null ? null : String(body.totalHours);

    const item = await c.sleepLogs.findOneAndUpdate({ _id: toObjectId(id), userId }, { $set: patch }, { returnDocument: "after" });
    if (!item) throw new ApiError(404, "NOT_FOUND", "Sleep log not found");

    await auditLog({
      userId,
      action: "sleep.update",
      entity: "sleep_logs",
      entityId: id,
      requestId,
      ip: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent"),
      meta: { fields: Object.keys(body).filter((x) => x !== "expectedUpdatedAt") },
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
    const result = await c.sleepLogs.deleteOne({ _id: toObjectId(id), userId });
    if (result.deletedCount !== 1) throw new ApiError(404, "NOT_FOUND", "Sleep log not found");

    await auditLog({
      userId,
      action: "sleep.delete",
      entity: "sleep_logs",
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
