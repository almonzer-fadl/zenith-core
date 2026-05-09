export interface ExertionData {
  distanceKm: number;
  paceSeconds: number;
  avgHr: number;
  rpe: number;
  timestamp: Date;
}

export interface GlucoseData {
  level: number;
  timestamp: Date;
}

export const analyzeStability = (glucoseLogs: GlucoseData[], exertionLogs: ExertionData[]) => {
  if (glucoseLogs.length === 0) {
    const totalVolume = exertionLogs.reduce((acc, log) => acc + log.distanceKm, 0);
    return {
      stabilityScore: "NO_DATA",
      glycemicVariability: "0.00",
      trainingVolumeKm: totalVolume,
      insulinSensitivityBonus: (totalVolume * 0.05).toFixed(1) + "%",
      recommendation: "Log glucose entries to unlock stability analysis.",
    };
  }

  const levels = glucoseLogs.map((l) => l.level);
  const avg = levels.reduce((a, b) => a + b, 0) / levels.length;
  const stdDev = Math.sqrt(levels.map((x) => Math.pow(x - avg, 2)).reduce((a, b) => a + b, 0) / levels.length);
  const totalVolume = exertionLogs.reduce((acc, log) => acc + log.distanceKm, 0);

  return {
    stabilityScore: stdDev < 1.5 ? "HIGH" : stdDev < 2.5 ? "OPTIMAL" : "STABLE",
    glycemicVariability: stdDev.toFixed(2),
    trainingVolumeKm: totalVolume,
    insulinSensitivityBonus: (totalVolume * 0.05).toFixed(1) + "%",
    recommendation: stdDev > 2.5 ? "Increase low-GI carb loading post-run." : "Protocol maintaining metabolic baseline.",
  };
};
