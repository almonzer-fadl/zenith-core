import { z } from "zod";
import { collections } from "@/db/collections";
import { handleApiError, ok, ApiError } from "@/lib/api";
import { requireBearerUserId } from "@/lib/auth";
import { parseListQuery } from "@/lib/query";
import { decryptText, encryptText } from "@/lib/crypto";
import { env } from "@/lib/env";
import { resolveIdempotentCreate } from "@/lib/idempotency";

const schema = z.object({
  timestamp: z.coerce.date().optional(),
  itemName: z.string().min(1),
  itemType: z.enum(["food", "drink"]).default("food"),
  quantity: z.union([z.string(), z.number()]),
  unit: z.string().min(1),
  carbsGrams: z.union([z.string(), z.number()]),
  proteinGrams: z.union([z.string(), z.number()]).nullable().optional(),
  fatGrams: z.union([z.string(), z.number()]).nullable().optional(),
  calories: z.union([z.string(), z.number()]).nullable().optional(),
  mealType: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function GET(request: Request) {
  try {
    const userId = await requireBearerUserId(request);
    const { page, limit } = parseListQuery(new URL(request.url));
    const skip = (page - 1) * limit;
    const c = await collections();
    const [items, total] = await Promise.all([
      c.nutrition.find({ userId }).sort({ timestamp: -1 }).skip(skip).limit(limit).toArray(),
      c.nutrition.countDocuments({ userId }),
    ]);
    return ok({
      items: items.map((x) => ({
        ...x,
        itemName: x.itemName ? decryptText(x.itemName, env.FIELD_ENCRYPTION_SECRET) : x.itemName,
        notes: x.notes ? decryptText(x.notes, env.FIELD_ENCRYPTION_SECRET) : null,
      })),
      pagination: { page, limit, total },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireBearerUserId(request);
    const body = schema.parse(await request.json());

    const carbs = Number(body.carbsGrams);
    const protein = body.proteinGrams == null ? 0 : Number(body.proteinGrams);
    const fat = body.fatGrams == null ? 0 : Number(body.fatGrams);
    const calculated = carbs * 4 + protein * 4 + fat * 9;
    if (body.calories != null && Number(body.calories) < calculated) {
      throw new ApiError(400, "VALIDATION_ERROR", `Calories (${Number(body.calories)}) cannot be lower than macro calories (${Math.round(calculated)}).`);
    }

    const response = await resolveIdempotentCreate({
      userId,
      request,
      route: "v1/nutrition.create",
      payload: body,
      create: async () => {
        const now = new Date();
        const doc = {
          userId,
          timestamp: body.timestamp ?? now,
          itemName: encryptText(body.itemName, env.FIELD_ENCRYPTION_SECRET),
          itemType: body.itemType,
          quantity: Number(body.quantity),
          unit: body.unit,
          carbsGrams: carbs,
          proteinGrams: body.proteinGrams == null ? null : Number(body.proteinGrams),
          fatGrams: body.fatGrams == null ? null : Number(body.fatGrams),
          calories: body.calories == null ? null : Number(body.calories),
          mealType: body.mealType ?? null,
          notes: body.notes ? encryptText(body.notes, env.FIELD_ENCRYPTION_SECRET) : null,
          createdAt: now,
          updatedAt: now,
        };
        const c = await collections();
        const result = await c.nutrition.insertOne(doc);
        return { id: result.insertedId.toString(), ...doc, itemName: body.itemName, notes: body.notes ?? null };
      },
    });

    return ok(response, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
