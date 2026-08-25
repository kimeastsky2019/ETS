import { eq } from "drizzle-orm";
import { getDb } from "../_core/db";
import { diagnoses, diagnosisMeasures, wikiPages, wikiRevisions } from "../db/schema";
import { ensureFactors, computeDiagnosisNumbers, computeMeasureNumbers, loadFactors } from "./energy-calc";

/**
 * LLM Wiki 스타터 킷 — 기획서 4.3 의 ECM 카드 서식과 데이터 컨트랙트를
 * 실제 문서로 보여주는 최소 세트. 수치는 문서에 박아 넣지 않고,
 * 진단 건(diagnoses)과 적용 실적(diagnosis_measures)에서만 관리한다.
 */

type WikiSeed = {
  slug: string;
  type: "measure" | "equipment" | "regulation" | "metric" | "concept" | "facility";
  title: string;
  summary: string;
  tags: string;
  sector: string;
  acl: "public" | "internal" | "confidential" | "restricted";
  status: "draft" | "reviewed" | "deprecated";
  sourceRef: string;
  owner: string;
  validUntil?: string;
  confidence: "high" | "medium" | "low";
  body: string;
};

const SEED_PAGES: WikiSeed[] = [
  {
    slug: "ecm-waste-heat-recovery-boiler",
    type: "measure",
    title: "폐열회수 — 보일러 배가스 이코노마이저",
    summary: "보일러 배가스의 현열을 급수 예열에 회수해 연료 사용량을 줄이는 개선안.",
    tags: "폐열회수, 보일러, 이코노마이저, 산업체",
    sector: "chemical",
    acl: "internal",
    status: "reviewed",
    sourceRef: "ETS 진단 표준 개선안 카탈로그 (초판)",
    owner: "에너지진단팀",
    confidence: "high",
    body: `## 요약
보일러 배가스의 현열을 급수 예열에 회수하여 연료 사용량을 저감하는 개선안.

## 적용 조건
- 배가스 온도가 충분히 높을 것 (현장 실측으로 확인)
- 연간 가동시간이 길 것
- 급수 온도가 낮아 예열 여지가 있을 것
- 배관 경로와 설치 공간 확보 가능

## 산출 근거
| 항목 | 산출 방법 | 출처 |
|---|---|---|
| 회수 열량 | 배가스 유량 × 비열 × 온도강하 | 현장 실측값 |
| 연료 절감량 | 회수 열량 ÷ 보일러 효율 | [[reg-energy-conversion-factors]] |
| 회수기간 | 투자비 ÷ 연간 절감액 | 계산 엔진 (services/energy-calc.ts) |

> 수치는 이 페이지에서 생성하지 않는다. 실제 값은 진단 건의 개선안 실적에서 계산되며,
> 검산을 통과한 값만 서비스 응답에 인용된다.

## 검토 시 흔한 함정
- 배가스 노점 이하로 냉각하면 저온부식이 발생한다. 산노점 확인 필수.
- 가동시간이 짧으면 회수기간이 급격히 늘어난다. 실가동 시간표를 받아야 한다.

## 관련
[[eqp-steam-boiler]] · [[cpt-payback-drivers]] · [[mtr-energy-intensity]]`
  },
  {
    slug: "ecm-inverter-control-fan-pump",
    type: "measure",
    title: "송풍기·펌프 인버터 제어 도입",
    summary: "댐퍼·밸브 교축으로 유량을 조절하던 설비에 인버터를 적용해 저부하 구간 소비전력을 줄이는 개선안.",
    tags: "인버터, 송풍기, 펌프, VFD, 전력",
    sector: "water",
    acl: "internal",
    status: "reviewed",
    sourceRef: "ETS 진단 표준 개선안 카탈로그 (초판)",
    owner: "에너지진단팀",
    confidence: "high",
    body: `## 요약
정속 운전 중 댐퍼·밸브로 유량을 줄이던 송풍기·펌프에 인버터를 적용한다.
유량 변화에 대해 축동력이 3승으로 감소하는 상사법칙이 절감의 근거다.

## 적용 조건
- 부하 변동이 있고 저부하 운전 시간이 길 것
- 교축(댐퍼·밸브 조임) 방식으로 유량을 조절하고 있을 것
- 모터 절연·배선이 인버터 적용에 적합할 것

## 산출 근거
| 항목 | 산출 방법 | 출처 |
|---|---|---|
| 절감 전력량 | 부하율별 운전시간 × 상사법칙 축동력 차 | 현장 계측 |
| 절감액 | 절감 전력량 × 계약 전력단가 | [[reg-energy-conversion-factors]] |

## 검토 시 흔한 함정
- 정격 부근에서만 운전되면 절감이 거의 없다. 부하 프로파일을 먼저 본다.
- 인버터 손실(약 2~3%)과 고조파 대책 비용을 투자비에 포함해야 한다.

## 관련
[[cpt-payback-drivers]] · [[mtr-energy-intensity]]`
  },
  {
    slug: "ecm-compressed-air-leak",
    type: "measure",
    title: "압축공기 누설 저감",
    summary: "압축공기 배관·이음부 누설을 찾아 막아 공기압축기 부하시간을 줄이는 저비용 개선안.",
    tags: "압축공기, 누설, 컴프레서, 저비용",
    sector: "machinery",
    acl: "internal",
    status: "reviewed",
    sourceRef: "ETS 진단 표준 개선안 카탈로그 (초판)",
    owner: "에너지진단팀",
    confidence: "medium",
    body: `## 요약
비가동 시간대 압축기 부하 운전으로 누설량을 추정하고, 초음파 탐지로 누설점을 찾아 보수한다.

## 적용 조건
- 압축공기를 상시 사용하는 공정
- 비가동 시간대에도 압축기가 주기적으로 기동하는 경우

## 산출 근거
| 항목 | 산출 방법 | 출처 |
|---|---|---|
| 누설률 | 비가동 시 부하시간 ÷ (부하+무부하 시간) | 현장 계측 |
| 절감 전력량 | 누설률 × 압축기 소비전력 × 가동시간 | 현장 계측 |

## 검토 시 흔한 함정
- 투자비가 작아 회수기간이 짧게 나오지만, 보수하지 않으면 1~2년 내 원래대로 돌아온다.
  정기 점검 주기를 함께 제안해야 실효가 있다.

## 관련
[[cpt-payback-drivers]]`
  },
  {
    slug: "eqp-steam-boiler",
    type: "equipment",
    title: "증기 보일러 (관류형 · 노통연관식)",
    summary: "산업 현장에서 가장 흔한 열원 설비. 배가스 온도·공기비·부하율이 진단 핵심 지표다.",
    tags: "보일러, 증기, 열원",
    sector: "chemical",
    acl: "internal",
    status: "reviewed",
    sourceRef: "ETS 설비 카탈로그",
    owner: "에너지진단팀",
    confidence: "high",
    body: `## 점검 지표
- 배가스 온도, 공기비(O2 농도), 표면 열손실
- 부하율 및 단속 운전 여부
- 응축수 회수율, 블로다운 비율

## 자주 도출되는 개선안
- [[ecm-waste-heat-recovery-boiler]]
- 공기비 최적화, 응축수 회수 확대, 보온 보강

## 진단 시 확보할 자료
운전일지, 연료 구매 내역, 급수·응축수 계통도, 최근 연소 분석 결과.`
  },
  {
    slug: "reg-energy-conversion-factors",
    type: "regulation",
    title: "에너지 열량 환산기준 및 배출계수",
    summary: "연료·전력 사용량을 toe·tCO2eq 로 환산할 때 적용하는 기준. 개정 시 이 문서와 계수 표를 함께 갱신한다.",
    tags: "법규, 환산계수, toe, 배출계수",
    sector: "other",
    acl: "public",
    status: "draft",
    sourceRef: "에너지법 시행규칙 별표 · 국가 온실가스 배출계수 고시 (원문 확인 필요)",
    owner: "에너지진단팀",
    validUntil: "2026-12-31",
    confidence: "low",
    body: `## 사용 원칙
환산계수는 개정 주기가 있으므로 **반드시 최신 고시 원문을 인용**한다.
값 자체는 이 문서가 아니라 계수 표(SSOT)에서 관리하며, 계산은 검증된 함수만 수행한다.

## 갱신 절차
1. 고시 원문에서 값을 확인한다.
2. 업무 포털 → LLM Wiki → 환산계수 화면에서 값·출처·유효기간을 입력하고 '확인' 처리한다.
3. 확인되지 않은 계수를 쓴 계산은 전부 미검증으로 표시되며 서비스 응답에 인용되지 않는다.

## 주의
계수를 바꾸면 과거 진단 건의 환산값도 재계산 대상이 된다. 갱신 후 진단 목록에서 재계산을 실행한다.`
  },
  {
    slug: "mtr-energy-intensity",
    type: "metric",
    title: "에너지 원단위 (energy intensity)",
    summary: "연간 환산에너지(toe)를 업종별 분모로 나눈 값. 분모가 다르면 서로 비교할 수 없다.",
    tags: "원단위, 벤치마크, 지표",
    sector: "other",
    acl: "internal",
    status: "reviewed",
    sourceRef: "ETS 진단 지표 정의서",
    owner: "에너지진단팀",
    confidence: "high",
    body: `## 정의
에너지 원단위 = 연간 환산에너지사용량(toe) ÷ 업종별 분모

## 업종별 분모
분모는 업종 택소노미에 고정되어 있다. 건물은 연면적, 제조업은 생산량,
수처리는 처리수량이 분모다. **분모가 다른 업종끼리 원단위를 비교하면 안 된다.**

## 사용 주의
- 측정근거(measured / estimated / design)가 다른 값을 한 분포에 섞지 않는다.
- 검산을 통과한 진단 건만 벤치마크 분포에 들어간다.

## 관련
[[cpt-payback-drivers]]`
  },
  {
    slug: "cpt-payback-drivers",
    type: "concept",
    title: "회수기간을 결정하는 세 가지 변수",
    summary: "가동시간, 부하 프로파일, 에너지 단가. 설비 사양보다 이 셋이 회수기간을 더 크게 움직인다.",
    tags: "회수기간, 인사이트, 투자판단",
    sector: "other",
    acl: "internal",
    status: "draft",
    sourceRef: "진단 사례 누적 관찰 (검증 진행 중)",
    owner: "에너지진단팀",
    confidence: "medium",
    body: `## 관찰
같은 개선안이라도 사업장에 따라 회수기간이 크게 갈린다. 반복되는 원인은 셋이다.

1. **연간 가동시간** — 절감액은 가동시간에 비례한다. 가동시간이 절반이면 회수기간은 두 배다.
2. **부하 프로파일** — 정격 부근에서만 운전되면 인버터류 개선안의 절감 여지가 사라진다.
3. **에너지 단가** — 계약종별 단가와 연료 구매단가가 절감액을 좌우한다.

## 진단 착수 시 먼저 받을 자료
운전 시간표, 15분 단위 수요 데이터, 최근 12개월 에너지 구매 내역.

## 관련
[[ecm-waste-heat-recovery-boiler]] · [[ecm-inverter-control-fan-pump]] · [[mtr-energy-intensity]]`
  }
];

