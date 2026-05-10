import { z } from "zod";
import { collections } from "@/db/collections";
import { ApiError, handleApiError, ok } from "@/lib/api";
import { requireBearerUserId } from "@/lib/auth";
import { toObjectId } from "@/lib/common-route";
import { decryptText, encryptText } from "@/lib/crypto";
import { env } from "@/lib/env";
import { assertNoUpdateConflict } from "@/lib/conflict";
import { getRequestId } from "@/lib/observability";
import { auditLog } from "@/lib/audit";

const schema = z.object({
  expectedUpdatedAt: z.string().optional(),
  timestamp: z.coerce.date().optional(),
  type: z.string().min(1).optional(),
  distanceKm: z.union([z.string(), z.number()]).optional(),
  paceSeconds: z.union([z.string(), z.number()]).nullable().optional(),
  elevationGainM: z.union([z.string(), z.number()]).nullable().optional(),
  avgHr: z.union([z.string(), z.number()]).nullable().optional(),
  rpe: z.union([z.string(), z.number()]).nullable().optional(),
  splits: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const requestId = getRequestId(request);
  try {
    const userId = await requireBearerUserId(request);
    const { id } = await params;
    const c = await collections();
    const item = await c.telemetry.findOne({ _id: toObjectId(id), userId });
    if (!item) throw new ApiError(404, "NOT_FOUND", "Telemetry not found");
    return ok(
      {
        ...item,
        splits: item.splits ? decryptText(item.splits, env.FIELD_ENCRYPTION_SECRET) : null,
        notes: item.notes ? decryptText(item.notes, env.FIELD_ENCRYPTION_SECRET) : null,
      },
      200,
      requestId
    );
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
    const current = await c.telemetry.findOne({ _id: toObjectId(id), userId });
    if (!current) throw new ApiError(404, "NOT_FOUND", "Telemetry not found");

    assertNoUpdateConflict({ expectedUpdatedAt: body.expectedUpdatedAt, currentUpdatedAt: current.updatedAt, entity: "telemetry", id });

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (body.timestamp) patch.timestamp = body.timestamp;
    if (body.type !== undefined) patch.type = body.type;
    if (body.distanceKm !== undefined) patch.distanceKm = String(body.distanceKm);
    if (body.paceSeconds !== undefined) patch.paceSeconds = body.paceSeconds == null ? null : Number(body.paceSeconds);
    if (body.elevationGainM !== undefined) patch.elevationGainM = body.elevationGainM == null ? null : Number(body.elevationGainM);
    if (body.avgHr !== undefined) patch.avgHr = body.avgHr == null ? null : Number(body.avgHr);
    if (body.rpe !== undefined) patch.rpe = body.rpe == null ? null : Number(body.rpe);
    if (body.splits !== undefined) patch.splits = body.splits == null ? null : encryptText(body.splits, env.FIELD_ENCRYPTION_SECRET);
    if (body.notes !== undefined) patch.notes = body.notes == null ? null : encryptText(body.notes, env.FIELD_ENCRYPTION_SECRET);

    const item = await c.telemetry.findOneAndUpdate({ _id: toObjectId(id), userId }, { $set: patch }, { returnDocument: "after" });
    if (!item) throw new ApiError(404, "NOT_FOUND", "Telemetry not found");

    await auditLog({
      userId,
      action: "telemetry.update",
      entity: "telemetry",
      entityId: id,
      requestId,
      ip: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent"),
      meta: { fields: Object.keys(body).filter((x) => x !== "expectedUpdatedAt") },
    });

    return ok(
      {
        ...item,
        splits: item.splits ? decryptText(item.splits, env.FIELD_ENCRYPTION_SECRET) : null,
        notes: item.notes ? decryptText(item.notes, env.FIELD_ENCRYPTION_SECRET) : null,
      },
      200,
      requestId
    );
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
    const result = await c.telemetry.deleteOne({ _id: toObjectId(id), userId });
    if (result.deletedCount !== 1) throw new ApiError(404, "NOT_FOUND", "Telemetry not found");

    await auditLog({
      userId,
      action: "telemetry.delete",
      entity: "telemetry",
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
