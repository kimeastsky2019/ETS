import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../_core/db";
import { diagnoses, diagnosisMeasures, type Diagnosis } from "../db/schema";
import {
  computeDiagnosisNumbers,
  computeMeasureNumbers,
  distribution,
  loadFactors,
  percentileOf,
  type CalcNote
} from "./energy-calc";
import { getSector, missingMetrics } from "./energy-taxonomy";

export type DiagnosisInput = {
  code?: string;
  facilityName: string;
  sector: string;
  region?: string;
  auditYear?: number;
  unitBasisValue?: number;
  unitBasisNote?: string;
  annualElectricityKwh?: number;
  annualFuelToe?: number;
  measurementBasis?: "measured" | "estimated" | "design" | "documented";
  measurementPeriod?: string;
  acl?: "public" | "internal" | "confidential" | "restricted";
  wikiSlug?: string;
  equipmentTags?: string;
  note?: string;
};

function diagnosisCode(input: DiagnosisInput) {
  const year = input.auditYear || new Date().getFullYear();
  const name = input.facilityName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .slice(0, 24);
  return `dgn-${year}-${name || "site"}`;
}

export async function createDiagnosis(ownerId: string, input: DiagnosisInput) {
  const factors = await loadFactors();
  const numbers = computeDiagnosisNumbers(
    {
      annualElectricityKwh: input.annualElectricityKwh ?? 0,
      annualFuelToe: input.annualFuelToe ?? 0,
      unitBasisValue: input.unitBasisValue ?? 0
    },
    factors
  );

  const now = new Date().toISOString();
  const [created] = await getDb()
    .insert(diagnoses)
    .values({
      code: input.code?.trim() || diagnosisCode(input),
      facilityName: input.facilityName,
      sector: input.sector,
      region: input.region ?? "",
      auditYear: input.auditYear ?? 0,
      unitBasisValue: input.unitBasisValue ?? 0,
      unitBasisNote: input.unitBasisNote ?? getSector(input.sector).unitBasis,
      annualElectricityKwh: input.annualElectricityKwh ?? 0,
      annualFuelToe: input.annualFuelToe ?? 0,
      annualEnergyToe: numbers.annualEnergyToe,
      annualGhgTco2eq: numbers.annualGhgTco2eq,
      energyIntensity: numbers.energyIntensity,
      measurementBasis: input.measurementBasis ?? "documented",
      measurementPeriod: input.measurementPeriod ?? "",
      acl: input.acl ?? "confidential",
      numericVerified: numbers.numericVerified,
      wikiSlug: input.wikiSlug ?? "",
      equipmentTags: input.equipmentTags ?? "",
      note: input.note ?? "",
      ownerId,
      createdAt: now,
      updatedAt: now
    })
    .returning();

  return { diagnosis: created, notes: numbers.notes };
}

export async function updateDiagnosis(code: string, input: Partial<DiagnosisInput>) {
  const db = getDb();
  const current = await getDiagnosis(code);
  if (!current) return null;

  const merged = {
    annualElectricityKwh: input.annualElectricityKwh ?? current.annualElectricityKwh,
    annualFuelToe: input.annualFuelToe ?? current.annualFuelToe,
    unitBasisValue: input.unitBasisValue ?? current.unitBasisValue
  };

  const numbers = computeDiagnosisNumbers(merged, await loadFactors());
  const patch: Record<string, unknown> = { updatedAt: new Date().toISOString(), ...merged, ...{
    annualEnergyToe: numbers.annualEnergyToe,
    annualGhgTco2eq: numbers.annualGhgTco2eq,
    energyIntensity: numbers.energyIntensity,
    numericVerified: numbers.numericVerified
  } };

  for (const key of [
    "facilityName",
    "sector",
    "region",
    "auditYear",
    "unitBasisNote",
    "measurementBasis",
    "measurementPeriod",
    "acl",
    "wikiSlug",
    "equipmentTags",
    "note"
  ] as const) {
    if (input[key] !== undefined) patch[key] = input[key];
  }

  const [updated] = await db.update(diagnoses).set(patch).where(eq(diagnoses.id, current.id)).returning();
  return { diagnosis: updated, notes: numbers.notes };
}

export async function getDiagnosis(code: string) {
  const rows = await getDb().select().from(diagnoses).where(eq(diagnoses.code, code)).limit(1);
  return rows[0] ?? null;
}

export async function listDiagnoses(options: { sector?: string; year?: number } = {}) {
  const db = getDb();
  const filters = [];
  if (options.sector) filters.push(eq(diagnoses.sector, options.sector));
  if (options.year) filters.push(eq(diagnoses.auditYear, options.year));

  const query = db.select().from(diagnoses);
  return filters.length
    ? query.where(and(...filters)).orderBy(desc(diagnoses.auditYear), desc(diagnoses.createdAt))
    : query.orderBy(desc(diagnoses.auditYear), desc(diagnoses.createdAt));
}

