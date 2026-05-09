import { z } from "zod";
import { collections } from "@/db/collections";
import { handleApiError, ok } from "@/lib/api";
import { requireBearerUserId } from "@/lib/auth";
import { buildDateRangeFilter, parseListQuery } from "@/lib/query";

const createMoneySchema = z.object({
  loggedAt: z.coerce.date().optional(),
  type: z.enum(["income", "expense", "transfer"]),
  amount: z.number().positive(),
  currency: z.string().length(3).transform((s) => s.toUpperCase()),
  category: z.string().min(1).max(120),
  account: z.string().max(120).nullable().optional(),
  note: z.string().max(2000).nullable().optional(),
});

export async function GET(request: Request) {
  try {
    const userId = await requireBearerUserId(request);
    const url = new URL(request.url);
    const { page, limit, from, to } = parseListQuery(url);
    const skip = (page - 1) * limit;

    const c = await collections();
    const filter = { userId, ...buildDateRangeFilter(from, to) };

    const [items, total] = await Promise.all([
      c.moneyEntries.find(filter).sort({ loggedAt: -1 }).skip(skip).limit(limit).toArray(),
      c.moneyEntries.countDocuments(filter),
    ]);

    const summary = items.reduce(
      (acc, item) => {
        if (item.type === "income") acc.income += item.amount;
        if (item.type === "expense") acc.expense += item.amount;
        return acc;
      },
      { income: 0, expense: 0 }
    );

    return ok({
      items,
      pagination: { page, limit, total },
      summary: { ...summary, net: summary.income - summary.expense },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireBearerUserId(request);
    const body = createMoneySchema.parse(await request.json());
    const now = new Date();

    const doc = {
      userId,
      loggedAt: body.loggedAt ?? now,
      type: body.type,
      amount: body.amount,
      currency: body.currency,
      category: body.category,
      account: body.account ?? null,
      note: body.note ?? null,
      createdAt: now,
      updatedAt: now,
    };

    const c = await collections();
    const result = await c.moneyEntries.insertOne(doc);

    return ok({ id: result.insertedId.toString(), ...doc }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
