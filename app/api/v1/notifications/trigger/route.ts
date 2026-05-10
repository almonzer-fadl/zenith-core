import { z } from "zod";
import webpush from "web-push";
import { collections } from "@/db/collections";
import { ApiError, handleApiError, ok } from "@/lib/api";
import { requireBearerUserId } from "@/lib/auth";
import { getRequestId } from "@/lib/observability";
import { auditLog } from "@/lib/audit";
import { resolveIdempotentCreate } from "@/lib/idempotency";

const schema = z.object({ title: z.string().optional(), body: z.string().optional(), url: z.string().optional() });

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
      route: "v1/notifications.trigger",
      payload: body,
      create: async () => {
        const c = await collections();
        const sub = await c.pushSubscriptions.findOne({ userId });
        if (!sub) throw new ApiError(404, "NOT_SUBSCRIBED", "User not subscribed");

        const payload = JSON.stringify({
          title: body.title ?? "Zenith Alert",
          body: body.body ?? "Check your latest data.",
          url: body.url ?? "/",
        });

        await webpush.sendNotification(sub.subscription as unknown as webpush.PushSubscription, payload);

        await auditLog({
          userId,
          action: "push.trigger",
          entity: "push_subscriptions",
          entityId: sub._id?.toString() ?? null,
          requestId,
          ip: request.headers.get("x-forwarded-for"),
          userAgent: request.headers.get("user-agent"),
          meta: { title: body.title ?? "Zenith Alert", url: body.url ?? "/" },
        });

        return { sent: true, id: `${sub._id?.toString() ?? "sub"}:${Date.now()}` };
      },
    });

    return ok(response, 200, requestId);
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
