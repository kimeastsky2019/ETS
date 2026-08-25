import { apiFailure } from "@repo/shared/http";
import { DatabaseError } from "../_core/db";

export function databaseStatus(error: DatabaseError) {
  if (error.status === 404) return 404;
  if (error.status === 503) return 503;
  return 502;
}

/** Returns an envelope + status pair for a caught error, or null to rethrow. */
export function toDatabaseFailure(error: unknown) {
  if (error instanceof DatabaseError) {
    return { body: apiFailure(error.code, error.message), status: databaseStatus(error) } as const;
  }
  return null;
}

export function invalidInput(message: string) {
  return apiFailure("INVALID_INPUT", message);
}
