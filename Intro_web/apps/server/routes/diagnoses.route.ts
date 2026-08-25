import { Hono, type Context } from "hono";
import { z } from "zod";
import { apiFailure, apiSuccess } from "@repo/shared/http";
import { staffRoute } from "../services/access";
import { invalidInput, toDatabaseFailure } from "../services/db-error";
import { SECTOR_CODES } from "../services/energy-taxonomy";
import {
  addDiagnosisMeasure,
  coverageGaps,
  createDiagnosis,
  findSimilarDiagnoses,
  getDiagnosis,
  listDiagnoses,
  listDiagnosisMeasures,
  removeDiagnosisMeasure,
  sectorBenchmark,
  updateDiagnosis
} from "../services/diagnoses";

export const diagnosesRouter = new Hono();

const SectorEnum = z.enum(SECTOR_CODES as [string, ...string[]]);

const DiagnosisSchema = z.object({
  code: z.string().trim().max(80).optional(),
  facilityName: z.string().trim().min(1).max(120),
  sector: SectorEnum,
  region: z.string().trim().max(40).optional(),
  auditYear: z.number().int().min(1990).max(2100).optional(),
  unitBasisValue: z.number().min(0).optional(),
  unitBasisNote: z.string().trim().max(80).optional(),
  annualElectricityKwh: z.number().min(0).optional(),
  annualFuelToe: z.number().min(0).optional(),
  measurementBasis: z.enum(["measured", "estimated", "design", "documented"]).optional(),
  measurementPeriod: z.string().trim().max(60).optional(),
  acl: z.enum(["public", "internal", "confidential", "restricted"]).optional(),
  wikiSlug: z.string().trim().max(80).optional(),
  equipmentTags: z.string().trim().max(200).optional(),
  note: z.string().trim().max(2000).optional()
});

const MeasureSchema = z.object({
  measureSlug: z.string().trim().min(1).max(80),
  savingKwh: z.number().min(0).optional(),
  savingToe: z.number().min(0).optional(),
  investmentKrw: z.number().min(0).optional(),
  annualSavingKrw: z.number().min(0).optional(),
  adopted: z.boolean().optional(),
  adoptionNote: z.string().trim().max(400).optional()
});

function fail(c: Context, error: unknown) {
  const failure = toDatabaseFailure(error);
  if (failure) return c.json(failure.body, failure.status);
  throw error;
}

/* ── 목록 / 등록 ───────────────────────────────────────────────────────── */

const listHandler = async (c: Context) => {
  try {
    const year = Number(c.req.query("year"));
    const rows = await listDiagnoses({
      sector: c.req.query("sector") || undefined,
      year: Number.isFinite(year) && year > 0 ? year : undefined
    });
    return c.json(apiSuccess({ diagnoses: rows }), 200);
  } catch (error) {
    return fail(c, error);
  }
};

diagnosesRouter.get("", staffRoute, listHandler);
diagnosesRouter.get("/", staffRoute, listHandler);

const createHandler = async (c: Context) => {
  const parsed = DiagnosisSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json(invalidInput("진단 건 입력값을 확인해 주세요."), 400);

  try {
    return c.json(apiSuccess(await createDiagnosis(c.var.currentUser.id, parsed.data)), 200);
  } catch (error) {
    return fail(c, error);
  }
};

diagnosesRouter.post("", staffRoute, createHandler);
diagnosesRouter.post("/", staffRoute, createHandler);

/* ── 유사 사례 (UC1) · 벤치마크 (UC4) ──────────────────────────────────── */

diagnosesRouter.post("/similar", staffRoute, async (c) => {
  const parsed = z
    .object({
      sector: SectorEnum,
      unitBasisValue: z.number().min(0).optional(),
      equipment: z.array(z.string().trim().max(40)).max(20).optional()
    })
    .safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json(invalidInput("업종을 선택해 주세요."), 400);

  try {
    return c.json(apiSuccess({ matches: await findSimilarDiagnoses(parsed.data) }), 200);
  } catch (error) {
    return fail(c, error);
  }
});

diagnosesRouter.get("/benchmark", staffRoute, async (c) => {
  const sector = c.req.query("sector") ?? "";
  if (!SECTOR_CODES.includes(sector)) return c.json(invalidInput("업종 코드가 올바르지 않습니다."), 400);

  const target = Number(c.req.query("intensity"));

  try {
    const report = await sectorBenchmark(sector, Number.isFinite(target) && target > 0 ? target : undefined);
    return c.json(apiSuccess({ report }), 200);
  } catch (error) {
    return fail(c, error);
  }
});

/* ── 상세 ──────────────────────────────────────────────────────────────── */

diagnosesRouter.get("/:code", staffRoute, async (c) => {
  try {
    const diagnosis = await getDiagnosis(c.req.param("code"));
    if (!diagnosis) return c.json(apiFailure("NOT_FOUND", "진단 건을 찾을 수 없습니다."), 404);

    return c.json(
      apiSuccess({
        diagnosis,
        measures: await listDiagnosisMeasures(diagnosis.id),
        gaps: coverageGaps(diagnosis)
      }),
      200
    );
  } catch (error) {
    return fail(c, error);
  }
});

diagnosesRouter.patch("/:code", staffRoute, async (c) => {
  const parsed = DiagnosisSchema.partial().safeParse(await c.req.json().catch(() => null));
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return c.json(invalidInput("변경할 항목이 없습니다."), 400);
  }

  try {
    const result = await updateDiagnosis(c.req.param("code"), parsed.data);
    if (!result) return c.json(apiFailure("NOT_FOUND", "진단 건을 찾을 수 없습니다."), 404);
    return c.json(apiSuccess(result), 200);
  } catch (error) {
    return fail(c, error);
  }
});

/* ── 개선안 실적 ───────────────────────────────────────────────────────── */

diagnosesRouter.post("/:code/measures", staffRoute, async (c) => {
  const parsed = MeasureSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json(invalidInput("개선안 입력값을 확인해 주세요."), 400);

  try {
    const diagnosis = await getDiagnosis(c.req.param("code"));
    if (!diagnosis) return c.json(apiFailure("NOT_FOUND", "진단 건을 찾을 수 없습니다."), 404);

    return c.json(apiSuccess(await addDiagnosisMeasure(diagnosis.id, parsed.data)), 200);
  } catch (error) {
    return fail(c, error);
  }
});

diagnosesRouter.delete("/:code/measures/:id", staffRoute, async (c) => {
  try {
    await removeDiagnosisMeasure(c.req.param("id"));
    return c.json(apiSuccess({ id: c.req.param("id") }), 200);
  } catch (error) {
    return fail(c, error);
  }
});
