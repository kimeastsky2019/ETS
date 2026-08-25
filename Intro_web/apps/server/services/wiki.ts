import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../_core/db";
import { diagnoses, energyFactors, wikiPages, wikiRevisions } from "../db/schema";
import { requestPlatformAIChat } from "./platform-ai";
import { getSector, missingMetrics } from "./energy-taxonomy";
import { scoreDocuments } from "./wiki-search";

export type WikiType =
  | "source"
  | "facility"
  | "equipment"
  | "measure"
  | "metric"
  | "regulation"
  | "vendor"
  | "diagnosis"
  | "concept";

export type WikiStatus = "draft" | "reviewed" | "deprecated";
export type WikiAcl = "public" | "internal" | "confidential" | "restricted";

export const WIKI_TYPE_LABELS: Record<WikiType, string> = {
  source: "원문 요약",
  facility: "사업장",
  equipment: "설비",
  measure: "개선안(ECM)",
  metric: "원단위·지표",
  regulation: "법규·계수",
  vendor: "공급사",
  diagnosis: "진단 건",
  concept: "인사이트"
};

/** ACL 서열. 숫자가 클수록 민감하다 (기획서 P5). */
export const ACL_RANK: Record<WikiAcl, number> = {
  public: 0,
  internal: 1,
  confidential: 2,
  restricted: 3
};

/** 외부 모델(Platform AI) 경로에 실어도 되는 등급. confidential 이상은 나가지 않는다. */
export const EXTERNAL_SAFE_ACL: WikiAcl[] = ["public", "internal"];

/** 수치 검산이 의미 있는 타입 — 여기서 numericVerified 가 false 면 인용을 막는다. */
const NUMERIC_TYPES: WikiType[] = ["measure", "metric", "diagnosis"];

export type WikiInput = {
  slug?: string;
  type: WikiType;
  title: string;
  summary?: string;
  body?: string;
  tags?: string;
  acl?: WikiAcl;
  status?: WikiStatus;
  sourceRef?: string;
  sector?: string;
  measurementBasis?: "measured" | "estimated" | "design" | "documented";
  measurementPeriod?: string;
  confidence?: "high" | "medium" | "low";
  numericVerified?: boolean;
  owner?: string;
  validUntil?: string;
};

function slugify(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9가-힣\s-]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 80) || `page-${Date.now()}`
  );
}

/** 본문 변경 감지용 해시 (front-matter 의 content_hash 대응). */
function contentHash(body: string) {
  let hash = 5381;
  for (let index = 0; index < body.length; index += 1) {
    hash = ((hash << 5) + hash + body.charCodeAt(index)) >>> 0;
  }
  return `djb2:${hash.toString(16)}`;
}

/**
 * 본문에 "값 + 단위" 형태의 수치 주장이 있는가.
 * 단위가 숫자에 붙어 있는 경우만 인정한다 — '남원시'의 '원', '2015년'의 '년' 같은
 * 오탐을 막기 위해 단위 뒤에 한글이 이어지면 단위로 보지 않는다.
 * (LLMwiki `kb/ontology.py` 의 QTY 정규식과 같은 판정 규칙)
 */
const NUMERIC_UNITS = [
  "kWh/y", "kWh", "kW", "MWh", "toe", "tCO2eq", "tCO₂eq", "Gcal", "kcal/kg",
  "t/h", "kg/h", "㎥/min", "원/kWh", "원/kg", "천원", "h/y", "h/d", "㎡", "톤/일", "t/일"
];

const NUMERIC_CLAIM = new RegExp(
  "\\d[\\d,]*\\.?\\d*\\s*(" +
    NUMERIC_UNITS.map((unit) => unit.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") +
    ")(?![가-힣A-Za-z0-9])"
);

// '년'은 대부분 연도(식별자)라 그대로 두면 오탐이 난다. 회수기간처럼 기간을 뜻하는
// 1~3자리(또는 소수) 표기만 수치 주장으로 본다. (kb/ontology.py 의 year 차원 제외와 같은 취지)
const DURATION_CLAIM = /(?<!\d)\d{1,3}(\.\d+)?\s*년(?![가-힣A-Za-z0-9])/;

export function hasNumericClaim(body: string): boolean {
  const text = body || "";
  return NUMERIC_CLAIM.test(text) || DURATION_CLAIM.test(text);
}

/** 본문의 [[링크]] 추출. */
export function extractWikiLinks(body: string): string[] {
  const links = new Set<string>();
  for (const match of body.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)) {
    const target = match[1]?.trim();
    if (target) links.add(target);
  }
  return [...links];
}

