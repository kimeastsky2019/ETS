/**
 * 업종 택소노미 — 에너지진단 지식의 분류 축.
 *
 * 설계 원칙: **타입 집합은 닫혀 있다.** 업종을 자유 문자열로 두면 같은 보고서가
 * 등록할 때마다 다른 라벨을 받고, 그 순간 업종별 필터·벤치마크가 무의미해진다.
 * 새 업종이 필요하면 먼저 이 파일을 고친다.
 *
 * `requiredMetrics` 가 이 파일의 실질이다. 업종을 알면 **무엇이 빠졌는지**를
 * 결정론적으로 물을 수 있고, 진단 문서의 커버리지 갭 탐지가 여기서 나온다.
 *
 * 출처: LLMwiki `kb/taxonomy.py` (에너지진단 온톨로지 v0.1).
 */

export type MetricCode =
  | "annual_electricity_kwh"
  | "annual_fuel"
  | "annual_energy_toe"
  | "annual_ghg_tco2eq"
  | "treatment_capacity_tpd"
  | "production_output"
  | "floor_area_m2"
  | "cultivation_area_m2"
  | "moisture_stage"
  | "energy_intensity"
  | "steam_balance"
  | "furnace_efficiency";

export type SectorProfile = {
  code: string;
  name: string;
  ksic: string;
  energySources: string[];
  keyEquipment: string[];
  requiredMetrics: MetricCode[];
  unitBasis: string;
  hints: string[];
  notes: string;
};

export const METRIC_LABELS: Record<MetricCode, string> = {
  annual_electricity_kwh: "연간 전력사용량(kWh)",
  annual_fuel: "연간 연료사용량",
  annual_energy_toe: "연간 환산에너지사용량(toe)",
  annual_ghg_tco2eq: "연간 온실가스 배출량(tCO2eq)",
  treatment_capacity_tpd: "처리용량(톤/일)",
  production_output: "생산량",
  floor_area_m2: "연면적(㎡)",
  cultivation_area_m2: "재배면적(㎡)",
  moisture_stage: "공정단계별 함수율",
  energy_intensity: "에너지 원단위",
  steam_balance: "증기 수지",
  furnace_efficiency: "노(爐) 열효율"
};

/** 지표 탐지용 어휘. 규칙 기반이라 재현 가능하다. */
export const METRIC_PATTERNS: Record<MetricCode, string[]> = {
  annual_electricity_kwh: ["연간 전력", "전력사용량", "소비전력", "kWh/y"],
  annual_fuel: ["연료사용량", "연료소비량", "가스소비량", "LPG 사용", "kg/h"],
  annual_energy_toe: ["환산에너지", "toe", "TOE"],
  annual_ghg_tco2eq: ["온실가스", "tCO2eq", "CO2eq", "배출량"],
  treatment_capacity_tpd: ["처리용량", "톤/일", "t/일", "처리량", "허가물량"],
  production_output: ["생산량", "생산실적", "제품 생산"],
  floor_area_m2: ["연면적", "건축면적"],
  cultivation_area_m2: ["재배면적", "시설면적"],
  moisture_stage: ["함수율", "수분", "탈수"],
  energy_intensity: ["원단위", "단위당 에너지", "에너지원단위"],
  steam_balance: ["증기", "스팀", "t/h"],
  furnace_efficiency: ["열효율", "노효율", "연소효율"]
};

const BASE_METRICS: MetricCode[] = [
  "annual_electricity_kwh",
  "annual_fuel",
  "annual_energy_toe",
  "annual_ghg_tco2eq"
];

