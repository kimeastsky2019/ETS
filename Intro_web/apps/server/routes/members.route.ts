import { Hono } from "hono";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { apiFailure, apiSuccess } from "@repo/shared/http";
import { getDb } from "../_core/db";
import { adminRoute, protectedRoute, publicRoute } from "../_core/route-helpers";
import { user } from "../db/schema";
import { getMemberProfile } from "../services/access";
import { toDatabaseFailure, invalidInput } from "../services/db-error";
import { seedStarterContent } from "../services/content-seed";
import { seedWikiStarter } from "../services/wiki-seed";
import {
  StaffPasswordMissingError,
  ensureStaffAccounts,
  staffAccountCount,
  staffRoster
} from "../services/staff-directory";

export const membersRouter = new Hono();

/** 로그인한 사용자의 통합 프로필(고객/직원 구분 포함). */
membersRouter.get("/me", protectedRoute, async (c) => {
  try {
    const profile = await getMemberProfile(c.var.currentUser.id);
    if (!profile) {
      return c.json(apiFailure("NOT_FOUND", "회원 정보를 찾을 수 없습니다."), 404);
    }
    return c.json(apiSuccess({ profile }), 200);
  } catch (error) {
    const failure = toDatabaseFailure(error);
    if (failure) return c.json(failure.body, failure.status);
    throw error;
  }
});

/**
 * 임직원 계정(ets00~ets09 + admin) 최초 생성.
 * 직원 계정이 하나도 없을 때만 열려 있고, 그 뒤에는 관리자만 재실행할 수 있다.
 */

membersRouter.post("/bootstrap", publicRoute, async (c) => {
  try {
    const existing = await staffAccountCount();
    if (existing > 0 && c.var.user?.role !== "admin") {
      return c.json(
        apiFailure("FORBIDDEN", "임직원 계정이 이미 생성되어 있습니다. 관리자만 재실행할 수 있습니다."),
        403
      );
    }

    const accounts = await ensureStaffAccounts();

    // 초기 콘텐츠(블로그·쇼츠, 위키 예시)의 작성자는 admin 계정으로 남긴다.
    const adminRow = await getDb().select({ id: user.id }).from(user).where(eq(user.username, "admin")).limit(1);
    const adminId = adminRow[0]?.id ?? "system";
    const content = await seedStarterContent(adminId);
    const wiki = await seedWikiStarter(adminId);

    return c.json(apiSuccess({ accounts, seeded: { ...content, ...wiki } }), 200);
  } catch (error) {
    if (error instanceof StaffPasswordMissingError) {
      return c.json(apiFailure("STAFF_PASSWORD_MISSING", error.message), 503);
    }
    const failure = toDatabaseFailure(error);
    if (failure) return c.json(failure.body, failure.status);
    throw error;
  }
});

/** 부트스트랩 상태 확인 (로그인 화면에서 안내 문구용). */
membersRouter.get("/bootstrap", publicRoute, async (c) => {
  try {
    return c.json(
      apiSuccess({ staffCount: await staffAccountCount(), expected: staffRoster().length }),
      200
    );
  } catch (error) {
    const failure = toDatabaseFailure(error);
    if (failure) return c.json(failure.body, failure.status);
    throw error;
  }
});

const UpdateMemberSchema = z.object({
  memberType: z.enum(["customer", "staff"]).optional(),
  role: z.enum(["user", "admin"]).optional(),
  department: z.string().trim().max(60).optional()
});

membersRouter.get("/", adminRoute, async (c) => {
  try {
    const rows = await getDb()
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
        memberType: user.memberType,
        department: user.department,
        createdAt: user.createdAt
      })
      .from(user)
      .orderBy(desc(user.createdAt));

    return c.json(apiSuccess({ members: rows }), 200);
  } catch (error) {
    const failure = toDatabaseFailure(error);
    if (failure) return c.json(failure.body, failure.status);
    throw error;
  }
});

membersRouter.patch("/:id", adminRoute, async (c) => {
  const parsed = UpdateMemberSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return c.json(invalidInput("변경할 항목이 없습니다."), 400);
  }

  try {
    await getDb()
      .update(user)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(user.id, c.req.param("id")));

    return c.json(apiSuccess({ profile: await getMemberProfile(c.req.param("id")) }), 200);
  } catch (error) {
    const failure = toDatabaseFailure(error);
    if (failure) return c.json(failure.body, failure.status);
    throw error;
  }
});

