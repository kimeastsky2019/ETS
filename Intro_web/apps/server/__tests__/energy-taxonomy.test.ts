import { describe, expect, it } from "vitest";
import { SECTOR_CODES, classifySector, getSector, missingMetrics } from "../services/energy-taxonomy";
import { hasNumericClaim } from "../services/wiki";

describe("업종 택소노미", () => {
  it("타입 집합이 닫혀 있고 미지 코드는 other 로 떨어진다", () => {
    expect(SECTOR_CODES).toContain("waste");
    expect(getSector("존재하지-않는-업종").code).toBe("other");
  });

  it("업종마다 원단위 분모가 다르다", () => {
    expect(getSector("building").unitBasis).toContain("연면적");
    expect(getSector("water").unitBasis).toContain("처리수량");
  });
});

describe("classifySector", () => {
  it("어휘 일치로 업종을 규칙 분류한다", () => {
    const result = classifySector("음식물 폐기물 자원화 시설로 탈수케이크 함수율을 관리한다");
    expect(result.sector).toBe("waste");
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("같은 입력에 같은 결과를 낸다 (재현 가능)", () => {
    const text = "연면적 기준 공조기와 냉동기를 운영하는 청사 건물";
    expect(classifySector(text)).toEqual(classifySector(text));
  });

  it("일치 어휘가 없으면 other 로 두고 사람에게 넘긴다", () => {
    const result = classifySector("특별한 내용이 없는 문장");
    expect(result.sector).toBe("other");
    expect(result.confidence).toBe(0);
  });
});

describe("missingMetrics", () => {
  it("업종 필수지표 중 본문에 없는 항목을 찾아준다", () => {
    const gaps = missingMetrics("building", "연간 전력사용량과 연면적만 기재되어 있다");
    const codes = gaps.map((gap) => gap.code);

    expect(codes).not.toContain("annual_electricity_kwh");
    expect(codes).not.toContain("floor_area_m2");
    expect(codes).toContain("annual_ghg_tco2eq");
  });
});

describe("hasNumericClaim", () => {
  it("값에 단위가 붙은 표현을 수치 주장으로 본다", () => {
    expect(hasNumericClaim("연간 1,200 kWh 를 절감한다")).toBe(true);
    expect(hasNumericClaim("회수기간 2.3년")).toBe(true);
  });

  it("연도 표기는 수치 주장으로 보지 않는다", () => {
    expect(hasNumericClaim("2015년 9월에 설립되었다")).toBe(false);
  });

  it("단위 없는 서술은 수치 주장이 아니다", () => {
    expect(hasNumericClaim("배가스 온도가 충분히 높을 것")).toBe(false);
  });
});
