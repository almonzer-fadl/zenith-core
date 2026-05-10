import { assertNoUpdateConflict } from "@/lib/conflict";
import { ApiError } from "@/lib/api";

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

try {
  assertNoUpdateConflict({
    expectedUpdatedAt: "2026-05-09T00:00:00.000Z",
    currentUpdatedAt: new Date("2026-05-10T00:00:00.000Z"),
    entity: "health_logs",
    id: "abc",
  });
  throw new Error("Expected conflict error");
} catch (error) {
  if (!(error instanceof ApiError)) {
    throw new Error("Expected ApiError for conflict");
  }
  if (error.code !== "CONFLICT_ERROR") {
    throw new Error(`Expected CONFLICT_ERROR, got ${error.code}`);
  }
  const details = error.details ?? {};
  if (!details.server_updated_at || !details.client_expected_updated_at || details.merge_result !== "server_wins") {
    throw new Error(`Conflict details missing expected fields: ${JSON.stringify(details)}`);
  }
}

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
