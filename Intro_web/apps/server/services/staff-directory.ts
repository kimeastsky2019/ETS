import { eq } from "drizzle-orm";
import { getAuth } from "../_core/auth";
import { getDb } from "../_core/db";
import { env } from "../_core/env";
import { user } from "../db/schema";

export type StaffSeed = {
  username: string;
  name: string;
  email: string;
  password: string;
  role: "user" | "admin";
  department: string;
};

const STAFF_DEPARTMENTS = [
  "에너지진단팀",
  "에너지진단팀",
  "에너지진단팀",
  "ESCO사업팀",
  "ESCO사업팀",
  "신재생사업팀",
  "신재생사업팀",
  "데이터·디지털팀",
  "데이터·디지털팀",
  "경영지원팀"
];

/** ets00 ~ ets09 (직원 10명) + admin (관리자) = 계정 11개 */
export function staffRoster(): StaffSeed[] {
  const domain = env.STAFF_EMAIL_DOMAIN;
  const employees = STAFF_DEPARTMENTS.map((department, index) => {
    const username = `ets${String(index).padStart(2, "0")}`;
    return {
      username,
      name: `ETS 직원 ${String(index).padStart(2, "0")}`,
      email: `${username}@${domain}`,
      password: env.STAFF_DEFAULT_PASSWORD,
      role: "user" as const,
      department
    };
  });

  return [
    ...employees,
    {
      username: "admin",
      name: "ETS 관리자",
      email: `admin@${domain}`,
      password: env.STAFF_ADMIN_PASSWORD,
      role: "admin" as const,
      department: "경영지원팀"
    }
  ];
}

export type SeedOutcome = { username: string; email: string; created: boolean; role: string };

/**
 * Idempotent: creates any missing staff account through Better Auth (so the
 * password hash format always matches the running auth version), then stamps
 * username / memberType / role / department on the row.
 */
export class StaffPasswordMissingError extends Error {
  constructor() {
    super(
      "STAFF_DEFAULT_PASSWORD 와 STAFF_ADMIN_PASSWORD 를 주입해야 임직원 계정을 만들 수 있습니다. " +
        "코드에 기본 비밀번호를 두지 않습니다."
    );
    this.name = "StaffPasswordMissingError";
  }
}

export async function ensureStaffAccounts(): Promise<SeedOutcome[]> {
  if (!env.STAFF_DEFAULT_PASSWORD.trim() || !env.STAFF_ADMIN_PASSWORD.trim()) {
    throw new StaffPasswordMissingError();
  }

  const auth = getAuth();
  const db = getDb();
  const outcomes: SeedOutcome[] = [];

  for (const seed of staffRoster()) {
    const existing = await db.select().from(user).where(eq(user.email, seed.email)).limit(1);
    let created = false;

    if (!existing[0]) {
      await auth.api.signUpEmail({
        body: { name: seed.name, email: seed.email, password: seed.password }
      });
      created = true;
    }

    await db
      .update(user)
      .set({
        username: seed.username,
        displayUsername: seed.username,
        role: seed.role,
        memberType: "staff",
        department: seed.department,
        emailVerified: true,
        updatedAt: new Date()
      })
      .where(eq(user.email, seed.email));

    outcomes.push({ username: seed.username, email: seed.email, created, role: seed.role });
  }

  return outcomes;
}

export async function staffAccountCount(): Promise<number> {
  const rows = await getDb().select({ id: user.id }).from(user).where(eq(user.memberType, "staff"));
  return rows.length;
}
