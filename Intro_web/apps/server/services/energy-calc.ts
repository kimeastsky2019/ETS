import { eq } from "drizzle-orm";
import { getDb } from "../_core/db";
import { energyFactors, type EnergyFactor } from "../db/schema";

/**
 * 수치 계산 엔진 — 기획서 P2("숫자는 LLM 이 생성하지 않는다")의 집행 장치.
 *
 * 절감량·회수기간·toe 환산·배출량은 전부 이 파일의 순수 함수로만 계산한다.
 * LLM 은 원문에서 입력값을 뽑는 역할까지만 맡는다.
 *
 * 계수는 하드코딩하지 않고 `energy_factors` 테이블(SSOT)에서 읽는다.
 * 담당자가 고시 원문으로 확인하기 전(`verified=false`)에는 계산 결과가
 * `numericVerified=false` 로 내려가고, 서비스 응답에서 인용되지 않는다.
 */

export type FactorSeed = {
  code: string;
  label: string;
  category: "toe" | "ghg" | "price";
  value: number;
  unit: string;
  source: string;
};

/**
 * 기본값은 "계산이 돌아가게 하는 자리표시자"이지 승인된 값이 아니다.
 * 전부 verified=false 로 적재되며, Lint 가 미검증 계수를 계속 경고한다.
 */
export const DEFAULT_FACTORS: FactorSeed[] = [
  { code: "elec_toe", label: "전력 → toe 환산", category: "toe", value: 0.000215, unit: "toe/kWh", source: "기본값 — 에너지법 시행규칙 별표 원문 확인 필요" },
  { code: "elec_ghg", label: "전력 배출계수", category: "ghg", value: 0.4594, unit: "tCO2eq/MWh", source: "기본값 — 국가 온실가스 배출계수 고시 확인 필요" },
  { code: "lng_toe", label: "LNG → toe 환산", category: "toe", value: 0.001055, unit: "toe/Nm³", source: "기본값 — 고시 원문 확인 필요" },
  { code: "lpg_toe", label: "LPG → toe 환산", category: "toe", value: 0.00120, unit: "toe/kg", source: "기본값 — 고시 원문 확인 필요" },
  { code: "diesel_toe", label: "경유 → toe 환산", category: "toe", value: 0.000902, unit: "toe/L", source: "기본값 — 고시 원문 확인 필요" },
  { code: "bunker_c_toe", label: "B-C유 → toe 환산", category: "toe", value: 0.000990, unit: "toe/L", source: "기본값 — 고시 원문 확인 필요" },
  { code: "elec_price", label: "전력 단가", category: "price", value: 130, unit: "원/kWh", source: "기본값 — 계약종별 단가로 교체 필요" },
  { code: "lng_price", label: "LNG 단가", category: "price", value: 1100, unit: "원/Nm³", source: "기본값 — 실제 구매단가로 교체 필요" }
];

export type FactorMap = Record<string, EnergyFactor | undefined>;

export async function ensureFactors(): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();

  for (const seed of DEFAULT_FACTORS) {
    const existing = await db.select().from(energyFactors).where(eq(energyFactors.code, seed.code)).limit(1);
    if (existing[0]) continue;

    await db.insert(energyFactors).values({ ...seed, verified: false, updatedAt: now });
  }
}

export async function loadFactors(): Promise<FactorMap> {
  const rows = await getDb().select().from(energyFactors);
  const map: FactorMap = {};
  for (const row of rows) map[row.code] = row;
  return map;
}

export type CalcNote = { level: "warn" | "block"; message: string };

function factorValue(factors: FactorMap, code: string, notes: CalcNote[]): number | null {
  const factor = factors[code];
  if (!factor) {
    notes.push({ level: "block", message: `계수 ${code} 가 등록되어 있지 않습니다.` });
    return null;
  }
  if (!factor.verified) {
    notes.push({ level: "warn", message: `${factor.label} 은(는) 미검증 기본값입니다 (${factor.value} ${factor.unit}).` });
  }
  if (factor.validUntil && factor.validUntil < new Date().toISOString().slice(0, 10)) {
    notes.push({ level: "warn", message: `${factor.label} 의 유효기간이 지났습니다 (~${factor.validUntil}).` });
  }
  return factor.value;
}

