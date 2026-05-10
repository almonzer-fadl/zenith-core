import { handleApiError, ok } from "@/lib/api";
import { requireBearerUserId } from "@/lib/auth";
import { collections } from "@/db/collections";
import { analyzeStability } from "@/lib/analytics";

export async function GET(request: Request) {
  try {
    const userId = await requireBearerUserId(request);
    const now = new Date();
    const url = new URL(request.url);
    const windowDays = Math.max(7, Math.min(90, Number(url.searchParams.get("windowDays") ?? 30)));
    const from = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);
    const prevFrom = new Date(from.getTime() - windowDays * 24 * 60 * 60 * 1000);
    const c = await collections();
    const [biometrics, telemetry, sleep, nutrition, reminders] = await Promise.all([
      c.biometrics.find({ userId, timestamp: { $gte: prevFrom } }).sort({ timestamp: 1 }).toArray(),
      c.telemetry.find({ userId, timestamp: { $gte: prevFrom } }).sort({ timestamp: 1 }).toArray(),
      c.sleepLogs.find({ userId, timestamp: { $gte: prevFrom } }).sort({ timestamp: 1 }).toArray(),
      c.nutrition.find({ userId, timestamp: { $gte: prevFrom } }).sort({ timestamp: 1 }).toArray(),
      c.reminderEvents.find({ userId, actedAt: { $gte: prevFrom } }).sort({ actedAt: 1 }).toArray(),
    ]);

    const currentBiometrics = biometrics.filter((x) => x.timestamp >= from);
    const currentTelemetry = telemetry.filter((x) => x.timestamp >= from);
    const currentSleep = sleep.filter((x) => x.timestamp >= from);
    const currentNutrition = nutrition.filter((x) => x.timestamp >= from);
    const currentReminders = reminders.filter((x) => x.actedAt >= from);

    const previousBiometrics = biometrics.filter((x) => x.timestamp >= prevFrom && x.timestamp < from);
    const previousTelemetry = telemetry.filter((x) => x.timestamp >= prevFrom && x.timestamp < from);
    const previousSleep = sleep.filter((x) => x.timestamp >= prevFrom && x.timestamp < from);
    const previousNutrition = nutrition.filter((x) => x.timestamp >= prevFrom && x.timestamp < from);
    const previousReminders = reminders.filter((x) => x.actedAt >= prevFrom && x.actedAt < from);

    const glucoseLevels = currentBiometrics.map((b) => Number(b.bgLevel)).filter((x) => Number.isFinite(x) && x > 0);
    const glucoseAvg = average(glucoseLevels);
    const glucoseStd = standardDeviation(glucoseLevels, glucoseAvg);
    const glucoseCv = glucoseAvg > 0 ? (glucoseStd / glucoseAvg) * 100 : 0;
    const tirCount = glucoseLevels.filter((x) => x >= 4 && x <= 7).length;
    const hypoCount = glucoseLevels.filter((x) => x < 4).length;
    const hyperCount = glucoseLevels.filter((x) => x > 7).length;
    const tir = glucoseLevels.length > 0 ? (tirCount / glucoseLevels.length) * 100 : 0;

    const prevGlucose = previousBiometrics.map((b) => Number(b.bgLevel)).filter((x) => Number.isFinite(x) && x > 0);
    const prevGlucoseAvg = average(prevGlucose);
    const prevGlucoseStd = standardDeviation(prevGlucose, prevGlucoseAvg);
    const prevGlucoseCv = prevGlucoseAvg > 0 ? (prevGlucoseStd / prevGlucoseAvg) * 100 : 0;
    const prevTir = prevGlucose.length > 0 ? (prevGlucose.filter((x) => x >= 4 && x <= 7).length / prevGlucose.length) * 100 : 0;

    const sleepHours = currentSleep.map((x) => Number(x.totalHours ?? 0)).filter((x) => Number.isFinite(x) && x > 0);
    const sleepAvg = average(sleepHours);
    const sleepStd = standardDeviation(sleepHours, sleepAvg);
    const sleepConsistency = sleepAvg > 0 ? Math.max(0, 100 - (sleepStd / sleepAvg) * 100) : 0;

    const prevSleepHours = previousSleep.map((x) => Number(x.totalHours ?? 0)).filter((x) => Number.isFinite(x) && x > 0);
    const prevSleepAvg = average(prevSleepHours);

    const trainingLoad = currentTelemetry.reduce((acc, x) => acc + Number(x.distanceKm ?? 0), 0);
    const prevTrainingLoad = previousTelemetry.reduce((acc, x) => acc + Number(x.distanceKm ?? 0), 0);

    const reminderDone = currentReminders.filter((x) => x.action === "done").length;
    const reminderMissed = currentReminders.filter((x) => x.action === "missed").length;
    const reminderSnoozed = currentReminders.filter((x) => x.action === "snooze").length;
    const reminderTotal = currentReminders.length;
    const adherence = reminderTotal > 0 ? (reminderDone / reminderTotal) * 100 : 0;

    const prevReminderDone = previousReminders.filter((x) => x.action === "done").length;
    const prevReminderTotal = previousReminders.length;
    const prevAdherence = prevReminderTotal > 0 ? (prevReminderDone / prevReminderTotal) * 100 : 0;

    const nutritionCalories = currentNutrition.map((n) => Number(n.calories ?? 0)).filter((x) => Number.isFinite(x) && x > 0);
    const nutritionAvgCalories = average(nutritionCalories);

    const analysis = analyzeStability(
      currentBiometrics.map((b) => ({ level: Number(b.bgLevel ?? 0), timestamp: new Date(b.timestamp) })),
      currentTelemetry.map((t) => ({ distanceKm: Number(t.distanceKm ?? 0), paceSeconds: Number(t.paceSeconds ?? 0), avgHr: Number(t.avgHr ?? 0), rpe: Number(t.rpe ?? 0), timestamp: new Date(t.timestamp) }))
    );

    const drivers = [
      { key: "sleep_deficit", label: "Sleep Deficit", impact: sleepAvg > 0 && sleepAvg < 7 ? "high" : "low", value: round2(sleepAvg) },
      { key: "training_load", label: "Training Load", impact: trainingLoad >= 15 ? "high" : "moderate", value: round2(trainingLoad) },
      { key: "adherence", label: "Reminder Adherence", impact: adherence < 70 ? "high" : "moderate", value: round2(adherence) },
      { key: "nutrition_calories", label: "Average Calories", impact: nutritionAvgCalories > 0 ? "moderate" : "low", value: round2(nutritionAvgCalories) },
    ];

    const insights = [
      {
        id: "glucose_stability",
        title: "Glucose Stability",
        summary:
          tir >= 70
            ? `Time in range is strong at ${round1(tir)}%.`
            : `Time in range is ${round1(tir)}%, below target; reduce variability across meals and training windows.`,
        confidence: confidenceFromSamples(glucoseLevels.length),
        drivers: ["sleep_deficit", "adherence", "nutrition_calories"],
      },
      {
        id: "recovery_readiness",
        title: "Recovery Readiness",
        summary:
          sleepAvg >= 7 && sleepConsistency >= 80
            ? `Recovery baseline is good (${round1(sleepAvg)}h average sleep).`
            : `Recovery is constrained (${round1(sleepAvg)}h average sleep, consistency ${round1(sleepConsistency)}%).`,
        confidence: confidenceFromSamples(sleepHours.length),
        drivers: ["sleep_deficit", "training_load"],
      },
      {
        id: "protocol_adherence",
        title: "Protocol Adherence",
        summary:
          adherence >= 80
            ? `Reminder adherence is high at ${round1(adherence)}%.`
            : `Reminder adherence is ${round1(adherence)}%; missed/snoozed actions are reducing consistency.`,
        confidence: confidenceFromSamples(reminderTotal),
        drivers: ["adherence"],
      },
    ];

    return ok({
      windowDays,
      generatedAt: now.toISOString(),
      biometrics: currentBiometrics,
      telemetry: currentTelemetry,
      analysis,
      metrics: {
        tir,
        glucoseAverage: glucoseAvg,
        glucoseVariabilitySd: glucoseStd,
        glucoseVariabilityCv: glucoseCv,
        hypoCount,
        hyperCount,
        adherenceRate: adherence,
        adherenceDone: reminderDone,
        adherenceMissed: reminderMissed,
        adherenceSnoozed: reminderSnoozed,
        sleepAverageHours: sleepAvg,
        sleepConsistency,
        trainingLoadKm: trainingLoad,
      },
      comparisons: {
        current: {
          tir,
          glucoseAverage: glucoseAvg,
          glucoseVariabilityCv: glucoseCv,
          sleepAverageHours: sleepAvg,
          adherenceRate: adherence,
          trainingLoadKm: trainingLoad,
        },
        previous: {
          tir: prevTir,
          glucoseAverage: prevGlucoseAvg,
          glucoseVariabilityCv: prevGlucoseCv,
          sleepAverageHours: prevSleepAvg,
          adherenceRate: prevAdherence,
          trainingLoadKm: prevTrainingLoad,
        },
      },
      insights,
      drivers,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function standardDeviation(values: number[], avg: number) {
  if (values.length === 0) return 0;
  const variance = values.map((x) => Math.pow(x - avg, 2)).reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(variance);
}

function confidenceFromSamples(samples: number): "low" | "medium" | "high" {
  if (samples >= 30) return "high";
  if (samples >= 10) return "medium";
  return "low";
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}
