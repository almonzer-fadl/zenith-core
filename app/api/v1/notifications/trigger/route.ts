import { z } from "zod";
import webpush from "web-push";
import { collections } from "@/db/collections";
import { ApiError, handleApiError, ok } from "@/lib/api";
import { requireBearerUserId } from "@/lib/auth";

const schema = z.object({ title: z.string().optional(), body: z.string().optional(), url: z.string().optional() });

function configure() {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) throw new ApiError(500, "MISSING_VAPID", "Missing VAPID keys");
  webpush.setVapidDetails("mailto:zenith@local", pub, priv);
}

export async function POST(request: Request) {
  try {
    configure();
    const userId = await requireBearerUserId(request);
    const body = schema.parse(await request.json());
    const c = await collections();
    const sub = await c.pushSubscriptions.findOne({ userId });
    if (!sub) throw new ApiError(404, "NOT_SUBSCRIBED", "User not subscribed");
    const payload = JSON.stringify({ title: body.title ?? "Zenith Alert", body: body.body ?? "Check your latest data.", url: body.url ?? "/" });
    await webpush.sendNotification(sub.subscription as unknown as webpush.PushSubscription, payload);
    return ok({ sent: true });
  } catch (error) {
    return handleApiError(error);
  }
}