export async function seedWikiStarter(ownerId: string) {
  const db = getDb();
  const now = new Date().toISOString();
  let createdWiki = 0;

  await ensureFactors();

  for (const seed of SEED_PAGES) {
    const existing = await db.select({ id: wikiPages.id }).from(wikiPages).where(eq(wikiPages.slug, seed.slug)).limit(1);
    if (existing[0]) continue;

    const [created] = await db
      .insert(wikiPages)
      .values({
        slug: seed.slug,
        type: seed.type,
        title: seed.title,
        summary: seed.summary,
        body: seed.body,
        tags: seed.tags,
        acl: seed.acl,
        status: seed.status,
        sourceRef: seed.sourceRef,
        ownerId,
        version: 1,
        sector: seed.sector,
        measurementBasis: "documented",
        measurementPeriod: "",
        confidence: seed.confidence,
        numericVerified: false,
        owner: seed.owner,
        validUntil: seed.validUntil ?? "",
        contentHash: "",
        ingestedBy: "seed",
        ingestedAt: now,
        pipelineVersion: "wiki-v2-seed",
        createdAt: now,
        updatedAt: now
      })
      .returning();

    await db.insert(wikiRevisions).values({
      pageId: created.id,
      version: 1,
      title: created.title,
      body: created.body,
      note: "스타터 킷",
      editorId: ownerId,
      createdAt: now
    });

    createdWiki += 1;
  }

  const createdDiagnoses = await seedDiagnoses(ownerId);
  return { createdWiki, createdDiagnoses };
}

