import { createHash } from "crypto";
import { collections } from "@/db/collections";
import { ApiError } from "@/lib/api";

function payloadHash(payload: unknown) {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export async function resolveIdempotentCreate<T extends { id: string }>(args: {
  userId: string;
  request: Request;
  route: string;
  payload: unknown;
  create: () => Promise<T>;
}) {
  const key = args.request.headers.get("Idempotency-Key")?.trim();
  if (!key) {
    return args.create();
  }

  if (key.length < 8 || key.length > 128) {
    throw new ApiError(400, "VALIDATION_ERROR", "Invalid Idempotency-Key header");
  }

  const c = await collections();
  const hash = payloadHash(args.payload);
  const existing = await c.idempotencyKeys.findOne({ userId: args.userId, route: args.route, key });

  if (existing) {
    if (existing.payloadHash !== hash) {
      throw new ApiError(409, "CONFLICT_ERROR", "Idempotency key reused with different payload");
    }

    if (!existing.response) {
      throw new ApiError(409, "CONFLICT_ERROR", "Request is already being processed");
    }

    return existing.response as T;
  }

  try {
    await c.idempotencyKeys.insertOne({
      userId: args.userId,
      route: args.route,
      key,
      payloadHash: hash,
      response: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } catch {
    const raced = await c.idempotencyKeys.findOne({ userId: args.userId, route: args.route, key });
    if (raced?.payloadHash && raced.payloadHash !== hash) {
      throw new ApiError(409, "CONFLICT_ERROR", "Idempotency key reused with different payload");
    }
    if (raced?.response) return raced.response as T;
    throw new ApiError(409, "CONFLICT_ERROR", "Request is already being processed");
  }

  const response = await args.create();
  await c.idempotencyKeys.updateOne(
    { userId: args.userId, route: args.route, key },
    { $set: { response, updatedAt: new Date() } }
  );

  return response;
}
