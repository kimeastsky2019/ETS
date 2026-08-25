import { eq } from "drizzle-orm";
import type { MiddlewareHandler } from "hono";
import { apiFailure } from "@repo/shared/http";
import { getDb } from "../_core/db";
import { user } from "../db/schema";

export type MemberType = "customer" | "staff";

export type MemberProfile = {
  id: string;
  name: string;
  email: string;
  username: string | null;
  role: "user" | "admin";
  memberType: MemberType;
  department: string | null;
  phone: string | null;
  emailVerified: boolean;
};

/**
 * withSession hydrates role/username from the DB, but memberType is an ETS
 * extension column — read it here whenever a handler needs the customer/staff
 * split. Falls back to "customer" so a row written before 004 still resolves.
 */
export async function getMemberProfile(userId: string): Promise<MemberProfile | null> {
  const rows = await getDb().select().from(user).where(eq(user.id, userId)).limit(1);
  const row = rows[0];
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    username: row.username ?? null,
    role: row.role === "admin" ? "admin" : "user",
    memberType: row.memberType === "staff" ? "staff" : "customer",
    department: row.department ?? null,
    phone: row.phone ?? null,
    emailVerified: Boolean(row.emailVerified)
  };
}

export function isStaff(profile: MemberProfile | null): boolean {
  return Boolean(profile && (profile.memberType === "staff" || profile.role === "admin"));
}

declare module "hono" {
  interface ContextVariableMap {
    memberProfile: MemberProfile;
  }
}

/**
 * Gate for employee-only APIs (LLM Wiki, request queues). Admins always pass.
 * Sets `c.var.memberProfile` for the handler.
 */
export const staffRoute: MiddlewareHandler = async (c, next) => {
  const sessionUser = c.var.user;
  if (!sessionUser) {
    return c.json(apiFailure("UNAUTHORIZED", "로그인이 필요합니다."), 401);
  }

  const profile = await getMemberProfile(sessionUser.id);
  if (!isStaff(profile)) {
    return c.json(apiFailure("FORBIDDEN", "임직원 전용 기능입니다."), 403);
  }

  c.set("currentUser", sessionUser);
  c.set("memberProfile", profile as MemberProfile);
  await next();
};
