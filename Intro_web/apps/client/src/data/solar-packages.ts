import { IMAGES } from "@/assets/images";

export type SolarPackage = {
  id: string;
  name: string;
  badge: string;
  capacity: string;
  fit: string;
  includes: string[];
  lead: string;
  image: string;
};

/** 스토어(비교)와 신청폼(선택)이 함께 쓰는 단일 출처. */
export const SOLAR_PACKAGES: SolarPackage[] = [
  {
    id: "mini",
    name: "Balcony Mini 400",
    badge: "1~2인 가구",
    capacity: "400W급 구성 예시",
    fit: "작은 발코니 · 입문형",
    includes: ["모듈 1장 구성", "마이크로 인버터 검토", "설치 환경 사전 확인"],
    lead: "간결한 구성으로 시작하는 소형 패키지",
    image: IMAGES.STORE_DOT_BALCONY
  },
  {
    id: "duo",
    name: "Balcony Duo 800",
    badge: "추천",
    capacity: "800W급 구성 예시",
    fit: "일반 가정 · 균형형",
    includes: ["모듈 2장 구성", "발전 모니터링 검토", "맞춤 배치 컨설팅"],
    lead: "발전량과 설치 면적의 균형을 고려한 상담 패키지",
    image: IMAGES.BUSINESS_DOT_RENEWABLE
  },
  {
    id: "smart",
    name: "Balcony Smart 1200",
    badge: "확장형",
    capacity: "1.2kW급 구성 예시",
    fit: "넓은 발코니 · 고효율형",
    includes: ["모듈 3장 구성", "스마트 계측 연계 검토", "현장 안전성 검토"],
    lead: "더 넓은 공간과 데이터 모니터링을 위한 확장 패키지",
    image: IMAGES.BUSINESS_DOT_DATA
  }
];
