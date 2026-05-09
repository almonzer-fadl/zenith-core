import { z } from "zod";
import { collections } from "@/db/collections";
import { handleApiError, ok, ApiError } from "@/lib/api";
import { requireBearerUserId } from "@/lib/auth";
import { assertObjectId } from "@/app/api/v1/health/route";

const updateHealthSchema = z.object({
  loggedAt: z.coerce.date().optional(),
  stressLevel: z.number().int().min(1).max(10).optional(),
  sleepHours: z.number().min(0).max(24).optional(),
  restingHr: z.number().int().min(20).max(260).nullable().optional(),
  bodyWeightKg: z.number().min(1).max(500).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireBearerUserId(request);
    const { id } = await params;

    const c = await collections();
    const item = await c.healthLogs.findOne({ _id: assertObjectId(id), userId });
    if (!item) throw new ApiError(404, "NOT_FOUND", "Health log not found");

    return ok(item);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireBearerUserId(request);
    const body = updateHealthSchema.parse(await request.json());
    const { id } = await params;

    const c = await collections();
    const result = await c.healthLogs.findOneAndUpdate(
      { _id: assertObjectId(id), userId },
      { $set: { ...body, updatedAt: new Date() } },
      { returnDocument: "after" }
    );

    if (!result) throw new ApiError(404, "NOT_FOUND", "Health log not found");
    return ok(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireBearerUserId(request);
    const { id } = await params;

    const c = await collections();
    const result = await c.healthLogs.deleteOne({ _id: assertObjectId(id), userId });

    if (result.deletedCount !== 1) {
      throw new ApiError(404, "NOT_FOUND", "Health log not found");
    }

    return ok({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
