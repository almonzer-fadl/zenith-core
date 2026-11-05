import { collections } from "@/db/collections";
import { handleApiError, ok } from "@/lib/api";
import { requireBearerUserId } from "@/lib/auth";
import { getRequestId } from "@/lib/observability";

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  try {
    const userId = await requireBearerUserId(request);
    const c = await collections();
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const events = await c.reminderEvents.find({ userId, actedAt: { $gte: since } }).toArray();

    const total = events.length;
    const done = events.filter((e) => e.action === "done").length;
    const missed = events.filter((e) => e.action === "missed").length;
    const snoozed = events.filter((e) => e.action === "snooze").length;
    const adherenceRate = total == 0 ? 0 : done / total;
    const missedRate = total == 0 ? 0 : missed / total;
    const currentStreak = computeCurrentDoneStreak(events);
    const streakQuality = currentStreak >= 5 ? "high" : currentStreak >= 2 ? "medium" : "low";

    const byDomain = ["insulin", "glucose", "meals", "sleep", "workout"].map((domain) => {
      const subset = events.filter((e) => e.domain === domain);
      const d = subset.filter((e) => e.action === "done").length;
      const m = subset.filter((e) => e.action === "missed").length;
      return {
        domain,
        total: subset.length,
        done: d,
        missed: m,
        snoozed: subset.filter((e) => e.action === "snooze").length,
        adherenceRate: subset.length == 0 ? 0 : d / subset.length,
        missedRate: subset.length == 0 ? 0 : m / subset.length,
        currentStreak: computeCurrentDoneStreak(subset),
      };
    });

    return ok({
      windowDays: 7,
      total,
      done,
      missed,
      snoozed,
      adherenceRate,
      missedRate,
      currentStreak,
      streakQuality,
      byDomain,
    }, 200, requestId);
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

function computeCurrentDoneStreak(events: Array<{ action: string; actedAt: Date }>) {
  const sorted = [...events].sort((a, b) => b.actedAt.getTime() - a.actedAt.getTime());
  let streak = 0;
  for (const event of sorted) {
    if (event.action === "done") {
      streak += 1;
      continue;
    }
    break;
  }
  return streak;
}