export async function listWikiPages(
  options: { type?: WikiType; status?: WikiStatus; sector?: string; acl?: WikiAcl; q?: string } = {}
) {
  const db = getDb();
  const filters = [];
  if (options.type) filters.push(eq(wikiPages.type, options.type));
  if (options.status) filters.push(eq(wikiPages.status, options.status));
  if (options.sector) filters.push(eq(wikiPages.sector, options.sector));
  if (options.acl) filters.push(eq(wikiPages.acl, options.acl));

  const query = db.select().from(wikiPages);
  const rows = filters.length
    ? await query.where(and(...filters)).orderBy(desc(wikiPages.updatedAt))
    : await query.orderBy(desc(wikiPages.updatedAt));

  const q = options.q?.trim();
  if (!q) return rows;

  // BM25 랭킹. 제목·요약·태그에 가중치를 준다.
  return scoreDocuments(
    rows.map((page) => ({
      item: page,
      fields: [
        { text: page.title, weight: 3 },
        { text: page.summary, weight: 2 },
        { text: page.tags, weight: 2 },
        { text: page.slug, weight: 2 },
        { text: page.body, weight: 1 }
      ]
    })),
    q
  ).map((hit) => hit.item);
}

export async function getWikiPage(slug: string) {
  const rows = await getDb().select().from(wikiPages).where(eq(wikiPages.slug, slug)).limit(1);
  return rows[0] ?? null;
}

export async function createWikiPage(ownerId: string, ownerName: string, input: WikiInput) {
  const now = new Date().toISOString();
  const body = input.body ?? "";

  const [created] = await getDb()
    .insert(wikiPages)
    .values({
      slug: slugify(input.slug || input.title),
      type: input.type,
      title: input.title,
      summary: input.summary ?? "",
      body,
      tags: input.tags ?? "",
      acl: input.acl ?? "internal",
      status: input.status ?? "draft",
      sourceRef: input.sourceRef ?? "",
      ownerId,
      version: 1,
      sector: input.sector ?? "other",
      measurementBasis: input.measurementBasis ?? "documented",
      measurementPeriod: input.measurementPeriod ?? "",
      confidence: input.confidence ?? "medium",
      numericVerified: input.numericVerified ?? false,
      owner: input.owner || ownerName,
      validUntil: input.validUntil ?? "",
      contentHash: contentHash(body),
      ingestedBy: "human",
      ingestedAt: now,
      pipelineVersion: "wiki-v2",
      createdAt: now,
      updatedAt: now
    })
    .returning();

  await getDb().insert(wikiRevisions).values({
    pageId: created.id,
    version: 1,
    title: created.title,
    body: created.body,
    note: "최초 작성",
    editorId: ownerId,
    createdAt: now
  });

  return created;
}

export async function updateWikiPage(slug: string, editorId: string, input: Partial<WikiInput> & { note?: string }) {
  const db = getDb();
  const current = await getWikiPage(slug);
  if (!current) return null;

  const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  const fields = [
    "type",
    "title",
    "summary",
    "body",
    "tags",
    "acl",
    "status",
    "sourceRef",
    "sector",
    "measurementBasis",
    "measurementPeriod",
    "confidence",
    "numericVerified",
    "owner",
    "validUntil"
  ] as const;

  for (const key of fields) {
    if (input[key] !== undefined) patch[key] = input[key];
  }

  const bodyChanged = input.body !== undefined && input.body !== current.body;
  if (bodyChanged) {
    patch.contentHash = contentHash(input.body as string);
    // 본문이 바뀌면 이전 검산 결과는 더 이상 유효하지 않다 (P2).
    if (input.numericVerified === undefined) patch.numericVerified = false;
  }

  const nextVersion = bodyChanged ? current.version + 1 : current.version;
  patch.version = nextVersion;

  const [updated] = await db.update(wikiPages).set(patch).where(eq(wikiPages.id, current.id)).returning();

  if (bodyChanged) {
    await db.insert(wikiRevisions).values({
      pageId: current.id,
      version: nextVersion,
      title: updated.title,
      body: updated.body,
      note: input.note ?? "",
      editorId,
      createdAt: new Date().toISOString()
    });
  }

  return updated;
}

