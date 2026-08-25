import { describe, expect, it } from "vitest";
import {
  computeDiagnosisNumbers,
  computeMeasureNumbers,
  distribution,
  percentileOf,
  type FactorMap
} from "../services/energy-calc";

function factor(code: string, value: number, unit: string, verified: boolean) {
  return {
    code,
    label: code,
    category: "toe" as const,
    value,
    unit,
    source: "",
    validFrom: "",
    validUntil: "",
    verified,
    updatedAt: ""
  };
}

const verifiedFactors: FactorMap = {
  elec_toe: factor("elec_toe", 0.0002, "toe/kWh", true),
  elec_ghg: factor("elec_ghg", 0.45, "tCO2eq/MWh", true),
  elec_price: factor("elec_price", 100, "원/kWh", true)
};

describe("computeDiagnosisNumbers", () => {
  it("전력·연료를 합산해 toe 와 배출량, 원단위를 산출한다", () => {
    const result = computeDiagnosisNumbers(
      { annualElectricityKwh: 1_000_000, annualFuelToe: 50, unitBasisValue: 10_000 },
      verifiedFactors
    );

    expect(result.annualEnergyToe).toBe(250); // 1,000,000 × 0.0002 + 50
    expect(result.annualGhgTco2eq).toBe(450); // 1,000 MWh × 0.45
    expect(result.energyIntensity).toBe(0.025);
    expect(result.numericVerified).toBe(true);
  });

  it("분모가 0 이면 원단위를 내지 않고 검산에 실패한다", () => {
    const result = computeDiagnosisNumbers(
      { annualElectricityKwh: 1_000_000, annualFuelToe: 0, unitBasisValue: 0 },
      verifiedFactors
    );

    expect(result.energyIntensity).toBe(0);
    expect(result.numericVerified).toBe(false);
    expect(result.notes.some((note) => note.level === "block")).toBe(true);
  });

  it("미검증 계수를 쓰면 결과도 미검증으로 내려간다 (P2)", () => {
    const result = computeDiagnosisNumbers(
      { annualElectricityKwh: 1_000_000, annualFuelToe: 0, unitBasisValue: 10_000 },
      { ...verifiedFactors, elec_toe: factor("elec_toe", 0.0002, "toe/kWh", false) }
    );

    expect(result.numericVerified).toBe(false);
    expect(result.notes.some((note) => note.level === "warn")).toBe(true);
  });

  it("계수가 아예 없으면 차단 메모를 남긴다", () => {
    const result = computeDiagnosisNumbers(
      { annualElectricityKwh: 1000, annualFuelToe: 0, unitBasisValue: 100 },
      {}
    );

    expect(result.numericVerified).toBe(false);
    expect(result.notes.filter((note) => note.level === "block").length).toBeGreaterThan(0);
  });
});

describe("computeMeasureNumbers", () => {
  it("회수기간을 투자비 ÷ 연간 절감액으로 계산한다", () => {
    const result = computeMeasureNumbers(
      { savingKwh: 100_000, savingToe: 0, investmentKrw: 30_000_000, annualSavingKrw: 0 },
      verifiedFactors
    );

    expect(result.annualSavingKrw).toBe(10_000_000); // 100,000kWh × 100원
    expect(result.savingToe).toBe(20); // 100,000 × 0.0002
    expect(result.paybackYears).toBe(3);
    expect(result.numericVerified).toBe(true);
  });

  it("절감액을 직접 입력하면 그 값을 우선한다", () => {
    const result = computeMeasureNumbers(
      { savingKwh: 0, savingToe: 210, investmentKrw: 400_000_000, annualSavingKrw: 200_000_000 },
      verifiedFactors
    );

    expect(result.savingToe).toBe(210);
    expect(result.paybackYears).toBe(2);
  });

  it("투자비가 0 이면 회수기간을 내지 않는다", () => {
    const result = computeMeasureNumbers(
      { savingKwh: 100_000, savingToe: 0, investmentKrw: 0, annualSavingKrw: 0 },
      verifiedFactors
    );

    expect(result.paybackYears).toBe(0);
    expect(result.numericVerified).toBe(false);
  });
});

describe("distribution / percentileOf", () => {
  it("0 이하 값은 분포에서 제외한다", () => {
    expect(distribution([0, -1, 2, 4, 6, 8]).count).toBe(4);
  });

  it("표본이 없으면 0 으로 응답한다", () => {
    expect(distribution([]).median).toBe(0);
    expect(percentileOf(5, [])).toBe(0);
  });

  it("대상 값의 위치를 백분위로 돌려준다", () => {
    expect(percentileOf(5, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])).toBe(40);
  });
});