/** 벤치마크·유사사례 화면이 빈 채로 시작하지 않도록 하는 예시 진단 3건. */
const SEED_DIAGNOSES = [
  {
    code: "dgn-2025-sample-water-a",
    facilityName: "[예시] A 하수처리장",
    sector: "water",
    region: "경기",
    auditYear: 2025,
    unitBasisValue: 3650,
    annualElectricityKwh: 4_200_000,
    annualFuelToe: 0,
    equipmentTags: "송풍기, 펌프, 탈수기",
    note: "예시 데이터입니다. 실제 진단 자료로 교체하세요.",
    measures: [
      { measureSlug: "ecm-inverter-control-fan-pump", savingKwh: 320_000, investmentKrw: 78_000_000, adopted: true }
    ]
  },
  {
    code: "dgn-2025-sample-machinery-b",
    facilityName: "[예시] B 기계부품 공장",
    sector: "machinery",
    region: "충남",
    auditYear: 2025,
    unitBasisValue: 120_000,
    annualElectricityKwh: 6_800_000,
    annualFuelToe: 120,
    equipmentTags: "압축기, 공조기, 사출기",
    note: "예시 데이터입니다. 실제 진단 자료로 교체하세요.",
    measures: [
      { measureSlug: "ecm-compressed-air-leak", savingKwh: 180_000, investmentKrw: 12_000_000, adopted: true },
      { measureSlug: "ecm-inverter-control-fan-pump", savingKwh: 95_000, investmentKrw: 41_000_000, adopted: false }
    ]
  },
  {
    code: "dgn-2024-sample-chemical-c",
    facilityName: "[예시] C 화학 플랜트",
    sector: "chemical",
    region: "전남",
    auditYear: 2024,
    unitBasisValue: 45_000,
    annualElectricityKwh: 9_100_000,
    annualFuelToe: 1_450,
    equipmentTags: "보일러, 열교환기, 압축기",
    note: "예시 데이터입니다. 실제 진단 자료로 교체하세요.",
    measures: [
      { measureSlug: "ecm-waste-heat-recovery-boiler", savingToe: 210, annualSavingKrw: 190_000_000, investmentKrw: 430_000_000, adopted: true }
    ]
  }
];

