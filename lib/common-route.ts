import { ObjectId } from "mongodb";
import { ApiError } from "@/lib/api";

export function toObjectId(id: string) {
  if (!ObjectId.isValid(id)) throw new ApiError(400, "INVALID_ID", "Invalid id");
  return new ObjectId(id);
}
