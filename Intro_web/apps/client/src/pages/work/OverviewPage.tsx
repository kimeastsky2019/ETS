import { ArrowUpRight, BookOpen, Search } from "lucide-react";
import { WorkShell } from "@/pages/work/WorkShell";
import { usePageMeta } from "@/lib/use-page-meta";

/**
 * 작업 개요 — 진단 보고서가 누구 손을 거쳐 어떻게 완성되는지.
 *
 * 대시보드의 안내는 "내 차례가 언제인가" 만 짚는 요약이고, 이 화면은 그 근거다.
 * 새로 온 사람이 읽는 곳이라 단계마다 왜 그 순서인지까지 적는다.
 * 상세 기획은 llmwiki 저장소 `design/진단-사이클-기획.md`.
 */

type Tone = "office" | "field" | "ai" | "lead";

const STAGES: {
  no: string; name: string; owner: string; tone: Tone;
  lead: string; body: string[]; io: [string, string][];
}[] = [
  {
    no: "01", name: "골격", owner: "사무실 작성자 + LLM", tone: "office",
    lead: "기존 보고서와 위키에서 보고서의 큰 틀을 잡습니다.",
    body: [
      "LLM 은 찾아주는 역할입니다. “이 업종 이 규모에서 예전에 뭘 다뤘나”를 RAG 로 검색하고, 위키에서 재사용 가능한 개선안을 끌어옵니다.",
      "골격 자체는 사람이 정합니다. 무엇을 다루고 무엇을 뺄지는 수주 범위와 고객 사정이 걸린 판단이라 AI 가 알 수 없습니다.",
    ],
    io: [["입력", "과거 보고서(RAG 검색), 위키 사업장·설비·개선안"], ["출력", "목차, 다룰 설비, ECM 후보, 필요한 실측 항목"]],
  },
  {
    no: "02", name: "현장", owner: "현장 경력자", tone: "field",
    lead: "체크리스트로 판정과 실측값을 올립니다.",
    body: [
      "경력자의 시간은 비쌉니다. 현장에서 요구할 것은 판정과 숫자뿐이어야 하고, 문장을 쓰게 하면 안 됩니다.",
    ],
    io: [["입력", "01 의 골격에서 파생된 체크리스트"], ["출력", "해당/비해당 판정, 실측값, 현장 사진·메모"]],
  },
  {
    no: "03", name: "채움", owner: "AI", tone: "ai",
    lead: "시계열을 모으고 본문 디테일을 채웁니다.",
    body: [
      "시계열 — 같은 사업장·같은 설비가 해가 바뀌며 어떤 값을 보였는지 모읍니다. “작년 공기비 1.3, 올해 1.5” 같은 변화는 기억으로 잡기 어렵습니다.",
      "디테일 — 골격의 절마다 실측값과 위키 자산을 엮어 본문을 만듭니다. 실측값이 없으면 [미측정] 으로 두고 넘어갑니다.",
    ],
    io: [["입력", "02 의 실측값 + 위키 개선안·지표·법규 + 01 의 골격"], ["출력", "절별 본문 초안 + 시계열"]],
  },
  {
    no: "04", name: "정리", owner: "사무실 작성자", tone: "office",
    lead: "제출 형식에 맞춰 다듬습니다.",
    body: [
      "AI 초안은 내용이 맞아도 형식이 어긋납니다. 고객사 양식, 절 번호, 표 형식, 문체는 사람이 맞춥니다.",
      "편집 중에 각 문장의 근거를 즉시 볼 수 있어야 합니다. 근거를 못 보면 고치다가 틀린 문장을 만듭니다.",
    ],
    io: [["입력", "03 의 초안"], ["출력", "제출 형식에 맞춘 보고서"]],
  },
  {
    no: "05", name: "승인", owner: "현장 책임자", tone: "lead",
    lead: "검증하고 확정합니다. 위키 자산이 됩니다.",
    body: [
      "승인은 되돌릴 수 없는 지점입니다. 승인 전까지 이 보고서는 다른 문서가 인용할 수 없고, 승인 후에는 팀의 공식 견해가 되어 다음 진단의 자산이 됩니다.",
    ],
    io: [["입력", "04 의 정리본"], ["출력", "확정 보고서 + 위키 자산 승격"]],
  },
];

/** 경계를 흐리면 보고서 전체의 신뢰가 한 번에 무너진다. */
const BOUNDARY: { work: string; who: string; tone: Tone | "code"; why: string }[] = [
  { work: "자료 검색·요약", who: "AI", tone: "ai", why: "사람보다 빠짐없이 훑습니다" },
  { work: "시계열 집계", who: "AI", tone: "ai", why: "사람의 기억으로는 안 잡힙니다" },
  { work: "문장 작성", who: "AI", tone: "ai", why: "초안 수준이면 충분합니다" },
  { work: "계산", who: "코드", tone: "code", why: "같은 입력에 같은 숫자가 나와야 합니다" },
  { work: "해당/비해당 판정", who: "현장 경력자", tone: "field", why: "눈으로 봐야 압니다" },
  { work: "다룰 범위 결정", who: "사무실 작성자", tone: "office", why: "수주 범위·고객 사정이 걸립니다" },
  { work: "승인", who: "현장 책임자", tone: "lead", why: "책임이 따릅니다" },
];