export async function deleteWikiPage(slug: string) {
  const page = await getWikiPage(slug);
  if (!page) return false;
  const db = getDb();
  await db.delete(wikiRevisions).where(eq(wikiRevisions.pageId, page.id));
  await db.delete(wikiPages).where(eq(wikiPages.id, page.id));
  return true;
}

export async function listRevisions(pageId: string) {
  return getDb().select().from(wikiRevisions).where(eq(wikiRevisions.pageId, pageId)).orderBy(desc(wikiRevisions.version));
}

/* ── Lint (기획서 6.3) ─────────────────────────────────────────────────── */

export type LintIssue = {
  rule: string;
  category: "스키마" | "링크" | "보안" | "도메인" | "식별";
  severity: "block" | "warn";
  slug: string;
  title: string;
  detail: string;
};

export type LintReport = {
  total: number;
  reviewed: number;
  drafts: number;
  deprecated: number;
  confidential: number;
  blocking: number;
  warnings: number;
  issues: LintIssue[];
  checkedAt: string;
};

/**
 * 코드 레벨 무결성 검사. LLM 판단에 의존하지 않는다.
 * `block` 은 서비스 인용/배포를 막는 등급이다.
 */
export async function lintWiki(): Promise<LintReport> {
  const db = getDb();
  const pages = await db.select().from(wikiPages);
  const factors = await db.select().from(energyFactors);
  const issues: LintIssue[] = [];
  const today = new Date().toISOString().slice(0, 10);
  const soon = new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString().slice(0, 10);

  const bySlug = new Map(pages.map((page) => [page.slug.toLowerCase(), page]));
  const byTitle = new Map(pages.map((page) => [page.title.trim().toLowerCase(), page]));
  const referenced = new Set<string>();

  const resolve = (target: string) =>
    bySlug.get(target.toLowerCase()) ?? byTitle.get(target.trim().toLowerCase()) ?? null;

  for (const page of pages) {
    const add = (rule: string, category: LintIssue["category"], severity: LintIssue["severity"], detail: string) =>
      issues.push({ rule, category, severity, slug: page.slug, title: page.title, detail });

    // 1. 데이터 컨트랙트 필수 필드
    if (!page.summary.trim()) add("summary-missing", "스키마", "warn", "요약이 비어 있어 검색·AI 근거로 쓸 수 없습니다.");
    if (!page.sourceRef.trim()) add("source-missing", "스키마", "warn", "출처(source_span)가 없습니다. 원문 추적이 불가능합니다.");
    if (!page.owner.trim()) add("owner-missing", "스키마", "warn", "담당자(owner)가 지정되지 않았습니다.");

    // 2. 링크 무결성 + 3. ACL 상속
    for (const target of extractWikiLinks(page.body)) {
      const linked = resolve(target);
      if (!linked) {
        add("broken-link", "링크", "warn", `대상이 없는 링크 [[${target}]]`);
        continue;
      }
      referenced.add(linked.slug);

      if (ACL_RANK[linked.acl as WikiAcl] > ACL_RANK[page.acl as WikiAcl]) {
        add(
          "acl-inheritance",
          "보안",
          "block",
          `${page.acl} 문서가 더 민감한 ${linked.acl} 문서 [[${linked.slug}]] 를 참조합니다. 등급을 올리거나 링크를 제거하세요.`
        );
      }
    }

    // 4. 수치 검산 — 본문에 실제 수치 주장이 있을 때만 건다.
    //    (ECM 카드처럼 값은 진단 건에서 오고 조건만 서술한 문서는 검산 대상이 아니다)
    if (NUMERIC_TYPES.includes(page.type as WikiType) && hasNumericClaim(page.body) && !page.numericVerified) {
      add(
        "numeric-unverified",
        "도메인",
        "block",
        "본문에 수치 주장이 있는데 검산을 통과하지 않았습니다. 서비스 응답에 인용되지 않습니다."
      );
    }

    // 5. 단위 혼용
    const usesLegacyHeat = /(gcal|kcal|Mcal)/i.test(page.body);
    if (usesLegacyHeat && !/toe/i.test(page.body)) {
      add("unit-mixed", "도메인", "warn", "Gcal/kcal 표기에 toe 환산이 병기되어 있지 않습니다.");
    }

    // 6. 법규 유효기간
    if (page.type === "regulation") {
      if (!page.validUntil) add("validity-missing", "도메인", "warn", "법규·계수 문서에 유효기간이 없습니다.");
      else if (page.validUntil < today) add("validity-expired", "도메인", "block", `유효기간이 지났습니다 (~${page.validUntil}).`);
      else if (page.validUntil < soon) add("validity-soon", "도메인", "warn", `유효기간 만료가 임박했습니다 (~${page.validUntil}).`);
    }

    // 7. 업종 커버리지 갭
    if ((page.type === "diagnosis" || page.type === "facility") && page.sector !== "other") {
      const missing = missingMetrics(page.sector, `${page.summary}\n${page.body}`);
      if (missing.length) {
        add(
          "metric-coverage",
          "도메인",
          "warn",
          `${getSector(page.sector).name} 필수지표 누락: ${missing.map((metric) => metric.label).join(", ")}`
        );
      }
    }
  }

  // 8. 고아 페이지
  for (const page of pages) {
    if (page.type === "source" || page.status === "deprecated") continue;
    if (!referenced.has(page.slug) && !extractWikiLinks(page.body).length) {
      issues.push({
        rule: "orphan",
        category: "링크",
        severity: "warn",
        slug: page.slug,
        title: page.title,
        detail: "참조도 없고 참조하지도 않는 고아 페이지입니다. 인덱스에 연결하거나 폐기하세요."
      });
    }
  }

  // 9. 미검증 환산계수 (전역)
  for (const factor of factors.filter((item) => !item.verified)) {
    issues.push({
      rule: "factor-unverified",
      category: "도메인",
      severity: "block",
      slug: `factor:${factor.code}`,
      title: factor.label,
      detail: `기본값 ${factor.value} ${factor.unit} 이 고시 원문으로 확인되지 않았습니다. 이 계수를 쓴 계산은 전부 미검증입니다.`
    });
  }

  return {
    total: pages.length,
    reviewed: pages.filter((page) => page.status === "reviewed").length,
    drafts: pages.filter((page) => page.status === "draft").length,
    deprecated: pages.filter((page) => page.status === "deprecated").length,
    confidential: pages.filter((page) => ACL_RANK[page.acl as WikiAcl] >= 2).length,
    blocking: issues.filter((issue) => issue.severity === "block").length,
    warnings: issues.filter((issue) => issue.severity === "warn").length,
    issues,
    checkedAt: new Date().toISOString()
  };
}

