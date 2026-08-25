import { eq } from "drizzle-orm";
import { getDb } from "../_core/db";
import { posts } from "../db/schema";

const IMAGE = {
  data: "/images/img_021051fca69c.jpg",
  esco: "/images/img_b9f7786d0417.jpg",
  renewable: "/images/img_714682f9a953.jpg",
  insight: "/images/img_993a9934b456.jpg",
  balcony: "/images/img_f9285b14f8f4.jpg"
};

/** 기존 홈페이지에 하드코딩돼 있던 콘텐츠를 DB 초기 데이터로 옮긴 것. */
const SEED_POSTS = [
  {
    slug: "energy-audit-getting-started",
    type: "blog" as const,
    title: "에너지 진단, 어디서부터 시작해야 할까?",
    summary: "진단 전 준비자료와 현장 체크포인트를 한 번에 정리했습니다.",
    tag: "에너지진단",
    duration: "5분 읽기",
    coverImage: IMAGE.insight,
    body: "에너지 진단은 '무엇을 측정할 수 있는가'에서 출발합니다.\n\n최근 1~2년치 전기·가스·유류 사용량, 주요 설비 목록과 정격, 운전 시간표만 준비되어도 1차 분석이 가능합니다.\n\n현장에서는 보일러·냉동기 효율, 공조 운전시간, 압축공기 누설, 조명 점등 패턴을 우선 확인합니다.\n\n진단 결과는 절감량과 투자비, 회수기간이 함께 제시되어야 실행으로 이어집니다."
  },
  {
    slug: "balcony-solar-install-steps",
    type: "shorts" as const,
    title: "30초로 보는 발코니 태양광 설치 순서",
    summary: "현장 확인부터 배치·계통 검토까지 핵심 흐름을 짧게 확인하세요.",
    tag: "태양광",
    duration: "00:30",
    coverImage: IMAGE.balcony,
    body: "① 발코니 방향·그늘 확인 → ② 난간 구조와 고정 방식 검토 → ③ 모듈 배치 설계 → ④ 인버터·계통 연결 검토 → ⑤ 설치 및 발전 확인."
  },
  {
    slug: "esco-lowers-capex",
    type: "blog" as const,
    title: "ESCO가 시설 투자 부담을 낮추는 방식",
    summary: "성과 기반 에너지 효율화 사업의 구조를 실무 관점에서 설명합니다.",
    tag: "ESCO",
    duration: "6분 읽기",
    coverImage: IMAGE.esco,
    body: "ESCO 사업은 절감으로 생긴 현금흐름으로 투자비를 회수하는 구조입니다.\n\n핵심은 절감량을 어떻게 측정·검증(M&V)할 것인지 사전에 합의하는 데 있습니다.\n\n기준연도 사용량, 보정 변수(생산량·외기온도), 정산 주기를 계약서에 명시해야 분쟁이 없습니다."
  },
  {
    slug: "three-signs-of-energy-loss",
    type: "shorts" as const,
    title: "우리 건물의 에너지 손실 신호 3가지",
    summary: "운전시간, 피크부하, 설비 효율에서 확인할 수 있는 징후입니다.",
    tag: "효율화",
    duration: "00:45",
    coverImage: IMAGE.data,
    body: "① 사용하지 않는 시간대의 기저부하가 높다 ② 매달 같은 시간대에 피크가 반복된다 ③ 설비 부하율이 30% 밑에서 계속 운전된다."
  },
  {
    slug: "renewable-selection-guide",
    type: "blog" as const,
    title: "태양광·태양열·연료전지, 현장별 선택 기준",
    summary: "공간과 부하 패턴, 유지관리 조건에 맞춰 비교하는 방법입니다.",
    tag: "신재생",
    duration: "7분 읽기",
    coverImage: IMAGE.renewable,
    body: "전기 부하가 크고 지붕 면적이 넓다면 태양광, 급탕 부하가 연중 일정하면 태양열, 열과 전기를 동시에 쓰고 공간이 제한적이면 연료전지가 유리합니다.\n\n선택 기준은 설치 면적, 부하 패턴, 유지관리 인력, 지원제도 네 가지로 압축됩니다."
  },
  {
    slug: "peak-shaving-with-data",
    type: "shorts" as const,
    title: "데이터로 찾는 전력 피크 절감 포인트",
    summary: "짧은 데이터 분석으로 먼저 확인할 수 있는 운영 개선 포인트입니다.",
    tag: "데이터",
    duration: "00:40",
    coverImage: IMAGE.insight,
    body: "15분 단위 수요 데이터만 있어도 피크가 발생하는 요일·시간대와 원인 설비를 좁힐 수 있습니다."
  }
];

export async function seedStarterContent(authorId: string) {
  const db = getDb();
  const now = new Date().toISOString();
  let createdPosts = 0;

  for (const seed of SEED_POSTS) {
    const existing = await db.select({ id: posts.id }).from(posts).where(eq(posts.slug, seed.slug)).limit(1);
    if (existing[0]) continue;

    await db.insert(posts).values({
      ...seed,
      status: "published",
      authorId,
      publishedAt: now,
      createdAt: now,
      updatedAt: now
    });
    createdPosts += 1;
  }

  return { createdPosts };
}
