/** 임직원 업무 포털의 통합 문서검색 대상 (기존 홈페이지 아카이브). */
export type DocumentItem = {
  title: string;
  category: "회사" | "사업" | "실적" | "고객자료";
  summary: string;
  path: string;
  keywords: string;
};

export const DOCUMENTS: DocumentItem[] = [
  { title: "기업소개", category: "회사", summary: "회사 개요, 주요 사업, 면허 및 자격", path: "about.html", keywords: "기업 회사 개요 면허 자격" },
  { title: "CEO 인사말", category: "회사", summary: "경영 철학과 에너지 효율화 비전", path: "ceo.html", keywords: "대표 CEO 비전 인사말" },
  { title: "회사연혁", category: "회사", summary: "설립 이후 주요 성장 과정", path: "history.html", keywords: "연혁 설립 역사" },
  { title: "조직도", category: "회사", summary: "부서 및 전문 인력 구성", path: "org.html", keywords: "조직 부서 담당자" },
  { title: "사업면허", category: "회사", summary: "보유 면허와 전문 자격", path: "license.html", keywords: "면허 자격 인증" },
  { title: "에너지 진단", category: "사업", summary: "진단 범위, 절차, 지원 제도", path: "energy-audit.html", keywords: "에너지진단 절감 진단비용" },
  { title: "ESCO 사업", category: "사업", summary: "에너지절약전문기업 사업과 수행 사례", path: "esco.html", keywords: "ESCO 효율 시설 투자 절감" },
  { title: "신재생에너지", category: "사업", summary: "태양광·태양열·연료전지 등 사업 안내", path: "renewable.html", keywords: "신재생 태양광 연료전지" },
  { title: "태양광", category: "사업", summary: "태양광 발전 원리, 구성, 설치 사례", path: "solar.html", keywords: "태양광 패널 인버터 발전소" },
  { title: "기계설비 성능점검", category: "사업", summary: "기계설비 성능점검 및 공사업", path: "mech.html", keywords: "기계설비 성능점검 공사" },
  { title: "스마트제조 지원", category: "사업", summary: "스마트제조·ICT 기반 에너지 관리", path: "smart.html", keywords: "스마트공장 제조 ICT" },
  { title: "데이터바우처", category: "사업", summary: "데이터 분석·가공 공급기업 서비스", path: "voucher.html", keywords: "데이터 바우처 분석 가공" },
  { title: "디지털 트윈", category: "사업", summary: "에너지 분야 디지털 트윈 적용", path: "twin.html", keywords: "디지털트윈 시뮬레이션 데이터" },
  { title: "2024년 사업실적", category: "실적", summary: "2024년 주요 프로젝트 수행실적", path: "perf-2024.html", keywords: "2024 실적 프로젝트" },
  { title: "2023년 사업실적", category: "실적", summary: "2023년 주요 프로젝트 수행실적", path: "perf-2023.html", keywords: "2023 실적 프로젝트" },
  { title: "2022년 사업실적", category: "실적", summary: "2022년 주요 프로젝트 수행실적", path: "perf-2022.html", keywords: "2022 실적 프로젝트" },
  { title: "기초자료 조사표", category: "고객자료", summary: "에너지 진단을 위한 기초자료 접수 안내", path: "report.html", keywords: "조사표 양식 제출 팩스" },
  { title: "공지사항", category: "고객자료", summary: "회사 공지와 주요 안내", path: "notice.html", keywords: "공지 안내" },
  { title: "뉴스", category: "고객자료", summary: "에너지기술서비스 관련 최신 소식", path: "news.html", keywords: "뉴스 보도 소식" },
  { title: "자료실", category: "고객자료", summary: "에너지 기술 관련 문서와 자료", path: "archive.html", keywords: "자료 다운로드 문서" },
];

