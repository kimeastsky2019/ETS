import { apiFetch } from "@/lib/api";
import { normalizeApiError, readResponseBody } from "@/lib/api-error";

/**
 * ETS 통합 플랫폼 API 클라이언트.
 * 모든 호출은 @/lib/api 의 apiFetch 를 통해서만 나간다 (scaffold 규칙).
 */
async function request<T>(path: string, init?: RequestInit & { auth?: boolean }): Promise<T> {
  const response = await apiFetch(path, init);
  const body = await readResponseBody(response);

  if (!response.ok) {
    throw new Error(normalizeApiError(body).message);
  }

  const envelope = body as { ok?: boolean; data?: T };
  if (!envelope || envelope.ok !== true) {
    throw new Error(normalizeApiError(body).message);
  }

  return envelope.data as T;
}

function jsonInit(method: string, payload: unknown): RequestInit & { auth?: boolean } {
  return {
    method,
    auth: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  };
}

/* ── 회원 ─────────────────────────────────────────────────────────────── */

export type MemberProfile = {
  id: string;
  name: string;
  email: string;
  username: string | null;
  role: "user" | "admin";
  memberType: "customer" | "staff";
  department: string | null;
  phone: string | null;
  emailVerified: boolean;
};

export const membersApi = {
  me: () => request<{ profile: MemberProfile }>("/members/me", { auth: true }),
  list: () => request<{ members: Array<MemberProfile & { createdAt: string }> }>("/members", { auth: true }),
  update: (id: string, patch: { memberType?: "customer" | "staff"; role?: "user" | "admin"; department?: string }) =>
    request<{ profile: MemberProfile }>(`/members/${id}`, jsonInit("PATCH", patch)),
  bootstrapStatus: () => request<{ staffCount: number; expected: number }>("/members/bootstrap"),
  bootstrap: () =>
    request<{
      accounts: Array<{ username: string; email: string; created: boolean; role: string }>;
      seeded: { createdPosts: number; createdWiki: number };
    }>("/members/bootstrap", { method: "POST", auth: true })
};

/* ── 콘텐츠 (블로그 / 쇼츠) ───────────────────────────────────────────── */

export type Post = {
  id: string;
  slug: string;
  type: "blog" | "shorts";
  title: string;
  summary: string;
  body: string;
  tag: string;
  coverImage: string | null;
  videoUrl: string | null;
  duration: string;
  status: "draft" | "published";
  viewCount: number;
  likeCount: number;
  publishedAt: string | null;
  createdAt: string;
};

export type PostInput = Partial<Omit<Post, "id" | "viewCount" | "likeCount" | "publishedAt" | "createdAt">> & {
  title: string;
};

export const postsApi = {
  list: (type?: "blog" | "shorts", includeDraft = false) =>
    request<{ posts: Post[]; likedPostIds: string[] }>(
      `/posts?${new URLSearchParams({
        ...(type ? { type } : {}),
        ...(includeDraft ? { includeDraft: "true" } : {})
      }).toString()}`,
      { auth: true }
    ),
  get: (slug: string) => request<{ post: Post; liked: boolean }>(`/posts/${slug}`, { auth: true }),
  like: (id: string) => request<{ liked: boolean }>(`/posts/${id}/like`, { method: "POST", auth: true }),
  create: (input: PostInput) => request<{ post: Post }>("/posts", jsonInit("POST", input)),
  update: (id: string, input: Partial<PostInput>) => request<{ post: Post }>(`/posts/${id}`, jsonInit("PATCH", input)),
  remove: (id: string) => request<{ id: string }>(`/posts/${id}`, { method: "DELETE", auth: true })
};

/* ── 발코니 태양광 신청 ───────────────────────────────────────────────── */

export type SolarApplication = {
  id: string;
  userId: string;
  applicantName: string;
  phone: string;
  email: string;
  postalCode: string;
  address: string;
  buildingType: string;
  balconyDirection: string;
  balconyWidth: string;
  monthlyBill: number;
  packageId: string;
  packageName: string;
  quantity: number;
  visitPreference: string;
  note: string;
  status: "received" | "reviewing" | "surveying" | "quoted" | "closed";
  staffMemo: string;
  createdAt: string;
  customerName?: string | null;
  customerEmail?: string | null;
};

export type SolarApplicationInput = {
  applicantName: string;
  phone: string;
  email: string;
  postalCode?: string;
  address: string;
  buildingType: string;
  balconyDirection: string;
  balconyWidth?: string;
  monthlyBill?: number;
  packageId?: string;
  packageName?: string;
  quantity?: number;
  visitPreference?: string;
  note?: string;
  privacyAgreed: true;
};