/* ── Q&A (UC5) ─────────────────────────────────────────────────────────── */

export type AskResult = {
  answer: string;
  sources: Array<{ slug: string; title: string; type: string; status: string; acl: string; numericVerified: boolean }>;
  withheld: number;
  route: "external" | "none";
};

/**
 * 위키 근거 기반 질의응답.
 * P5: confidential 이상 문서는 컨텍스트에서 제외하고, 제외 건수를 사용자에게 알린다.
 * P2: 미검증(numericVerified=false) 수치는 인용 금지를 프롬프트로 강제한다.
 */
export async function askWiki(question: string, sceneKey: string): Promise<AskResult> {
  const pages = await getDb().select().from(wikiPages);
  const usable = pages.filter(
    (page) => EXTERNAL_SAFE_ACL.includes(page.acl as WikiAcl) && page.status !== "deprecated"
  );
  const withheld = pages.length - usable.length;

  const ranked = scoreDocuments(
    usable.map((page) => ({
      item: page,
      fields: [
        { text: page.title, weight: 3 },
        { text: page.summary, weight: 2 },
        { text: page.tags, weight: 2 },
        { text: page.body, weight: 1 }
      ]
    })),
    question
  ).slice(0, 5);

  if (!ranked.length) {
    return {
      answer:
        withheld > 0
          ? `외부 모델로 보낼 수 있는 문서 중에는 근거가 없습니다. (기밀 등급 ${withheld}건은 검색 대상에서 제외되었습니다.)`
          : "위키에서 근거가 되는 문서를 찾지 못했습니다. 관련 문서를 먼저 등록하거나 검색어를 바꿔 주세요.",
      sources: [],
      withheld,
      route: "none"
    };
  }

  const context = ranked
    .map(({ item }) => {
      const flags = [
        `type=${item.type}`,
        `status=${item.status}`,
        `basis=${item.measurementBasis}`,
        `confidence=${item.confidence}`,
        `numeric_verified=${item.numericVerified}`
      ].join(" · ");

      return `## [${item.slug}] ${item.title}\n<meta>${flags}</meta>\n출처: ${item.sourceRef || "미기재"}\n${item.summary}\n\n${item.body.slice(0, 2500)}`;
    })
    .join("\n\n---\n\n");

  const { reply } = await requestPlatformAIChat({
    sceneKey,
    messages: [
      {
        role: "system",
        content: [
          "당신은 에너지기술서비스(ETS)의 사내 에너지진단 지식 어시스턴트입니다.",
          "규칙:",
          "1. 아래 위키 문서에 있는 내용만 근거로 한국어로 답한다.",
          "2. 수치는 문서에 적힌 값을 그대로 인용한다. 직접 계산하거나 추정하지 않는다.",
          "3. `numeric_verified=false` 인 문서의 수치는 인용하지 말고, 필요하면 '검산 전 값이라 인용할 수 없음'이라고 밝힌다.",
          "4. `status=draft` 문서를 인용할 때는 초안임을 명시한다.",
          "5. 근거가 없으면 '위키에 근거가 없습니다'라고 답한다. 추측하지 않는다.",
          "6. 답변 끝에 참고한 문서를 [슬러그] 형태로 표기한다."
        ].join("\n")
      },
      { role: "user", content: `# 위키 문서\n${context}\n\n# 질문\n${question}` }
    ]
  });

  return {
    answer: reply,
    sources: ranked.map(({ item }) => ({
      slug: item.slug,
      title: item.title,
      type: item.type,
      status: item.status,
      acl: item.acl,
      numericVerified: item.numericVerified
    })),
    withheld,
    route: "external"
  };
}

