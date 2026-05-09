import { z } from "zod";
import { collections } from "@/db/collections";
import { handleApiError, ok, ApiError } from "@/lib/api";
import { requireBearerUserId } from "@/lib/auth";
import { assertObjectId } from "@/app/api/v1/health/route";

const updateMoneySchema = z.object({
  loggedAt: z.coerce.date().optional(),
  type: z.enum(["income", "expense", "transfer"]).optional(),
  amount: z.number().positive().optional(),
  currency: z.string().length(3).transform((s) => s.toUpperCase()).optional(),
  category: z.string().min(1).max(120).optional(),
  account: z.string().max(120).nullable().optional(),
  note: z.string().max(2000).nullable().optional(),
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireBearerUserId(request);
    const { id } = await params;

    const c = await collections();
    const item = await c.moneyEntries.findOne({ _id: assertObjectId(id), userId });
    if (!item) throw new ApiError(404, "NOT_FOUND", "Money entry not found");

    return ok(item);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireBearerUserId(request);
    const body = updateMoneySchema.parse(await request.json());
    const { id } = await params;

    const c = await collections();
    const result = await c.moneyEntries.findOneAndUpdate(
      { _id: assertObjectId(id), userId },
      { $set: { ...body, updatedAt: new Date() } },
      { returnDocument: "after" }
    );

    if (!result) throw new ApiError(404, "NOT_FOUND", "Money entry not found");
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
    const result = await c.moneyEntries.deleteOne({ _id: assertObjectId(id), userId });

    if (result.deletedCount !== 1) {
      throw new ApiError(404, "NOT_FOUND", "Money entry not found");
    }

    return ok({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
