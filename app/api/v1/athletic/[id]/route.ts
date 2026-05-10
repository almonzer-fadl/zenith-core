import { z } from "zod";
import { collections } from "@/db/collections";
import { handleApiError, ok, ApiError } from "@/lib/api";
import { requireBearerUserId } from "@/lib/auth";
import { assertObjectId } from "@/app/api/v1/health/route";
import { assertNoUpdateConflict } from "@/lib/conflict";
import { getRequestId } from "@/lib/observability";
import { auditLog } from "@/lib/audit";

const updateAthleticSchema = z.object({
  expectedUpdatedAt: z.string().optional(),
  loggedAt: z.coerce.date().optional(),
  activityType: z.enum(["run", "walk", "cycle", "swim", "gym", "other"]).optional(),
  durationMin: z.number().int().min(1).max(3000).optional(),
  distanceKm: z.number().min(0).max(2000).nullable().optional(),
  avgHr: z.number().int().min(20).max(260).nullable().optional(),
  rpe: z.number().int().min(1).max(10).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const requestId = getRequestId(request);
  try {
    const userId = await requireBearerUserId(request);
    const { id } = await params;

    const c = await collections();
    const item = await c.athleticLogs.findOne({ _id: assertObjectId(id), userId });
    if (!item) throw new ApiError(404, "NOT_FOUND", "Athletic log not found");

    return ok(item, 200, requestId);
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const requestId = getRequestId(request);
  try {
    const userId = await requireBearerUserId(request);
    const body = updateAthleticSchema.parse(await request.json());
    const { id } = await params;

    const c = await collections();
    const current = await c.athleticLogs.findOne({ _id: assertObjectId(id), userId });
    if (!current) throw new ApiError(404, "NOT_FOUND", "Athletic log not found");

    assertNoUpdateConflict({
      expectedUpdatedAt: body.expectedUpdatedAt,
      currentUpdatedAt: current.updatedAt,
      entity: "athletic_logs",
      id,
    });

    const updateDoc = { ...body } as Record<string, unknown>;
    delete updateDoc.expectedUpdatedAt;

    const result = await c.athleticLogs.findOneAndUpdate(
      { _id: assertObjectId(id), userId },
      { $set: { ...updateDoc, updatedAt: new Date() } },
      { returnDocument: "after" }
    );

    if (!result) throw new ApiError(404, "NOT_FOUND", "Athletic log not found");

    await auditLog({
      userId,
      action: "athletic.update",
      entity: "athletic_logs",
      entityId: id,
      requestId,
      ip: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent"),
      meta: { fields: Object.keys(updateDoc) },
    });

    return ok(result, 200, requestId);
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
    const result = await c.athleticLogs.deleteOne({ _id: assertObjectId(id), userId });

    if (result.deletedCount !== 1) {
      throw new ApiError(404, "NOT_FOUND", "Athletic log not found");
    }

    await auditLog({
      userId,
      action: "athletic.delete",
      entity: "athletic_logs",
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
