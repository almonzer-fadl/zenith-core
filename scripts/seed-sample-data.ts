import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
  const { collections } = await import("@/db/collections");
  const { encryptText } = await import("@/lib/crypto");
  const { env } = await import("@/lib/env");

  const email = "almonzerfadl@gmail.com".toLowerCase();
  const c = await collections();
  const user = await c.users.findOne({ email });
  if (!user?._id) {
    throw new Error(`User not found: ${email}`);
  }

  const userId = user._id.toString();
  const now = new Date();
  const d = (daysAgo: number, hour = 8, minute = 0) => {
    const dt = new Date(now);
    dt.setDate(dt.getDate() - daysAgo);
    dt.setHours(hour, minute, 0, 0);
    return dt;
  };

  const secret = env.FIELD_ENCRYPTION_SECRET;

  const tasks: Array<Promise<void>> = [];

  tasks.push((async () => {
    const count = await c.biometrics.countDocuments({ userId });
    if (count > 0) return;
    await c.biometrics.insertMany([
      {
        userId, timestamp: d(0, 8, 20), bgLevel: "6.1", insulinUnits: "2", carbs: 28, rpe: 3,
        notes: encryptText("Morning steady", secret), createdAt: now, updatedAt: now,
      },
      {
        userId, timestamp: d(1, 20, 40), bgLevel: "7.4", insulinUnits: "3", carbs: 35, rpe: 5,
        notes: encryptText("Post-dinner spike", secret), createdAt: now, updatedAt: now,
      },
    ]);
  })());

  tasks.push((async () => {
    const count = await c.telemetry.countDocuments({ userId });
    if (count > 0) return;
    await c.telemetry.insertMany([
      {
        userId, timestamp: d(0, 6, 45), type: "run", distanceKm: "5.3", paceSeconds: 315, elevationGainM: 42, avgHr: 148, rpe: 7,
        splits: encryptText("6:00,5:55,5:58,5:59,5:50", secret),
        notes: encryptText("Easy aerobic run", secret),
        createdAt: now, updatedAt: now,
      },
      {
        userId, timestamp: d(2, 18, 15), type: "gym", distanceKm: "0", paceSeconds: null, elevationGainM: null, avgHr: 121, rpe: 6,
        splits: null, notes: encryptText("Upper body strength", secret), createdAt: now, updatedAt: now,
      },
    ]);
  })());

  tasks.push((async () => {
    const count = await c.sleepLogs.countDocuments({ userId });
    if (count > 0) return;
    await c.sleepLogs.insertMany([
      {
        userId, timestamp: d(0, 7, 0), bedtime: d(1, 23, 10), wakeTime: d(0, 6, 50), quality: 8, totalHours: "7.7",
        createdAt: now, updatedAt: now,
      },
      {
        userId, timestamp: d(1, 7, 0), bedtime: d(2, 0, 5), wakeTime: d(1, 7, 5), quality: 7, totalHours: "7.0",
        createdAt: now, updatedAt: now,
      },
    ]);
  })());

  tasks.push((async () => {
    const count = await c.nutrition.countDocuments({ userId });
    if (count > 0) return;
    await c.nutrition.insertMany([
      {
        userId, timestamp: d(0, 9, 10), itemName: encryptText("Greek Yogurt Bowl", secret), itemType: "food", quantity: 1, unit: "bowl",
        carbsGrams: 32, proteinGrams: 24, fatGrams: 11, calories: 340, mealType: "breakfast",
        notes: encryptText("Added berries + honey", secret), createdAt: now, updatedAt: now,
      },
      {
        userId, timestamp: d(0, 14, 25), itemName: encryptText("Espresso", secret), itemType: "drink", quantity: 1, unit: "cup",
        carbsGrams: 1, proteinGrams: 0, fatGrams: 0, calories: 5, mealType: "snack",
        notes: null, createdAt: now, updatedAt: now,
      },
    ]);
  })());

  tasks.push((async () => {
    const count = await c.healthLogs.countDocuments({ userId });
    if (count > 0) return;
    await c.healthLogs.insertMany([
      {
        userId, loggedAt: d(0, 21, 30), stressLevel: 4, sleepHours: 7.7, restingHr: 58, bodyWeightKg: 77.8,
        notes: encryptText("Good energy today", secret), createdAt: now, updatedAt: now,
      },
      {
        userId, loggedAt: d(2, 21, 0), stressLevel: 6, sleepHours: 6.9, restingHr: 61, bodyWeightKg: 78.1,
        notes: encryptText("Long workday", secret), createdAt: now, updatedAt: now,
      },
    ]);
  })());

  tasks.push((async () => {
    const count = await c.spiritualLogs.countDocuments({ userId });
    if (count > 0) return;
    await c.spiritualLogs.insertMany([
      { userId, timestamp: d(0, 5, 30), prayerName: "Fajr", status: "completed", quranPages: 4, dhikrCount: 100, createdAt: now, updatedAt: now },
      { userId, timestamp: d(0, 20, 15), prayerName: "Isha", status: "completed", quranPages: 3, dhikrCount: 60, createdAt: now, updatedAt: now },
    ]);
  })());

  tasks.push((async () => {
    const count = await c.quranMemorization.countDocuments({ userId });
    if (count > 0) return;
    await c.quranMemorization.insertOne({
      userId, juzNumber: 2, surahNumber: 2, status: "in-progress", createdAt: now, updatedAt: now,
    });
  })());

  tasks.push((async () => {
    const count = await c.athleticLogs.countDocuments({ userId });
    if (count > 0) return;
    await c.athleticLogs.insertMany([
      {
        userId, loggedAt: d(0, 6, 45), activityType: "run", durationMin: 33, distanceKm: 5.3, avgHr: 148, rpe: 7,
        notes: "Easy aerobic run", createdAt: now, updatedAt: now,
      },
      {
        userId, loggedAt: d(3, 19, 0), activityType: "gym", durationMin: 50, distanceKm: null, avgHr: 124, rpe: 6,
        notes: "Strength session", createdAt: now, updatedAt: now,
      },
    ]);
  })());

  tasks.push((async () => {
    const count = await c.moneyEntries.countDocuments({ userId });
    if (count > 0) return;
    await c.moneyEntries.insertMany([
      {
        userId, loggedAt: d(1, 10, 30), type: "income", amount: 2500, currency: "USD", category: "Consulting", account: "Main",
        note: encryptText("Monthly invoice paid", secret), createdAt: now, updatedAt: now,
      },
      {
        userId, loggedAt: d(0, 18, 5), type: "expense", amount: 42.5, currency: "USD", category: "Food", account: "Card",
        note: encryptText("Dinner", secret), createdAt: now, updatedAt: now,
      },
    ]);
  })());

  await Promise.all(tasks);

  const [biometrics, telemetry, sleep, nutrition, health, spiritual, memorization, athletic, money] = await Promise.all([
    c.biometrics.countDocuments({ userId }),
    c.telemetry.countDocuments({ userId }),
    c.sleepLogs.countDocuments({ userId }),
    c.nutrition.countDocuments({ userId }),
    c.healthLogs.countDocuments({ userId }),
    c.spiritualLogs.countDocuments({ userId }),
    c.quranMemorization.countDocuments({ userId }),
    c.athleticLogs.countDocuments({ userId }),
    c.moneyEntries.countDocuments({ userId }),
  ]);

  console.log("Sample data ready for", email);
  console.log({ biometrics, telemetry, sleep, nutrition, health, spiritual, memorization, athletic, money });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