export const SECTORS: SectorProfile[] = [
  {
    code: "waste",
    name: "폐기물처리·자원순환",
    ksic: "E38",
    energySources: ["전력", "LPG", "LNG", "경유", "폐열"],
    keyEquipment: ["건조기", "보일러", "송풍기", "탈수기", "파쇄기", "탈취설비"],
    requiredMetrics: [...BASE_METRICS, "treatment_capacity_tpd", "moisture_stage", "energy_intensity"],
    unitBasis: "처리량 1톤당",
    hints: ["음식물", "음폐", "폐기물", "퇴비", "부숙", "슬러지", "자원화", "함수율", "소각", "발효"],
    notes: "함수율 물질수지가 건조 열량의 타당성을 좌우한다. 「비료관리법」 공정규격 연계."
  },
  {
    code: "food",
    name: "식품제조",
    ksic: "C10-11",
    energySources: ["전력", "LNG", "스팀"],
    keyEquipment: ["보일러", "냉동기", "살균설비", "건조기", "공조기"],
    requiredMetrics: [...BASE_METRICS, "production_output", "energy_intensity"],
    unitBasis: "제품 1톤당",
    hints: ["식품", "살균", "냉동", "냉장", "가공식품", "HACCP", "제조라인"],
    notes: ""
  },
  {
    code: "chemical",
    name: "화학·석유화학",
    ksic: "C20-21",
    energySources: ["전력", "LNG", "스팀", "중유"],
    keyEquipment: ["반응기", "증류탑", "열교환기", "보일러", "압축기", "펌프"],
    requiredMetrics: [...BASE_METRICS, "production_output", "energy_intensity", "steam_balance"],
    unitBasis: "제품 1톤당",
    hints: ["반응기", "증류", "석유화학", "촉매", "플랜트", "정제", "중합"],
    notes: "열통합(pinch) 분석 유무가 진단 품질을 가른다."
  },
  {
    code: "metal",
    name: "1차금속·금속가공",
    ksic: "C24-25",
    energySources: ["전력", "LNG", "코크스"],
    keyEquipment: ["가열로", "열처리로", "압축기", "집진기", "전기로"],
    requiredMetrics: [...BASE_METRICS, "production_output", "energy_intensity", "furnace_efficiency"],
    unitBasis: "제품 1톤당",
    hints: ["주조", "단조", "열처리", "가열로", "압연", "도금", "용해로", "전기로"],
    notes: ""
  },
  {
    code: "textile",
    name: "섬유·의복",
    ksic: "C13-14",
    energySources: ["전력", "LNG", "스팀"],
    keyEquipment: ["염색기", "텐터", "보일러", "건조기"],
    requiredMetrics: [...BASE_METRICS, "production_output", "energy_intensity"],
    unitBasis: "원단 1,000m당",
    hints: ["염색", "텐터", "방적", "직물", "가공사", "섬유"],
    notes: ""
  },
  {
    code: "paper",
    name: "펄프·종이",
    ksic: "C17",
    energySources: ["전력", "LNG", "스팀", "바이오매스"],
    keyEquipment: ["초지기", "보일러", "건조부", "진공펌프"],
    requiredMetrics: [...BASE_METRICS, "production_output", "energy_intensity", "steam_balance"],
    unitBasis: "제품 1톤당",
    hints: ["초지", "제지", "펄프", "골판지", "지력"],
    notes: ""
  },
  {
    code: "nonmetal",
    name: "비금속광물(요업·시멘트)",
    ksic: "C23",
    energySources: ["전력", "유연탄", "LNG"],
    keyEquipment: ["소성로", "킬른", "분쇄기", "예열기"],
    requiredMetrics: [...BASE_METRICS, "production_output", "energy_intensity", "furnace_efficiency"],
    unitBasis: "제품 1톤당",
    hints: ["소성", "킬른", "시멘트", "요업", "내화물", "유리용해"],
    notes: ""
  },
  {
    code: "machinery",
    name: "기계·전자·자동차",
    ksic: "C26-30",
    energySources: ["전력", "LNG"],
    keyEquipment: ["압축기", "공조기", "도장설비", "클린룸", "사출기"],
    requiredMetrics: [
      "annual_electricity_kwh",
      "annual_energy_toe",
      "annual_ghg_tco2eq",
      "production_output",
      "energy_intensity"
    ],
    unitBasis: "제품 1대당",
    hints: ["사출", "도장", "클린룸", "조립라인", "반도체", "디스플레이", "프레스"],
    notes: ""
  },
  {
    code: "building",
    name: "건물(업무·상업·공공)",
    ksic: "L68",
    energySources: ["전력", "지역난방", "LNG"],
    keyEquipment: ["냉동기", "공조기", "보일러", "조명", "승강기"],
    requiredMetrics: [...BASE_METRICS, "floor_area_m2", "energy_intensity"],
    unitBasis: "연면적 1㎡당",
    hints: ["연면적", "공조", "냉동기", "지역난방", "조명", "빌딩", "청사", "EPI"],
    notes: "원단위 분모가 면적이라 다른 업종과 벤치마크를 섞으면 안 된다."
  },
  {
    code: "agri",
    name: "농업·시설원예",
    ksic: "A01",
    energySources: ["전력", "경유", "LPG", "지열"],
    keyEquipment: ["난방기", "히트펌프", "관수설비", "제습기"],
    requiredMetrics: [...BASE_METRICS, "cultivation_area_m2", "energy_intensity"],
    unitBasis: "재배면적 1㎡당",
    hints: ["시설원예", "온실", "육묘", "축사", "양계", "재배면적", "히트펌프"],
    notes: ""
  },
  {
    code: "water",
    name: "상하수도·수처리",
    ksic: "E36-37",
    energySources: ["전력"],
    keyEquipment: ["송풍기", "펌프", "탈수기", "소화조"],
    requiredMetrics: [
      "annual_electricity_kwh",
      "annual_energy_toe",
      "annual_ghg_tco2eq",
      "treatment_capacity_tpd",
      "energy_intensity"
    ],
    unitBasis: "처리수량 1,000㎥당",
    hints: ["하수처리", "정수장", "송풍", "폭기", "소화가스", "방류수", "수처리"],
    notes: ""
  },
  {
    code: "other",
    name: "기타·미분류",
    ksic: "-",
    energySources: [],
    keyEquipment: [],
    requiredMetrics: ["annual_energy_toe", "annual_ghg_tco2eq"],
    unitBasis: "-",
    hints: [],
    notes: "분류 신뢰도가 낮을 때의 안전한 기본값. 사람이 확정해야 한다."
  }
];

