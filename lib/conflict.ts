import { ApiError } from "@/lib/api";

export function assertNoUpdateConflict(args: {
  expectedUpdatedAt?: string;
  currentUpdatedAt?: Date | null;
  entity: string;
  id: string;
}) {
  if (!args.expectedUpdatedAt) return;
  if (!args.currentUpdatedAt) return;

  const expected = new Date(args.expectedUpdatedAt);
  if (Number.isNaN(expected.getTime())) {
    throw new ApiError(400, "VALIDATION_ERROR", "Invalid expectedUpdatedAt");
  }

  if (expected.getTime() !== args.currentUpdatedAt.getTime()) {
    throw new ApiError(409, "CONFLICT_ERROR", "Update conflict detected", {
      entity: args.entity,
      id: args.id,
      server_updated_at: args.currentUpdatedAt.toISOString(),
      client_expected_updated_at: expected.toISOString(),
      merge_result: "server_wins",
    });
  }
}
