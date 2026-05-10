import { collections } from "@/db/collections";
import { handleApiError, ok } from "@/lib/api";
import { requireBearerUserId } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const userId = await requireBearerUserId(request);
    const c = await collections();
    const since = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000));
    const events = await c.reminderEvents.find({ userId, actedAt: { $gte: since } }).toArray();

    const total = events.length;
    const done = events.filter((e) => e.action === "done").length;
    const missed = events.filter((e) => e.action === "missed").length;
    const snoozed = events.filter((e) => e.action === "snooze").length;
    const adherenceRate = total == 0 ? 0 : done / total;

    const byDomain = ["insulin", "glucose", "meals", "sleep", "workout"].map((domain) => {
      const subset = events.filter((e) => e.domain === domain);
      const d = subset.filter((e) => e.action === "done").length;
      return {
        domain,
        total: subset.length,
        done: d,
        missed: subset.filter((e) => e.action === "missed").length,
        snoozed: subset.filter((e) => e.action === "snooze").length,
        adherenceRate: subset.length == 0 ? 0 : d / subset.length,
      };
    });

    return ok({
      windowDays: 7,
      total,
      done,
      missed,
      snoozed,
      adherenceRate,
      byDomain,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