export const SECTOR_CODES = SECTORS.map((sector) => sector.code);

export function getSector(code: string): SectorProfile {
  return SECTORS.find((sector) => sector.code === code) ?? SECTORS[SECTORS.length - 1];
}

export function isSectorCode(code: string): boolean {
  return SECTOR_CODES.includes(code);
}

/**
 * 규칙 기반 1차 업종 분류. 본문 어휘 일치 수로 투표하고, 1·2위 격차를 신뢰도로 본다.
 * LLM 을 쓰지 않으므로 같은 입력에 항상 같은 결과가 나온다.
 */
export function classifySector(text: string): { sector: string; confidence: number; reason: string } {
  const haystack = text.toLowerCase();
  const votes = SECTORS.filter((sector) => sector.hints.length)
    .map((sector) => ({
      sector: sector.code,
      name: sector.name,
      hits: sector.hints.filter((hint) => haystack.includes(hint.toLowerCase())).length
    }))
    .sort((a, b) => b.hits - a.hits);

  const top = votes[0];
  const second = votes[1];

  if (!top || top.hits === 0) {
    return { sector: "other", confidence: 0, reason: "일치하는 업종 어휘가 없습니다. 담당자가 지정해야 합니다." };
  }

  const gap = second && second.hits > 0 ? (top.hits - second.hits) / top.hits : 1;
  const confidence = Math.min(0.95, (top.hits / (top.hits + 4)) * (0.5 + gap * 0.5));

  return {
    sector: top.sector,
    confidence: Number(confidence.toFixed(3)),
    reason: `${top.name} 어휘 ${top.hits}종 일치, 2위 대비 격차 ${Math.round(gap * 100)}%.`
  };
}

/** 업종 필수지표 중 본문에서 확인되지 않는 항목 (커버리지 갭). */
export function missingMetrics(sectorCode: string, text: string): Array<{ code: MetricCode; label: string }> {
  const profile = getSector(sectorCode);
  const haystack = text.toLowerCase();

  return profile.requiredMetrics
    .filter((metric) => !METRIC_PATTERNS[metric].some((pattern) => haystack.includes(pattern.toLowerCase())))
    .map((metric) => ({ code: metric, label: METRIC_LABELS[metric] }));
}