export type DiagnosisInput = {
  annualElectricityKwh: number;
  annualFuelToe: number;
  unitBasisValue: number;
};

export type DiagnosisNumbers = {
  annualEnergyToe: number;
  annualGhgTco2eq: number;
  energyIntensity: number;
  numericVerified: boolean;
  notes: CalcNote[];
};

/** 연간 에너지사용량(toe)·배출량(tCO2eq)·원단위를 계산한다. */
export function computeDiagnosisNumbers(input: DiagnosisInput, factors: FactorMap): DiagnosisNumbers {
  const notes: CalcNote[] = [];
  const elecToe = factorValue(factors, "elec_toe", notes);
  const elecGhg = factorValue(factors, "elec_ghg", notes);

  const electricityToe = elecToe === null ? 0 : input.annualElectricityKwh * elecToe;
  const annualEnergyToe = round(electricityToe + input.annualFuelToe, 3);
  const annualGhgTco2eq = elecGhg === null ? 0 : round((input.annualElectricityKwh / 1000) * elecGhg, 3);

  if (input.unitBasisValue <= 0) {
    notes.push({ level: "block", message: "원단위 분모(연면적·생산량·처리량)가 0 입니다. 벤치마크에서 제외됩니다." });
  }

  const energyIntensity = input.unitBasisValue > 0 ? round(annualEnergyToe / input.unitBasisValue, 6) : 0;

  return {
    annualEnergyToe,
    annualGhgTco2eq,
    energyIntensity,
    numericVerified: notes.length === 0 && annualEnergyToe > 0,
    notes
  };
}

export type MeasureInput = {
  savingKwh: number;
  savingToe: number;
  investmentKrw: number;
  annualSavingKrw: number;
};

export type MeasureNumbers = {
  savingToe: number;
  annualSavingKrw: number;
  paybackYears: number;
  numericVerified: boolean;
  notes: CalcNote[];
};

/**
 * ECM 절감량과 회수기간.
 * 절감액을 입력하지 않으면 절감 전력량 × 전력단가로 산출한다.
 */
export function computeMeasureNumbers(input: MeasureInput, factors: FactorMap): MeasureNumbers {
  const notes: CalcNote[] = [];
  const elecToe = factorValue(factors, "elec_toe", notes);
  const elecPrice = factorValue(factors, "elec_price", notes);

  const savingToe = input.savingToe > 0 ? input.savingToe : elecToe === null ? 0 : round(input.savingKwh * elecToe, 3);

  const annualSavingKrw =
    input.annualSavingKrw > 0
      ? input.annualSavingKrw
      : elecPrice === null
        ? 0
        : round(input.savingKwh * elecPrice, 0);

  if (input.investmentKrw <= 0) {
    notes.push({ level: "block", message: "투자비가 0 입니다. 회수기간을 산출할 수 없습니다." });
  }
  if (annualSavingKrw <= 0) {
    notes.push({ level: "block", message: "연간 절감액이 0 입니다. 회수기간을 산출할 수 없습니다." });
  }

  const paybackYears =
    input.investmentKrw > 0 && annualSavingKrw > 0 ? round(input.investmentKrw / annualSavingKrw, 2) : 0;

  return {
    savingToe,
    annualSavingKrw,
    paybackYears,
    numericVerified: notes.length === 0 && paybackYears > 0,
    notes
  };
}

/** 원단위 분포에서의 위치. 벤치마크(UC4)에 쓰인다. */
export function distribution(values: number[]) {
  const sorted = values.filter((value) => value > 0).sort((a, b) => a - b);
  if (!sorted.length) {
    return { count: 0, min: 0, p25: 0, median: 0, p75: 0, max: 0 };
  }

  const at = (ratio: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))];

  return {
    count: sorted.length,
    min: sorted[0],
    p25: at(0.25),
    median: at(0.5),
    p75: at(0.75),
    max: sorted[sorted.length - 1]
  };
}

/** 값이 분포에서 몇 퍼센타일인지 (0~100). 낮을수록 효율이 좋다. */
export function percentileOf(value: number, values: number[]): number {
  const sorted = values.filter((item) => item > 0).sort((a, b) => a - b);
  if (!sorted.length || value <= 0) return 0;
  const below = sorted.filter((item) => item < value).length;
  return Math.round((below / sorted.length) * 100);
}

function round(value: number, digits: number) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