/** 업종 필수지표 대비 이 진단 건에서 비어 있는 항목. */
export function coverageGaps(diagnosis: Diagnosis) {
  const profile = getSector(diagnosis.sector);
  const filled: string[] = [];
  if (diagnosis.annualElectricityKwh > 0) filled.push("연간 전력사용량 kWh");
  if (diagnosis.annualFuelToe > 0) filled.push("연간 연료사용량");
  if (diagnosis.annualEnergyToe > 0) filled.push("환산에너지 toe");
  if (diagnosis.annualGhgTco2eq > 0) filled.push("온실가스 tCO2eq");
  if (diagnosis.unitBasisValue > 0) filled.push(`${profile.unitBasis} 원단위 분모 연면적 생산량 처리량`);
  if (diagnosis.energyIntensity > 0) filled.push("에너지 원단위");

  return missingMetrics(diagnosis.sector, `${filled.join(" ")} ${diagnosis.note} ${diagnosis.equipmentTags}`);
}

/* ── ECM 적용 실적 ─────────────────────────────────────────────────────── */

export type MeasureInput = {
  measureSlug: string;
  savingKwh?: number;
  savingToe?: number;
  investmentKrw?: number;
  annualSavingKrw?: number;
  adopted?: boolean;
  adoptionNote?: string;
};

export async function addDiagnosisMeasure(
  diagnosisId: string,
  input: MeasureInput
): Promise<{ measure: typeof diagnosisMeasures.$inferSelect; notes: CalcNote[] }> {
  const numbers = computeMeasureNumbers(
    {
      savingKwh: input.savingKwh ?? 0,
      savingToe: input.savingToe ?? 0,
      investmentKrw: input.investmentKrw ?? 0,
      annualSavingKrw: input.annualSavingKrw ?? 0
    },
    await loadFactors()
  );

  const [created] = await getDb()
    .insert(diagnosisMeasures)
    .values({
      diagnosisId,
      measureSlug: input.measureSlug,
      savingKwh: input.savingKwh ?? 0,
      savingToe: numbers.savingToe,
      investmentKrw: input.investmentKrw ?? 0,
      annualSavingKrw: numbers.annualSavingKrw,
      paybackYears: numbers.paybackYears,
      adopted: input.adopted ?? false,
      adoptionNote: input.adoptionNote ?? "",
      numericVerified: numbers.numericVerified,
      createdAt: new Date().toISOString()
    })
    .returning();

  return { measure: created, notes: numbers.notes };
}

export async function listDiagnosisMeasures(diagnosisId: string) {
  return getDb().select().from(diagnosisMeasures).where(eq(diagnosisMeasures.diagnosisId, diagnosisId));
}

export async function removeDiagnosisMeasure(id: string) {
  await getDb().delete(diagnosisMeasures).where(eq(diagnosisMeasures.id, id));
}

/** ECM 슬러그별 과거 적용 실적 집계 (추천의 근거). */
export async function listMeasureOutcomes() {
  const rows = await getDb().select().from(diagnosisMeasures);
  const map = new Map<string, { cases: number; adopted: number; paybacks: number[] }>();

  for (const row of rows) {
    const entry = map.get(row.measureSlug) ?? { cases: 0, adopted: 0, paybacks: [] };
    entry.cases += 1;
    if (row.adopted) entry.adopted += 1;
    if (row.numericVerified && row.paybackYears > 0) entry.paybacks.push(row.paybackYears);
    map.set(row.measureSlug, entry);
  }

  return map;
}

/* ── 유사 사례 검색 (UC1) ──────────────────────────────────────────────── */

export type SimilarQuery = { sector: string; unitBasisValue?: number; equipment?: string[] };

export async function findSimilarDiagnoses(query: SimilarQuery) {
  const all = await listDiagnoses();
  const equipment = (query.equipment ?? []).map((item) => item.trim()).filter(Boolean);

  return all
    .map((diagnosis) => {
      const reasons: string[] = [];
      let score = 0;

      if (diagnosis.sector === query.sector) {
        score += 3;
        reasons.push(`동일 업종 ${getSector(diagnosis.sector).name}`);
      }

      if (query.unitBasisValue && query.unitBasisValue > 0 && diagnosis.unitBasisValue > 0) {
        const ratio = diagnosis.unitBasisValue / query.unitBasisValue;
        if (ratio >= 0.5 && ratio <= 2) {
          score += 2;
          reasons.push("규모 ±2배 이내");
        }
      }

      const haystack = `${diagnosis.equipmentTags} ${diagnosis.note}`.toLowerCase();
      for (const item of equipment) {
        if (haystack.includes(item.toLowerCase())) {
          score += 1;
          reasons.push(item);
        }
      }

      return { diagnosis, score, reasons };
    })
    .filter((hit) => hit.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);
}

/* ── 원단위 벤치마크 (UC4) ─────────────────────────────────────────────── */

export async function sectorBenchmark(sector: string, targetIntensity?: number) {
  const rows = (await listDiagnoses({ sector })).filter((row) => row.numericVerified && row.energyIntensity > 0);
  const values = rows.map((row) => row.energyIntensity);

  return {
    sector,
    sectorName: getSector(sector).name,
    unitBasis: getSector(sector).unitBasis,
    distribution: distribution(values),
    percentile: targetIntensity ? percentileOf(targetIntensity, values) : null,
    samples: rows.map((row) => ({
      code: row.code,
      facilityName: row.facilityName,
      auditYear: row.auditYear,
      energyIntensity: row.energyIntensity
    }))
  };
}