/* ── ECM 후보 추천 (UC2) ───────────────────────────────────────────────── */

export type MeasureCandidate = {
  slug: string;
  title: string;
  summary: string;
  matchedOn: string[];
  score: number;
  cases: number;
  adoptedCases: number;
  paybackYears: { min: number; median: number; max: number } | null;
};

/**
 * 사업장 조건(업종·보유설비)에 적용 가능한 ECM 카드와
 * 과거 진단에서의 실제 회수기간 분포를 함께 돌려준다.
 */
export async function recommendMeasures(options: { sector: string; equipment: string[] }): Promise<MeasureCandidate[]> {
  const db = getDb();
  const measures = await db.select().from(wikiPages).where(eq(wikiPages.type, "measure"));
  const profile = getSector(options.sector);
  const equipment = options.equipment.length ? options.equipment : profile.keyEquipment;

  const { listMeasureOutcomes } = await import("./diagnoses");
  const outcomes = await listMeasureOutcomes();

  const candidates = measures
    .filter((page) => page.status !== "deprecated")
    .map((page) => {
      const haystack = `${page.title} ${page.summary} ${page.tags} ${page.body}`.toLowerCase();
      const matchedOn: string[] = [];

      if (page.sector === options.sector) matchedOn.push(`업종 ${profile.name}`);
      for (const item of equipment) {
        if (haystack.includes(item.toLowerCase())) matchedOn.push(item);
      }
      for (const source of profile.energySources) {
        if (haystack.includes(source.toLowerCase())) matchedOn.push(source);
      }

      const stats = outcomes.get(page.slug);
      const paybacks = (stats?.paybacks ?? []).filter((value) => value > 0).sort((a, b) => a - b);

      return {
        slug: page.slug,
        title: page.title,
        summary: page.summary,
        matchedOn: [...new Set(matchedOn)],
        // 과거 적용 사례가 있으면 우선순위를 올린다 — 재사용이 이 자산의 목적이다.
        score: [...new Set(matchedOn)].length + (stats?.cases ?? 0) * 0.5,
        cases: stats?.cases ?? 0,
        adoptedCases: stats?.adopted ?? 0,
        paybackYears: paybacks.length
          ? {
              min: paybacks[0],
              median: paybacks[Math.floor(paybacks.length / 2)],
              max: paybacks[paybacks.length - 1]
            }
          : null
      };
    })
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score);

  return candidates;
}

