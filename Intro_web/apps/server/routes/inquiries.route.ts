import { Hono, type Context } from "hono";
import { z } from "zod";
import { apiFailure, apiSuccess } from "@repo/shared/http";
import { protectedRoute, publicRoute } from "../_core/route-helpers";
import { staffRoute } from "../services/access";
import { invalidInput, toDatabaseFailure } from "../services/db-error";
import { createInquiry, listInquiries, listMyInquiries, updateInquiry } from "../services/requests";

export const inquiriesRouter = new Hono();

const InquirySchema = z.object({
  type: z.string().trim().min(1).max(40),
  name: z.string().trim().min(1).max(40),
  company: z.string().trim().max(80).optional(),
  phone: z.string().trim().max(20).optional(),
  email: z.string().trim().email(),
  message: z.string().trim().min(5).max(4000),
  privacyAgreed: z.literal(true)
});

const UpdateSchema = z.object({
  status: z.enum(["received", "handling", "done"]).optional(),
  assigneeId: z.string().trim().max(64).nullable().optional(),
  staffMemo: z.string().trim().max(2000).optional()
});

function fail(c: Context, error: unknown) {
  const failure = toDatabaseFailure(error);
  if (failure) return c.json(failure.body, failure.status);
  throw error;
}

/** 비회원도 문의는 남길 수 있다. 로그인 상태면 마이페이지에서 추적된다. */
const createHandler = async (c: Context) => {
  const parsed = InquirySchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json(invalidInput("문의 내용을 다시 확인해 주세요."), 400);
  }

  const { type, name, company, phone, email, message } = parsed.data;

  try {
    return c.json(
      apiSuccess({
        inquiry: await createInquiry(c.var.user?.id ?? null, { type, name, company, phone, email, message })
      }),
      200
    );
  } catch (error) {
    return fail(c, error);
  }
};

inquiriesRouter.post("", publicRoute, createHandler);
inquiriesRouter.post("/", publicRoute, createHandler);

inquiriesRouter.get("/mine", protectedRoute, async (c) => {
  try {
    return c.json(apiSuccess({ inquiries: await listMyInquiries(c.var.currentUser.id) }), 200);
  } catch (error) {
    return fail(c, error);
  }
});

const staffListHandler = async (c: Context) => {
  const status = c.req.query("status") as "received" | "handling" | "done" | undefined;
  try {
    return c.json(apiSuccess({ inquiries: await listInquiries(status || undefined) }), 200);
  } catch (error) {
    return fail(c, error);
  }
};

inquiriesRouter.get("", staffRoute, staffListHandler);
inquiriesRouter.get("/", staffRoute, staffListHandler);

inquiriesRouter.patch("/:id", staffRoute, async (c) => {
  const parsed = UpdateSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return c.json(invalidInput("변경할 항목이 없습니다."), 400);
  }

  try {
    const inquiry = await updateInquiry(c.req.param("id"), parsed.data);
    if (!inquiry) {
      return c.json(apiFailure("NOT_FOUND", "문의 건을 찾을 수 없습니다."), 404);
    }
    return c.json(apiSuccess({ inquiry }), 200);
  } catch (error) {
    return fail(c, error);
  }
});
