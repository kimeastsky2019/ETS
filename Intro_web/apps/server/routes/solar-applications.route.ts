import { Hono, type Context } from "hono";
import { z } from "zod";
import { apiFailure, apiSuccess } from "@repo/shared/http";
import { protectedRoute } from "../_core/route-helpers";
import { staffRoute } from "../services/access";
import { invalidInput, toDatabaseFailure } from "../services/db-error";
import {
  createSolarApplication,
  listMySolarApplications,
  listSolarApplications,
  updateSolarApplication,
  type SolarStatus
} from "../services/requests";

export const solarApplicationsRouter = new Hono();

const ApplicationSchema = z.object({
  applicantName: z.string().trim().min(1).max(40),
  phone: z.string().trim().min(8).max(20),
  email: z.string().trim().email(),
  postalCode: z.string().trim().max(10).optional(),
  address: z.string().trim().min(2).max(200),
  buildingType: z.enum(["apartment", "villa", "officetel", "house", "etc"]),
  balconyDirection: z.enum(["south", "southeast", "southwest", "east", "west", "north", "unknown"]),
  balconyWidth: z.string().trim().max(40).optional(),
  monthlyBill: z.number().int().min(0).max(10000000).optional(),
  packageId: z.string().trim().max(40).optional(),
  packageName: z.string().trim().max(80).optional(),
  quantity: z.number().int().min(1).max(20).optional(),
  visitPreference: z.string().trim().max(80).optional(),
  note: z.string().trim().max(2000).optional(),
  privacyAgreed: z.literal(true)
});

const UpdateSchema = z.object({
  status: z.enum(["received", "reviewing", "surveying", "quoted", "closed"]).optional(),
  assigneeId: z.string().trim().max(64).nullable().optional(),
  staffMemo: z.string().trim().max(2000).optional()
});

function fail(c: Context, error: unknown) {
  const failure = toDatabaseFailure(error);
  if (failure) return c.json(failure.body, failure.status);
  throw error;
}

const createHandler = async (c: Context) => {
  const parsed = ApplicationSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json(invalidInput("신청 정보를 다시 확인해 주세요. (개인정보 수집 동의 포함)"), 400);
  }

  try {
    const application = await createSolarApplication(c.var.currentUser.id, parsed.data);
    return c.json(apiSuccess({ application }), 200);
  } catch (error) {
    return fail(c, error);
  }
};

solarApplicationsRouter.post("", protectedRoute, createHandler);
solarApplicationsRouter.post("/", protectedRoute, createHandler);

solarApplicationsRouter.get("/mine", protectedRoute, async (c) => {
  try {
    return c.json(apiSuccess({ applications: await listMySolarApplications(c.var.currentUser.id) }), 200);
  } catch (error) {
    return fail(c, error);
  }
});

const staffListHandler = async (c: Context) => {
  const statusParam = c.req.query("status") as SolarStatus | undefined;
  try {
    return c.json(apiSuccess({ applications: await listSolarApplications(statusParam || undefined) }), 200);
  } catch (error) {
    return fail(c, error);
  }
};

solarApplicationsRouter.get("", staffRoute, staffListHandler);
solarApplicationsRouter.get("/", staffRoute, staffListHandler);

solarApplicationsRouter.patch("/:id", staffRoute, async (c) => {
  const parsed = UpdateSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return c.json(invalidInput("변경할 항목이 없습니다."), 400);
  }

  try {
    const application = await updateSolarApplication(c.req.param("id"), parsed.data);
    if (!application) {
      return c.json(apiFailure("NOT_FOUND", "신청 건을 찾을 수 없습니다."), 404);
    }
    return c.json(apiSuccess({ application }), 200);
  } catch (error) {
    return fail(c, error);
  }
});
