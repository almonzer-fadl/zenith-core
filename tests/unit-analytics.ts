import assert from "node:assert/strict";
import { analyzeStability } from "@/lib/analytics";

const result = analyzeStability(
  [{ level: 5.5, timestamp: new Date() }, { level: 6.0, timestamp: new Date() }],
  [{ distanceKm: 5, paceSeconds: 300, avgHr: 150, rpe: 6, timestamp: new Date() }]
);
assert.ok(result.stabilityScore);
assert.ok(result.glycemicVariability);
console.log("unit-analytics passed");