export const solarApi = {
  apply: (input: SolarApplicationInput) =>
    request<{ application: SolarApplication }>("/solar-applications", jsonInit("POST", input)),
  mine: () => request<{ applications: SolarApplication[] }>("/solar-applications/mine", { auth: true }),
  queue: (status?: string) =>
    request<{ applications: SolarApplication[] }>(
      `/solar-applications${status ? `?status=${status}` : ""}`,
      { auth: true }
    ),
  update: (id: string, patch: { status?: SolarApplication["status"]; staffMemo?: string }) =>
    request<{ application: SolarApplication }>(`/solar-applications/${id}`, jsonInit("PATCH", patch))
};

/* ── 문의 ─────────────────────────────────────────────────────────────── */

export type Inquiry = {
  id: string;
  type: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  message: string;
  status: "received" | "handling" | "done";
  staffMemo: string;
  createdAt: string;
};

export const inquiriesApi = {
  create: (input: {
    type: string;
    name: string;
    company?: string;
    phone?: string;
    email: string;
    message: string;
    privacyAgreed: true;
  }) => request<{ inquiry: Inquiry }>("/inquiries", jsonInit("POST", input)),
  mine: () => request<{ inquiries: Inquiry[] }>("/inquiries/mine", { auth: true }),
  queue: (status?: string) =>
    request<{ inquiries: Inquiry[] }>(`/inquiries${status ? `?status=${status}` : ""}`, { auth: true }),
  update: (id: string, patch: { status?: Inquiry["status"]; staffMemo?: string }) =>
    request<{ inquiry: Inquiry }>(`/inquiries/${id}`, jsonInit("PATCH", patch))
};

/* ── LLM Wiki v2 ──────────────────────────────────────────────────────── */

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

export type WikiAcl = "public" | "internal" | "confidential" | "restricted";
export type WikiStatus = "draft" | "reviewed" | "deprecated";
export type MeasurementBasis = "measured" | "estimated" | "design" | "documented";

export type WikiPage = {
  id: string;
  slug: string;
  type: WikiType;
  title: string;
  summary: string;
  body: string;
  tags: string;
  acl: WikiAcl;
  status: WikiStatus;
  sourceRef: string;
  version: number;
  sector: string;
  measurementBasis: MeasurementBasis;
  measurementPeriod: string;
  confidence: "high" | "medium" | "low";
  numericVerified: boolean;
  owner: string;
  validUntil: string;
  contentHash: string;
  ingestedBy: string;
  updatedAt: string;
};

export type WikiRevision = {
  id: string;
  version: number;
  title: string;
  note: string;
  createdAt: string;
};

export type LintIssue = {
  rule: string;
  category: "스키마" | "링크" | "보안" | "도메인" | "식별";
  severity: "block" | "warn";
  slug: string;
  title: string;
  detail: string;
};