async function seedDiagnoses(ownerId: string) {
  const db = getDb();
  const now = new Date().toISOString();
  const factors = await loadFactors();
  let created = 0;

  for (const seed of SEED_DIAGNOSES) {
    const existing = await db.select({ id: diagnoses.id }).from(diagnoses).where(eq(diagnoses.code, seed.code)).limit(1);
    if (existing[0]) continue;

    const numbers = computeDiagnosisNumbers(
      {
        annualElectricityKwh: seed.annualElectricityKwh,
        annualFuelToe: seed.annualFuelToe,
        unitBasisValue: seed.unitBasisValue
      },
      factors
    );

    const [diagnosis] = await db
      .insert(diagnoses)
      .values({
        code: seed.code,
        facilityName: seed.facilityName,
        sector: seed.sector,
        region: seed.region,
        auditYear: seed.auditYear,
        unitBasisValue: seed.unitBasisValue,
        unitBasisNote: "",
        annualElectricityKwh: seed.annualElectricityKwh,
        annualFuelToe: seed.annualFuelToe,
        annualEnergyToe: numbers.annualEnergyToe,
        annualGhgTco2eq: numbers.annualGhgTco2eq,
        energyIntensity: numbers.energyIntensity,
        measurementBasis: "estimated",
        measurementPeriod: `${seed.auditYear}-01 ~ ${seed.auditYear}-12`,
        acl: "internal",
        numericVerified: numbers.numericVerified,
        equipmentTags: seed.equipmentTags,
        note: seed.note,
        ownerId,
        createdAt: now,
        updatedAt: now
      })
      .returning();

    for (const measure of seed.measures) {
      const computed = computeMeasureNumbers(
        {
          savingKwh: "savingKwh" in measure ? (measure.savingKwh as number) : 0,
          savingToe: "savingToe" in measure ? (measure.savingToe as number) : 0,
          investmentKrw: measure.investmentKrw,
          annualSavingKrw: "annualSavingKrw" in measure ? (measure.annualSavingKrw as number) : 0
        },
        factors
      );

      await db.insert(diagnosisMeasures).values({
        diagnosisId: diagnosis.id,
        measureSlug: measure.measureSlug,
        savingKwh: "savingKwh" in measure ? (measure.savingKwh as number) : 0,
        savingToe: computed.savingToe,
        investmentKrw: measure.investmentKrw,
        annualSavingKrw: computed.annualSavingKrw,
        paybackYears: computed.paybackYears,
        adopted: measure.adopted,
        adoptionNote: "",
        numericVerified: computed.numericVerified,
        createdAt: now
      });
    }

    created += 1;
  }

  return created;
}
