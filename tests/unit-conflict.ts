import { assertNoUpdateConflict } from "@/lib/conflict";

function assertThrows(fn: () => void, matcher: RegExp) {
  try {
    fn();
    throw new Error("Expected function to throw");
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (!matcher.test(msg)) {
      throw new Error(`Unexpected error message: ${msg}`);
    }
  }
}

// valid match should pass
assertNoUpdateConflict({
  expectedUpdatedAt: "2026-05-10T00:00:00.000Z",
  currentUpdatedAt: new Date("2026-05-10T00:00:00.000Z"),
  entity: "health_logs",
  id: "abc",
});

// stale timestamp should fail with conflict
assertThrows(
  () =>
    assertNoUpdateConflict({
      expectedUpdatedAt: "2026-05-09T00:00:00.000Z",
      currentUpdatedAt: new Date("2026-05-10T00:00:00.000Z"),
      entity: "health_logs",
      id: "abc",
    }),
  /Update conflict detected/
);

// invalid date should fail with validation
assertThrows(
  () =>
    assertNoUpdateConflict({
      expectedUpdatedAt: "not-a-date",
      currentUpdatedAt: new Date("2026-05-10T00:00:00.000Z"),
      entity: "health_logs",
      id: "abc",
    }),
  /Invalid expectedUpdatedAt/
);

console.log("unit-conflict passed");
