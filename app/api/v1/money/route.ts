import { z } from "zod";
import { collections } from "@/db/collections";
import { handleApiError, ok } from "@/lib/api";
import { requireBearerUserId } from "@/lib/auth";
import { buildDateRangeFilter, parseListQuery } from "@/lib/query";
import { decryptText, encryptText } from "@/lib/crypto";
import { env } from "@/lib/env";
import { auditLog } from "@/lib/audit";
import { getRequestId } from "@/lib/observability";
import { resolveIdempotentCreate } from "@/lib/idempotency";

const createMoneySchema = z.object({ loggedAt: z.coerce.date().optional(), type: z.enum(["income", "expense", "transfer"]), amount: z.number().positive(), currency: z.string().length(3).transform((s) => s.toUpperCase()), category: z.string().min(1).max(120), account: z.string().max(120).nullable().optional(), note: z.string().max(2000).nullable().optional() });

export async function GET(request: Request) {
  const requestId = getRequestId(request);
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

    const hydrated = items.map((item) => ({ ...item, note: item.note ? decryptText(item.note, env.FIELD_ENCRYPTION_SECRET) : null }));
    const summary = hydrated.reduce((acc, item) => { if (item.type === "income") acc.income += item.amount; if (item.type === "expense") acc.expense += item.amount; return acc; }, { income: 0, expense: 0 });

    return ok({ items: hydrated, pagination: { page, limit, total }, summary: { ...summary, net: summary.income - summary.expense } }, 200, requestId);
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  try {
    const userId = await requireBearerUserId(request);
    const body = createMoneySchema.parse(await request.json());

    const response = await resolveIdempotentCreate({
      userId,
      request,
      route: "v1/money.create",
      payload: body,
      create: async () => {
        const now = new Date();

        const doc = {
          userId,
          loggedAt: body.loggedAt ?? now,
          type: body.type,
          amount: body.amount,
          currency: body.currency,
          category: body.category,
          account: body.account ?? null,
          note: body.note ? encryptText(body.note, env.FIELD_ENCRYPTION_SECRET) : null,
          createdAt: now,
          updatedAt: now,
        };

        const c = await collections();
        const result = await c.moneyEntries.insertOne(doc);
        await auditLog({ userId, action: "money.create", entity: "money_entries", entityId: result.insertedId.toString(), requestId, ip: request.headers.get("x-forwarded-for"), userAgent: request.headers.get("user-agent") });

        return { id: result.insertedId.toString(), ...doc, note: body.note ?? null };
      },
    });

    return ok(response, 201, requestId);
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