/* ── 보고서 초안 (UC3) ─────────────────────────────────────────────────── */

export type ReportDraft = { draft: string; unverified: string[]; withheld: boolean };

/**
 * 진단 건 + 적용 ECM 으로 보고서 초안을 만든다.
 * 검산을 통과한 수치만 본문에 넣고, 나머지는 `[검토 필요]` 마커로 남긴다.
 * 진단 건의 ACL 이 confidential 이상이면 외부 모델을 타지 않고 초안 생성을 거부한다.
 */
export async function draftDiagnosisReport(diagnosisCode: string, sceneKey: string): Promise<ReportDraft | null> {
  const db = getDb();
  const rows = await db.select().from(diagnoses).where(eq(diagnoses.code, diagnosisCode)).limit(1);
  const diagnosis = rows[0];
  if (!diagnosis) return null;

  if (!EXTERNAL_SAFE_ACL.includes(diagnosis.acl as WikiAcl)) {
    return {
      draft: "",
      unverified: [],
      withheld: true
    };
  }

  const { listDiagnosisMeasures } = await import("./diagnoses");
  const measures = await listDiagnosisMeasures(diagnosis.id);
  const profile = getSector(diagnosis.sector);
  const unverified: string[] = [];

  const value = (label: string, raw: number, unit: string, verified: boolean) => {
    if (!verified || !raw) {
      unverified.push(label);
      return `${label}: [검토 필요]`;
    }
    return `${label}: ${raw.toLocaleString("ko-KR")} ${unit}`;
  };

  const facts = [
    `사업장: ${diagnosis.facilityName}`,
    `업종: ${profile.name} (${profile.ksic})`,
    `진단연도: ${diagnosis.auditYear || "[검토 필요]"}`,
    `측정근거: ${diagnosis.measurementBasis} · 기간 ${diagnosis.measurementPeriod || "[검토 필요]"}`,
    value("연간 전력사용량", diagnosis.annualElectricityKwh, "kWh", diagnosis.annualElectricityKwh > 0),
    value("연간 환산에너지", diagnosis.annualEnergyToe, "toe", diagnosis.numericVerified),
    value("연간 온실가스", diagnosis.annualGhgTco2eq, "tCO2eq", diagnosis.numericVerified),
    value(`에너지 원단위(${profile.unitBasis})`, diagnosis.energyIntensity, "toe", diagnosis.numericVerified)
  ].join("\n");

  const measureLines = measures.length
    ? measures
        .map((measure) => {
          const payback = measure.numericVerified
            ? `${measure.paybackYears}년`
            : (unverified.push(`${measure.measureSlug} 회수기간`), "[검토 필요]");
          return `- ${measure.measureSlug}: 절감 ${measure.savingToe} toe, 투자비 ${measure.investmentKrw.toLocaleString("ko-KR")}원, 회수기간 ${payback}, 채택 ${measure.adopted ? "예" : "아니오"}`;
        })
        .join("\n")
    : "- (등록된 개선안 없음)";

  const { reply } = await requestPlatformAIChat({
    sceneKey,
    messages: [
      {
        role: "system",
        content: [
          "당신은 에너지진단 보고서 초안을 작성하는 보조자입니다.",
          "규칙:",
          "1. 아래 '확정 수치'에 있는 값만 쓴다. 어떤 숫자도 새로 계산하거나 추정하지 않는다.",
          "2. `[검토 필요]` 로 표시된 항목은 그대로 `[검토 필요]` 로 남긴다. 채워 넣지 않는다.",
          "3. 개요 / 에너지 사용 현황 / 문제점 / 개선안 / 기대효과 / 결론 순으로 구성한다.",
          "4. 한국어 보고서 문체로 쓰되, 근거 없는 단정은 피한다.",
          "5. 문서 마지막에 '본 초안의 최종 확인 책임은 진단원에게 있습니다.' 를 넣는다."
        ].join("\n")
      },
      { role: "user", content: `# 확정 수치\n${facts}\n\n# 개선안(ECM) 적용 실적\n${measureLines}\n\n# 업종 특성\n${profile.notes || "특이사항 없음"}\n주요 설비: ${profile.keyEquipment.join(", ")}` }
    ]
  });

  return { draft: reply, unverified: [...new Set(unverified)], withheld: false };
}
