import { z } from "zod";
import webpush from "web-push";
import { collections } from "@/db/collections";
import { ApiError, handleApiError, ok } from "@/lib/api";
import { requireBearerUserId } from "@/lib/auth";
import { getRequestId } from "@/lib/observability";
import { auditLog } from "@/lib/audit";
import { resolveIdempotentCreate } from "@/lib/idempotency";

const schema = z.object({ subscription: z.object({ endpoint: z.string().url() }).passthrough() });

function configure() {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) throw new ApiError(500, "MISSING_VAPID", "Missing VAPID keys");
  webpush.setVapidDetails("mailto:zenith@local", pub, priv);
}

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  try {
    configure();
    const userId = await requireBearerUserId(request);
    const body = schema.parse(await request.json());

    const response = await resolveIdempotentCreate({
      userId,
      request,
      route: "v1/push.subscribe",
      payload: body,
      create: async () => {
        const now = new Date();
        const c = await collections();
        await c.pushSubscriptions.deleteMany({ userId });
        const result = await c.pushSubscriptions.insertOne({
          userId,
          endpoint: body.subscription.endpoint,
          subscription: body.subscription,
          createdAt: now,
          updatedAt: now,
        });

        await auditLog({
          userId,
          action: "push.subscribe",
          entity: "push_subscriptions",
          entityId: result.insertedId.toString(),
          requestId,
          ip: request.headers.get("x-forwarded-for"),
          userAgent: request.headers.get("user-agent"),
          meta: { endpoint: body.subscription.endpoint },
        });

        return { saved: true, id: result.insertedId.toString() };
      },
    });

    return ok(response, 200, requestId);
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

export async function DELETE(request: Request) {
  const requestId = getRequestId(request);
  try {
    configure();
    const userId = await requireBearerUserId(request);
    const c = await collections();
    const result = await c.pushSubscriptions.deleteMany({ userId });

    await auditLog({
      userId,
      action: "push.unsubscribe",
      entity: "push_subscriptions",
      requestId,
      ip: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent"),
      meta: { deletedCount: result.deletedCount },
    });

    return ok({ deleted: true }, 200, requestId);
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
