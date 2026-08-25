import { Hono, type Context } from "hono";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { apiFailure, apiSuccess } from "@repo/shared/http";
import { getDb } from "../_core/db";
import { adminRoute } from "../_core/route-helpers";
import { energyFactors } from "../db/schema";
import { staffRoute } from "../services/access";
import { invalidInput, toDatabaseFailure } from "../services/db-error";
import { ensureFactors, loadFactors } from "../services/energy-calc";
import { METRIC_LABELS, SECTORS, SECTOR_CODES, classifySector } from "../services/energy-taxonomy";
import { PlatformAIError } from "../services/platform-ai";
import {
  WIKI_TYPE_LABELS,
  askWiki,
  createWikiPage,
  deleteWikiPage,
  draftDiagnosisReport,
  extractWikiLinks,
  getWikiPage,
  lintWiki,
  listRevisions,
  listWikiPages,
  recommendMeasures,
  updateWikiPage,
  type WikiAcl,
  type WikiStatus,
  type WikiType
} from "../services/wiki";

export const wikiRouter = new Hono();

const WIKI_SCENE_KEY = "ets_wiki_qa";
const REPORT_SCENE_KEY = "ets_report_draft";

const WIKI_TYPES = [
  "source",
  "facility",
  "equipment",
  "measure",
  "metric",
  "regulation",
  "vendor",
  "diagnosis",
  "concept"
] as const;

const PageSchema = z.object({
  slug: z.string().trim().max(80).optional(),
  type: z.enum(WIKI_TYPES),
  title: z.string().trim().min(1).max(160),
  summary: z.string().trim().max(600).optional(),
  body: z.string().max(60000).optional(),
  tags: z.string().trim().max(200).optional(),
  acl: z.enum(["public", "internal", "confidential", "restricted"]).optional(),
  status: z.enum(["draft", "reviewed", "deprecated"]).optional(),
  sourceRef: z.string().trim().max(300).optional(),
  sector: z.enum(SECTOR_CODES as [string, ...string[]]).optional(),
  measurementBasis: z.enum(["measured", "estimated", "design", "documented"]).optional(),
  measurementPeriod: z.string().trim().max(60).optional(),
  confidence: z.enum(["high", "medium", "low"]).optional(),
  numericVerified: z.boolean().optional(),
  owner: z.string().trim().max(60).optional(),
  validUntil: z.string().trim().max(10).optional(),
  note: z.string().trim().max(200).optional()
});

function fail(c: Context, error: unknown) {
  if (error instanceof PlatformAIError) {
    return c.json(apiFailure(error.code, error.message), error.status as 400);
  }
  const failure = toDatabaseFailure(error);
  if (failure) return c.json(failure.body, failure.status);
  throw error;
}

/* ── 목록 / 검색 ───────────────────────────────────────────────────────── */

const listHandler = async (c: Context) => {
  try {
    const pages = await listWikiPages({
      type: (c.req.query("type") as WikiType) || undefined,
      status: (c.req.query("status") as WikiStatus) || undefined,
      sector: c.req.query("sector") || undefined,
      acl: (c.req.query("acl") as WikiAcl) || undefined,
      q: c.req.query("q") ?? undefined
    });
    return c.json(apiSuccess({ pages }), 200);
  } catch (error) {
    return fail(c, error);
  }
};

wikiRouter.get("", staffRoute, listHandler);
wikiRouter.get("/", staffRoute, listHandler);

/** 업종 택소노미 — 닫힌 집합이므로 프론트가 이 목록만 쓴다. */
wikiRouter.get("/taxonomy", staffRoute, (c) =>
  c.json(
    apiSuccess({
      sectors: SECTORS.map((sector) => ({
        code: sector.code,
        name: sector.name,
        ksic: sector.ksic,
        energySources: sector.energySources,
        keyEquipment: sector.keyEquipment,
        unitBasis: sector.unitBasis,
        notes: sector.notes,
        requiredMetrics: sector.requiredMetrics.map((metric) => ({ code: metric, label: METRIC_LABELS[metric] }))
      })),
      typeLabels: WIKI_TYPE_LABELS
    }),
    200
  )
);

/** 본문 어휘로 업종을 규칙 분류한다 (LLM 미사용, 재현 가능). */
wikiRouter.post("/classify", staffRoute, async (c) => {
  const parsed = z.object({ text: z.string().min(1).max(60000) }).safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json(invalidInput("분류할 본문이 필요합니다."), 400);
  return c.json(apiSuccess(classifySector(parsed.data.text)), 200);
});

wikiRouter.get("/lint", staffRoute, async (c) => {
  try {
    return c.json(apiSuccess({ report: await lintWiki() }), 200);
  } catch (error) {
    return fail(c, error);
  }
});

/* ── 환산계수 SSOT ─────────────────────────────────────────────────────── */

wikiRouter.get("/factors", staffRoute, async (c) => {
  try {
    await ensureFactors();
    const factors = await loadFactors();
    return c.json(apiSuccess({ factors: Object.values(factors) }), 200);
  } catch (error) {
    return fail(c, error);
  }
});

