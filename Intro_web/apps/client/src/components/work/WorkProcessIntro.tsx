import { ArrowUpRight, BookOpen, Search } from "lucide-react";

/**
 * 로그인 직후 보는 작업 안내 — 진단 보고서가 어떤 순서로 누구 손을 거치는지 한눈에.
 *
 * 상세 기획은 LLMWiki 저장소 `design/진단-사이클-기획.md` 에 있다. 여기서는 그 중
 * **내 차례가 언제이고 어느 도구로 들어가는지**만 남긴다 — 매일 보는 화면이라 길면 안 읽힌다.
 */

type Stage = {
  no: string;
  name: string;
  owner: string;
  /** 역할별 색. 담당이 누구인지를 색으로 먼저 읽게 한다. */
  tone: "office" | "field" | "ai" | "lead";
  detail: string;
};

const STAGES: Stage[] = [
  { no: "01", name: "골격",  owner: "사무실 작성자", tone: "office", detail: "기존 보고서와 위키에서 보고서의 큰 틀을 잡습니다." },
  { no: "02", name: "현장",  owner: "현장 경력자",   tone: "field",  detail: "체크리스트로 판정과 실측값을 올립니다." },
  { no: "03", name: "채움",  owner: "AI",            tone: "ai",     detail: "시계열을 모으고 본문 디테일을 채웁니다." },
  { no: "04", name: "정리",  owner: "사무실 작성자", tone: "office", detail: "제출 형식에 맞춰 다듬습니다." },
  { no: "05", name: "승인",  owner: "현장 책임자",   tone: "lead",   detail: "검증하고 확정합니다. 위키 자산이 됩니다." },
];

/** 외부 서비스는 각자 로그인이 따로 있다 — 눌렀는데 인증창이 뜨는 이유를 미리 알려 준다. */
const SERVICES = [
  {
    href: "https://work.ets0404.com/",
    icon: BookOpen,
    name: "LLM Wiki",
    host: "work.ets0404.com",
    lead: "위키 · 체크리스트",
    desc: "설비와 개선안(ECM)을 문서로 쌓고, 현장에 들고 나갈 체크리스트를 만듭니다.",
    stages: "02 현장 · 03 채움 · 05 승인",
  },
  {
    href: "https://rag.ets0404.com/",
    icon: Search,
    name: "RAG 검색",
    host: "rag.ets0404.com",
    lead: "자료 검색 · 분석",
    desc: "과거 보고서와 원본 자료를 검색하고 질문해 초기 파악을 합니다.",
    stages: "01 골격",
  },
];

export function WorkProcessIntro() {
  return (
    <section className="work-panel process-intro">
      <div className="work-panel-head">
        <div>
          <span className="eyebrow">HOW WE WORK</span>
          <h2>진단 보고서는 이렇게 만듭니다</h2>
          <p>사람은 판단하고, AI는 채우고, 계산은 코드가 합니다. 한 건이 다섯 단계를 거칩니다.</p>
        </div>
      </div>

      <ol className="process-flow">
        {STAGES.map((stage) => (
          <li key={stage.no} className={`process-step tone-${stage.tone}`}>
            <span className="ps-no">{stage.no}</span>
            <strong className="ps-name">{stage.name}</strong>
            <span className="ps-owner">{stage.owner}</span>
            <p className="ps-detail">{stage.detail}</p>
          </li>
        ))}
      </ol>

      <div className="process-services">
        {SERVICES.map((service) => {
          const Icon = service.icon;
          return (
            <a key={service.host} className="process-service" href={service.href} target="_blank" rel="noreferrer">
              <div className="pv-top">
                <Icon size={22} />
                <ArrowUpRight size={18} />
              </div>
              <strong>{service.name}</strong>
              <span className="pv-lead">{service.lead}</span>
              <p>{service.desc}</p>
              <div className="pv-foot">
                <span className="pv-stages">{service.stages}</span>
                <span className="pv-host">{service.host}</span>
              </div>
            </a>
          );
        })}
      </div>

      <p className="process-note">
        두 서비스는 각각 별도 로그인이 필요합니다. 계정이 없으면 담당자에게 요청하세요.
      </p>
    </section>
  );
}

export default WorkProcessIntro;