const SERVICES = [
  {
    href: "https://work.ets0404.com/", icon: BookOpen, name: "LLM Wiki",
    host: "work.ets0404.com", lead: "위키 · 체크리스트",
    desc: "설비와 개선안(ECM)을 문서로 쌓고, 현장에 들고 나갈 체크리스트를 만듭니다.",
    stages: "02 현장 · 03 채움 · 05 승인",
  },
  {
    href: "https://rag.ets0404.com/", icon: Search, name: "RAG 검색",
    host: "rag.ets0404.com", lead: "자료 검색 · 분석",
    desc: "과거 보고서와 원본 자료를 검색하고 질문해 초기 파악을 합니다.",
    stages: "01 골격",
  },
];

export default function OverviewPage() {
  usePageMeta("작업 개요", "진단 보고서 작업 프로세스 — 역할 분담과 도구");

  return (
    <WorkShell>
      <div className="work-container">
        <header className="work-page-head">
          <div>
            <span className="eyebrow">OVERVIEW</span>
            <h1>진단 보고서는 이렇게 만듭니다</h1>
            <p>사람은 판단하고, AI는 채우고, 계산은 코드가 합니다. 한 건이 다섯 단계를 거칩니다.</p>
          </div>
        </header>

        <section className="work-panel">
          <div className="ov-order">
            <strong>골격이 체크리스트를 결정합니다.</strong> 무엇을 보고서에 쓸지 정해야 현장에서
            무엇을 확인할지가 정해집니다. 반대로 하면 재방문이 생깁니다 — 쓰려고 보니 그 값이 없는 상황입니다.
          </div>

          <ol className="ov-stages">
            {STAGES.map((s) => (
              <li key={s.no} className={`ov-stage tone-${s.tone}`}>
                <div className="ov-stage-head">
                  <span className="ov-no">{s.no}</span>
                  <h2>{s.name}</h2>
                  <span className="ov-owner">{s.owner}</span>
                </div>
                <div className="ov-stage-grid">
                  <div className="ov-stage-body">
                    <p className="ov-lead">{s.lead}</p>
                    {s.body.map((p) => <p key={p}>{p}</p>)}
                  </div>
                  <dl className="ov-io">
                    {s.io.map(([k, v]) => (
                      <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
                    ))}
                  </dl>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="work-panel">
          <div className="work-panel-head">
            <div>
              <span className="eyebrow">BOUNDARY</span>
              <h2>사람과 AI의 경계</h2>
              <p>무엇을 AI에 맡기지 <b>않을지</b>를 먼저 못 박아야 합니다.</p>
            </div>
          </div>
          <div className="ov-table-scroll">
            <table className="ov-table">
              <thead><tr><th>일</th><th>누가</th><th>왜</th></tr></thead>
              <tbody>
                {BOUNDARY.map((r) => (
                  <tr key={r.work} className={r.tone === "ai" ? "" : "hard"}>
                    <th>{r.work}</th>
                    <td className={`ov-who tone-${r.tone}`}>{r.who}</td>
                    <td>{r.why}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="ov-foot">
            절감량·회수기간은 코드가 계산하고 AI는 결과를 문장으로 옮깁니다.
            AI가 계산하면 같은 입력에 다른 숫자가 나올 수 있어 검산이 불가능합니다.
            보고서의 숫자에는 <b>측정값 → 산식 → 결과</b>가 항상 따라다녀야 합니다.
          </p>
        </section>

        <section className="work-panel">
          <div className="work-panel-head">
            <div>
              <span className="eyebrow">TOOLS</span>
              <h2>어느 도구를 언제 쓰나</h2>
              <p>경계는 기능이 아니라 자료의 상태로 긋습니다 — 아직 이해 중인가, 이미 이해해서 재사용할 것인가.</p>
            </div>
          </div>
          <div className="process-services">
            {SERVICES.map((s) => {
              const Icon = s.icon;
              return (
                <a key={s.host} className="process-service" href={s.href} target="_blank" rel="noreferrer">
                  <div className="pv-top"><Icon size={22} /><ArrowUpRight size={18} /></div>
                  <strong>{s.name}</strong>
                  <span className="pv-lead">{s.lead}</span>
                  <p>{s.desc}</p>
                  <div className="pv-foot">
                    <span className="pv-stages">{s.stages}</span>
                    <span className="pv-host">{s.host}</span>
                  </div>
                </a>
              );
            })}
          </div>
          <p className="process-note">두 서비스는 각각 별도 로그인이 필요합니다. 계정이 없으면 담당자에게 요청하세요.</p>
        </section>
      </div>
    </WorkShell>
  );
}