const FactorPatchSchema = z.object({
  value: z.number().finite().optional(),
  source: z.string().trim().max(300).optional(),
  validFrom: z.string().trim().max(10).optional(),
  validUntil: z.string().trim().max(10).optional(),
  verified: z.boolean().optional()
});

wikiRouter.patch("/factors/:code", staffRoute, async (c) => {
  const parsed = FactorPatchSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return c.json(invalidInput("변경할 항목이 없습니다."), 400);
  }

  try {
    const [updated] = await getDb()
      .update(energyFactors)
      .set({ ...parsed.data, updatedAt: new Date().toISOString() })
      .where(eq(energyFactors.code, c.req.param("code")))
      .returning();

    if (!updated) return c.json(apiFailure("NOT_FOUND", "계수를 찾을 수 없습니다."), 404);
    return c.json(apiSuccess({ factor: updated }), 200);
  } catch (error) {
    return fail(c, error);
  }
});

/* ── 질의응답 / 추천 / 보고서 초안 ─────────────────────────────────────── */

wikiRouter.post("/ask", staffRoute, async (c) => {
  const parsed = z
    .object({ question: z.string().trim().min(2).max(1000) })
    .safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json(invalidInput("질문을 입력해 주세요."), 400);

  try {
    return c.json(apiSuccess(await askWiki(parsed.data.question, WIKI_SCENE_KEY)), 200);
  } catch (error) {
    return fail(c, error);
  }
});

wikiRouter.post("/recommend", staffRoute, async (c) => {
  const parsed = z
    .object({
      sector: z.enum(SECTOR_CODES as [string, ...string[]]),
      equipment: z.array(z.string().trim().max(40)).max(20).optional()
    })
    .safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json(invalidInput("업종을 선택해 주세요."), 400);

  try {
    const candidates = await recommendMeasures({
      sector: parsed.data.sector,
      equipment: parsed.data.equipment ?? []
    });
    return c.json(apiSuccess({ candidates }), 200);
  } catch (error) {
    return fail(c, error);
  }
});

wikiRouter.post("/report-draft", staffRoute, async (c) => {
  const parsed = z
    .object({ diagnosisCode: z.string().trim().min(1).max(80) })
    .safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json(invalidInput("진단 건 코드가 필요합니다."), 400);

  try {
    const result = await draftDiagnosisReport(parsed.data.diagnosisCode, REPORT_SCENE_KEY);
    if (!result) return c.json(apiFailure("NOT_FOUND", "진단 건을 찾을 수 없습니다."), 404);
    if (result.withheld) {
      return c.json(
        apiFailure(
          "ACL_BLOCKED",
          "기밀(confidential) 이상 등급의 진단 건은 외부 모델로 전송할 수 없습니다. 등급을 조정하거나 사내 모델 경로가 준비된 뒤 사용하세요."
        ),
        403
      );
    }
    return c.json(apiSuccess(result), 200);
  } catch (error) {
    return fail(c, error);
  }
});

/* ── 문서 CRUD ─────────────────────────────────────────────────────────── */

const createHandler = async (c: Context) => {
  const parsed = PageSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json(invalidInput("위키 문서 입력값을 확인해 주세요."), 400);

  try {
    const profile = c.var.memberProfile;
    const page = await createWikiPage(c.var.currentUser.id, profile?.name ?? "", {
      ...parsed.data,
      type: parsed.data.type as WikiType
    });
    return c.json(apiSuccess({ page }), 200);
  } catch (error) {
    return fail(c, error);
  }
};

wikiRouter.post("", staffRoute, createHandler);
wikiRouter.post("/", staffRoute, createHandler);

wikiRouter.get("/:slug", staffRoute, async (c) => {
  try {
    const page = await getWikiPage(c.req.param("slug"));
    if (!page) return c.json(apiFailure("NOT_FOUND", "위키 문서를 찾을 수 없습니다."), 404);

    return c.json(
      apiSuccess({ page, links: extractWikiLinks(page.body), revisions: await listRevisions(page.id) }),
      200
    );
  } catch (error) {
    return fail(c, error);
  }
});

wikiRouter.patch("/:slug", staffRoute, async (c) => {
  const parsed = PageSchema.partial().safeParse(await c.req.json().catch(() => null));
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return c.json(invalidInput("변경할 항목이 없습니다."), 400);
  }

  try {
    const page = await updateWikiPage(c.req.param("slug"), c.var.currentUser.id, {
      ...parsed.data,
      type: parsed.data.type as WikiType | undefined
    });
    if (!page) return c.json(apiFailure("NOT_FOUND", "위키 문서를 찾을 수 없습니다."), 404);
    return c.json(apiSuccess({ page }), 200);
  } catch (error) {
    return fail(c, error);
  }
});

wikiRouter.delete("/:slug", adminRoute, async (c) => {
  try {
    const removed = await deleteWikiPage(c.req.param("slug"));
    if (!removed) return c.json(apiFailure("NOT_FOUND", "위키 문서를 찾을 수 없습니다."), 404);
    return c.json(apiSuccess({ slug: c.req.param("slug") }), 200);
  } catch (error) {
    return fail(c, error);
  }
});
