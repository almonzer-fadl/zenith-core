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
  bgLevel: z.union([z.string(), z.number()]).optional(),
  insulinUnits: z.union([z.string(), z.number()]).nullable().optional(),
  carbs: z.union([z.string(), z.number()]).nullable().optional(),
  rpe: z.union([z.string(), z.number()]).nullable().optional(),
  context: z.enum(["fasting", "pre_meal", "post_meal", "pre_workout", "post_workout", "bedtime", "other"]).optional(),
  source: z.enum(["manual", "healthkit", "import"]).optional(),
  tags: z.array(z.string().min(1).max(30)).max(8).optional(),
  notes: z.string().nullable().optional(),
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const requestId = getRequestId(request);
  try {
    const userId = await requireBearerUserId(request);
    const { id } = await params;
    const c = await collections();
    const item = await c.biometrics.findOne({ _id: toObjectId(id), userId });
    if (!item) throw new ApiError(404, "NOT_FOUND", "Biometric not found");
    return ok({ ...item, notes: item.notes ? decryptText(item.notes, env.FIELD_ENCRYPTION_SECRET) : null }, 200, requestId);
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
    const current = await c.biometrics.findOne({ _id: toObjectId(id), userId });
    if (!current) throw new ApiError(404, "NOT_FOUND", "Biometric not found");

    assertNoUpdateConflict({ expectedUpdatedAt: body.expectedUpdatedAt, currentUpdatedAt: current.updatedAt, entity: "biometric", id });

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (body.timestamp) patch.timestamp = body.timestamp;
    if (body.bgLevel !== undefined) patch.bgLevel = String(body.bgLevel);
    if (body.insulinUnits !== undefined) patch.insulinUnits = body.insulinUnits == null ? null : String(body.insulinUnits);
    if (body.carbs !== undefined) patch.carbs = body.carbs == null ? null : Number(body.carbs);
    if (body.rpe !== undefined) patch.rpe = body.rpe == null ? null : Number(body.rpe);
    if (body.context !== undefined) patch.context = body.context;
    if (body.source !== undefined) patch.source = body.source;
    if (body.tags !== undefined) patch.tags = body.tags;
    if (body.notes !== undefined) patch.notes = body.notes == null ? null : encryptText(body.notes, env.FIELD_ENCRYPTION_SECRET);

    const item = await c.biometrics.findOneAndUpdate({ _id: toObjectId(id), userId }, { $set: patch }, { returnDocument: "after" });
    if (!item) throw new ApiError(404, "NOT_FOUND", "Biometric not found");

    await auditLog({
      userId,
      action: "biometrics.update",
      entity: "biometrics",
      entityId: id,
      requestId,
      ip: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent"),
      meta: { fields: Object.keys(body).filter((x) => x !== "expectedUpdatedAt") },
    });

    return ok({ ...item, notes: item.notes ? decryptText(item.notes, env.FIELD_ENCRYPTION_SECRET) : null }, 200, requestId);
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
    const result = await c.biometrics.deleteOne({ _id: toObjectId(id), userId });
    if (result.deletedCount !== 1) throw new ApiError(404, "NOT_FOUND", "Biometric not found");

    await auditLog({
      userId,
      action: "biometrics.delete",
      entity: "biometrics",
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
