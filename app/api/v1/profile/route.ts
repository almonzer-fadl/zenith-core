import { z } from "zod";
import { collections } from "@/db/collections";
import { handleApiError, ok } from "@/lib/api";
import { requireBearerUserId } from "@/lib/auth";

const profileSchema = z.object({
  dob: z.coerce.date().nullable().optional(),
  heightCm: z.number().min(1).max(300).optional(),
  targetCarbs: z.number().min(0).max(2000).optional(),
  targetProtein: z.number().min(0).max(2000).optional(),
  targetFat: z.number().min(0).max(2000).optional(),
  targetCalories: z.number().min(0).max(10000).optional(),
  glucoseLow: z.number().min(1).max(20).optional(),
  glucoseHigh: z.number().min(1).max(40).optional(),
});

function defaultProfile(userId: string) {
  return {
    userId,
    dob: null,
    heightCm: 178,
    targetCarbs: 180,
    targetProtein: 140,
    targetFat: 65,
    targetCalories: 2200,
    glucoseLow: 4,
    glucoseHigh: 7,
  };
}

export async function GET(request: Request) {
  try {
    const userId = await requireBearerUserId(request);
    const c = await collections();
    const item = await c.profiles.findOne({ userId });
    return ok(item ?? defaultProfile(userId));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const userId = await requireBearerUserId(request);
    const body = profileSchema.parse(await request.json());
    const c = await collections();
    const now = new Date();

    const result = await c.profiles.findOneAndUpdate(
      { userId },
      {
        $set: {
          ...body,
          updatedAt: now,
        },
        $setOnInsert: {
          ...defaultProfile(userId),
          createdAt: now,
        },
      },
      { upsert: true, returnDocument: "after" }
    );

    return ok(result);
  } catch (error) {
    return handleApiError(error);
  }
}