export type WikiLintReport = {
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

export type SectorProfile = {
  code: string;
  name: string;
  ksic: string;
  energySources: string[];
  keyEquipment: string[];
  unitBasis: string;
  notes: string;
  requiredMetrics: Array<{ code: string; label: string }>;
};

export type EnergyFactor = {
  code: string;
  label: string;
  category: "toe" | "ghg" | "price";
  value: number;
  unit: string;
  source: string;
  validFrom: string;
  validUntil: string;
  verified: boolean;
  updatedAt: string;
};

export type AskResult = {
  answer: string;
  sources: Array<{
    slug: string;
    title: string;
    type: string;
    status: string;
    acl: string;
    numericVerified: boolean;
  }>;
  withheld: number;
  route: "external" | "none";
};

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

export const wikiApi = {
  list: (params: { q?: string; type?: string; status?: string; sector?: string; acl?: string } = {}) =>
    request<{ pages: WikiPage[] }>(
      `/wiki?${new URLSearchParams(
        Object.entries(params).filter(([, value]) => Boolean(value)) as string[][]
      ).toString()}`,
      { auth: true }
    ),
  get: (slug: string) =>
    request<{ page: WikiPage; links: string[]; revisions: WikiRevision[] }>(`/wiki/${slug}`, { auth: true }),
  create: (input: Partial<WikiPage> & { title: string; type: WikiType }) =>
    request<{ page: WikiPage }>("/wiki", jsonInit("POST", input)),
  update: (slug: string, input: Partial<WikiPage> & { note?: string }) =>
    request<{ page: WikiPage }>(`/wiki/${slug}`, jsonInit("PATCH", input)),
  remove: (slug: string) => request<{ slug: string }>(`/wiki/${slug}`, { method: "DELETE", auth: true }),
  lint: () => request<{ report: WikiLintReport }>("/wiki/lint", { auth: true }),
  taxonomy: () =>
    request<{ sectors: SectorProfile[]; typeLabels: Record<WikiType, string> }>("/wiki/taxonomy", { auth: true }),
  classify: (text: string) =>
    request<{ sector: string; confidence: number; reason: string }>("/wiki/classify", jsonInit("POST", { text })),
  factors: () => request<{ factors: EnergyFactor[] }>("/wiki/factors", { auth: true }),
  updateFactor: (
    code: string,
    patch: { value?: number; source?: string; validFrom?: string; validUntil?: string; verified?: boolean }
  ) => request<{ factor: EnergyFactor }>(`/wiki/factors/${code}`, jsonInit("PATCH", patch)),
  ask: (question: string) => request<AskResult>("/wiki/ask", jsonInit("POST", { question })),
  recommend: (sector: string, equipment: string[] = []) =>
    request<{ candidates: MeasureCandidate[] }>("/wiki/recommend", jsonInit("POST", { sector, equipment })),
  reportDraft: (diagnosisCode: string) =>
    request<{ draft: string; unverified: string[] }>("/wiki/report-draft", jsonInit("POST", { diagnosisCode }))
};

/* ── 진단 프로젝트 ────────────────────────────────────────────────────── */

export type Diagnosis = {
  id: string;
  code: string;
  facilityName: string;
  sector: string;
  region: string;
  auditYear: number;
  unitBasisValue: number;
  unitBasisNote: string;
  annualElectricityKwh: number;
  annualFuelToe: number;
  annualEnergyToe: number;
  annualGhgTco2eq: number;
  energyIntensity: number;
  measurementBasis: MeasurementBasis;
  measurementPeriod: string;
  acl: WikiAcl;
  numericVerified: boolean;
  wikiSlug: string;
  equipmentTags: string;
  note: string;
  createdAt: string;
};

export type DiagnosisMeasure = {
  id: string;
  diagnosisId: string;
  measureSlug: string;
  savingToe: number;
  savingKwh: number;
  annualSavingKrw: number;
  investmentKrw: number;
  paybackYears: number;
  adopted: boolean;
  adoptionNote: string;
  numericVerified: boolean;
};

export type CalcNote = { level: "warn" | "block"; message: string };

export type BenchmarkReport = {
  sector: string;
  sectorName: string;
  unitBasis: string;
  distribution: { count: number; min: number; p25: number; median: number; p75: number; max: number };
  percentile: number | null;
  samples: Array<{ code: string; facilityName: string; auditYear: number; energyIntensity: number }>;
};

export type DiagnosisInput = {
  code?: string;
  facilityName: string;
  sector: string;
  region?: string;
  auditYear?: number;
  unitBasisValue?: number;
  annualElectricityKwh?: number;
  annualFuelToe?: number;
  measurementBasis?: MeasurementBasis;
  measurementPeriod?: string;
  acl?: WikiAcl;
  equipmentTags?: string;
  note?: string;
};

export const diagnosesApi = {
  list: (params: { sector?: string; year?: number } = {}) =>
    request<{ diagnoses: Diagnosis[] }>(
      `/diagnoses?${new URLSearchParams(
        Object.entries(params)
          .filter(([, value]) => Boolean(value))
          .map(([key, value]) => [key, String(value)])
      ).toString()}`,
      { auth: true }
    ),
  get: (code: string) =>
    request<{ diagnosis: Diagnosis; measures: DiagnosisMeasure[]; gaps: Array<{ code: string; label: string }> }>(
      `/diagnoses/${code}`,
      { auth: true }
    ),
  create: (input: DiagnosisInput) =>
    request<{ diagnosis: Diagnosis; notes: CalcNote[] }>("/diagnoses", jsonInit("POST", input)),
  update: (code: string, input: Partial<DiagnosisInput>) =>
    request<{ diagnosis: Diagnosis; notes: CalcNote[] }>(`/diagnoses/${code}`, jsonInit("PATCH", input)),
  similar: (input: { sector: string; unitBasisValue?: number; equipment?: string[] }) =>
    request<{ matches: Array<{ diagnosis: Diagnosis; score: number; reasons: string[] }> }>(
      "/diagnoses/similar",
      jsonInit("POST", input)
    ),
  benchmark: (sector: string, intensity?: number) =>
    request<{ report: BenchmarkReport }>(
      `/diagnoses/benchmark?sector=${sector}${intensity ? `&intensity=${intensity}` : ""}`,
      { auth: true }
    ),
  addMeasure: (
    code: string,
    input: {
      measureSlug: string;
      savingKwh?: number;
      savingToe?: number;
      investmentKrw?: number;
      annualSavingKrw?: number;
      adopted?: boolean;
      adoptionNote?: string;
    }
  ) => request<{ measure: DiagnosisMeasure; notes: CalcNote[] }>(`/diagnoses/${code}/measures`, jsonInit("POST", input)),
  removeMeasure: (code: string, id: string) =>
    request<{ id: string }>(`/diagnoses/${code}/measures/${id}`, { method: "DELETE", auth: true })
};
