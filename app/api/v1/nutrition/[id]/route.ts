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
  itemName: z.string().min(1).optional(),
  itemType: z.enum(["food", "drink"]).optional(),
  quantity: z.union([z.string(), z.number()]).optional(),
  unit: z.string().min(1).optional(),
  carbsGrams: z.union([z.string(), z.number()]).optional(),
  proteinGrams: z.union([z.string(), z.number()]).nullable().optional(),
  fatGrams: z.union([z.string(), z.number()]).nullable().optional(),
  calories: z.union([z.string(), z.number()]).nullable().optional(),
  mealType: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const requestId = getRequestId(request);
  try {
    const userId = await requireBearerUserId(request);
    const { id } = await params;
    const c = await collections();
    const item = await c.nutrition.findOne({ _id: toObjectId(id), userId });
    if (!item) throw new ApiError(404, "NOT_FOUND", "Nutrition not found");
    return ok(
      {
        ...item,
        itemName: item.itemName ? decryptText(item.itemName, env.FIELD_ENCRYPTION_SECRET) : item.itemName,
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
    const current = await c.nutrition.findOne({ _id: toObjectId(id), userId });
    if (!current) throw new ApiError(404, "NOT_FOUND", "Nutrition not found");

    assertNoUpdateConflict({ expectedUpdatedAt: body.expectedUpdatedAt, currentUpdatedAt: current.updatedAt, entity: "nutrition", id });

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (body.timestamp) patch.timestamp = body.timestamp;
    if (body.itemName !== undefined) patch.itemName = encryptText(body.itemName, env.FIELD_ENCRYPTION_SECRET);
    if (body.itemType !== undefined) patch.itemType = body.itemType;
    if (body.quantity !== undefined) patch.quantity = Number(body.quantity);
    if (body.unit !== undefined) patch.unit = body.unit;
    if (body.carbsGrams !== undefined) patch.carbsGrams = Number(body.carbsGrams);
    if (body.proteinGrams !== undefined) patch.proteinGrams = body.proteinGrams == null ? null : Number(body.proteinGrams);
    if (body.fatGrams !== undefined) patch.fatGrams = body.fatGrams == null ? null : Number(body.fatGrams);
    if (body.calories !== undefined) patch.calories = body.calories == null ? null : Number(body.calories);
    if (body.mealType !== undefined) patch.mealType = body.mealType ?? null;
    if (body.notes !== undefined) patch.notes = body.notes == null ? null : encryptText(body.notes, env.FIELD_ENCRYPTION_SECRET);

    const item = await c.nutrition.findOneAndUpdate({ _id: toObjectId(id), userId }, { $set: patch }, { returnDocument: "after" });
    if (!item) throw new ApiError(404, "NOT_FOUND", "Nutrition not found");

    await auditLog({
      userId,
      action: "nutrition.update",
      entity: "nutrition",
      entityId: id,
      requestId,
      ip: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent"),
      meta: { fields: Object.keys(body).filter((x) => x !== "expectedUpdatedAt") },
    });

    return ok(
      {
        ...item,
        itemName: item.itemName ? decryptText(item.itemName, env.FIELD_ENCRYPTION_SECRET) : item.itemName,
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
    const result = await c.nutrition.deleteOne({ _id: toObjectId(id), userId });
    if (result.deletedCount !== 1) throw new ApiError(404, "NOT_FOUND", "Nutrition not found");

    await auditLog({
      userId,
      action: "nutrition.delete",
      entity: "nutrition",
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
