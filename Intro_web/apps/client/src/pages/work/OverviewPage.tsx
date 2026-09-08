import { Fragment } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { WorkShell } from "@/pages/work/WorkShell";
import { usePageMeta } from "@/lib/use-page-meta";

/**
 * 작업 개요 — 진단 보고서가 누구 손을 거쳐 어떻게 완성되는지.
 *
 * 디자인은 별도로 받은 개요도를 옮긴 것이다. 내보내기 산출물(고정 폭·export 속성)은
 * 걷어냈고, 클래스는 전부 `.ovx` 아래로 스코프했다 — .wrap/.step/.tool/.footer 처럼
 * 흔한 이름이라 스코프하지 않으면 사이트의 다른 화면 스타일과 부딪힌다.
 *
 * 상세 기획은 llmwiki 저장소 `design/진단-사이클-기획.md`.
 */

const STEPS = [
  {
    no: "01", role: "사무실 작성자 + LLM", name: "골격",
    lead: "보고서의 큰 틀과 체크리스트를 결정합니다.",
    items: ["과거 보고서·RAG 검색으로 유사 사례 확인", "수주 범위와 고객 상황을 사람이 판단", "위키의 재사용 가능 개선안 연결"],
    out: "진단 목차 + 체크리스트",
  },
  {
    no: "02", role: "현장 경력자", name: "현장",
    lead: "판정과 실측값만 빠르게 올립니다.",
    items: ["설비 상태를 체크리스트 기준으로 판정", "필요한 계측값·사진·운전 조건 입력", "현장 경력자의 시간을 문서 작성에서 분리"],
    out: "판정값 + 실측 데이터",
  },
  {
    no: "03", role: "AI", name: "채움",
    lead: "시계열과 본문 근거를 구조적으로 채웁니다.",
    items: ["같은 설비의 연도별 변화와 이력 수집", "실측값과 위키 자산을 문단별로 조합", "값이 없는 항목은 [미측정] 상태로 보존"],
    out: "근거 연결 본문 초안",
  },
  {
    no: "04", role: "사무실 작성자", name: "정리",
    lead: "제출 형식에 맞춰 검토 가능한 보고서로 다듬습니다.",
    items: ["고객사 양식·절 번호·표 형식 정렬", "근거를 보며 문체와 표현을 편집", "AI 초안의 형식 오류를 사람이 조정"],
    out: "제출용 보고서 초안",
  },
  {
    no: "05", role: "현장 책임자", name: "승인",
    lead: "검증 후 확정하여 조직의 공식 자산으로 만듭니다.",
    items: ["결론·수치·현장 사실의 최종 검증", "승인 전에는 다른 문서가 인용하지 않음", "승인 후에는 다음 진단에 재사용"],
    out: "승인된 위키 자산",
  },
];

const MATRIX: [string, string, string, string][] = [
  ["판단", "현장 맥락\n범위 결정", "판단 근거\n탐색 지원", "—"],
  ["정리", "양식·문체\n최종 편집", "초안 구성\n정보 연결", "표·단위\n일관성 점검"],
  ["계산", "입력값 확인\n결과 해석", "결과 설명\n문장화", "절감량·회수기간\n재현 계산"],
  ["자산화", "승인·책임", "위키 연결\n재사용 제안", "근거·버전\n추적"],
];

/** 도구는 눌러서 바로 들어갈 수 있어야 한다 — 원본 개요도에서는 설명 카드였다. */
const TOOLS = [
  {
    href: "https://work.ets0404.com/", name: "LLM Wiki", type: "위키 · 체크리스트",
    desc: "설비와 개선안(ECM)을 문서로 축적하고, 현장에 들고 나갈 체크리스트를 만듭니다.",
    stage: "활용 단계 · 02 현장 · 03 채움 · 05 승인", host: "work.ets0404.com",
    icon: (
      <svg viewBox="0 0 36 36" role="img" aria-hidden="true">
        <path d="M7 7h15l7 7v15H7z" fill="none" stroke="#187357" strokeWidth="2.4" strokeLinejoin="round" />
        <path d="M22 7v8h8M12 21h12M12 26h8" fill="none" stroke="#187357" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "https://rag.ets0404.com/", name: "RAG 검색", type: "자료 검색 · 초기 분석",
    desc: "과거 보고서와 원본 자료를 검색하고 질문해, 진단의 골격을 세우기 전 필요한 맥락을 빠르게 파악합니다.",
    stage: "활용 단계 · 01 골격", host: "rag.ets0404.com",
    icon: (
      <svg viewBox="0 0 36 36" role="img" aria-hidden="true">
        <circle cx="16" cy="16" r="8.5" fill="none" stroke="#146AA0" strokeWidth="2.6" />
        <path d="M22 22l7 7M13 16h6M16 13v6" fill="none" stroke="#146AA0" strokeWidth="2.6" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function OverviewPage() {
  usePageMeta("작업 개요", "에너지진단 보고서 제작 프로세스 — 사람·AI·코드의 역할 분담");

  return (
    <WorkShell>
      <div className="ovx">
        {/* ── 히어로 ─────────────────────────────── */}
        <section className="ovx-wrap ovx-hero" aria-labelledby="ovx-title">
          <div className="ovx-hero-grid">
            <div>
              <p className="ovx-eyebrow">REPORT MAKING SYSTEM</p>
              <h1 id="ovx-title">진단 보고서는<br />이렇게 만듭니다</h1>
              <p className="ovx-lead">
                사람은 판단하고, AI는 자료를 채우고, 코드는 수치를 계산합니다.
                한 건의 에너지진단이 신뢰도 높은 보고서 자산으로 완성되는 다섯 단계입니다.
              </p>
              <div className="ovx-principles" aria-label="작업 원칙">
                <span className="ovx-pill">사람의 현장 판단</span>
                <span className="ovx-pill">AI 기반 지식 재활용</span>
                <span className="ovx-pill">코드 기반 수치 검산</span>
              </div>
            </div>

            <div className="ovx-art" aria-label="사람, AI, 코드가 연결된 진단 보고서 제작 흐름">
              <svg viewBox="0 0 620 420" role="img" aria-labelledby="ovx-svg-t ovx-svg-d">
                <title id="ovx-svg-t">에너지진단 보고서 제작 원리</title>
                <desc id="ovx-svg-d">현장 판단, AI 지식 탐색, 코드 계산이 보고서로 모여 승인된 위키 자산으로 순환하는 구조도</desc>
                <defs>
                  <linearGradient id="ovx-flow" x1="0" x2="1">
                    <stop stopColor="#0090FF" /><stop offset="1" stopColor="#29A383" />
                  </linearGradient>
                  <filter id="ovx-shadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#1C5180" floodOpacity=".13" />
                  </filter>
                </defs>
                <path d="M145 118 C220 78 260 83 309 137" fill="none" stroke="url(#ovx-flow)" strokeWidth="4" strokeLinecap="round" />
                <path d="M470 118 C396 78 354 83 310 137" fill="none" stroke="#29A383" strokeWidth="4" strokeLinecap="round" />
                <path d="M168 292 C236 347 394 347 453 292" fill="none" stroke="#F5A524" strokeWidth="4" strokeLinecap="round" strokeDasharray="8 9" />
                <path d="M310 212 L310 287" fill="none" stroke="#0090FF" strokeWidth="4" strokeLinecap="round" />
                <g filter="url(#ovx-shadow)">
                  <rect x="53" y="65" width="140" height="104" rx="20" fill="#FFFFFF" stroke="#BFE2FA" strokeWidth="2" />
                  <rect x="427" y="65" width="140" height="104" rx="20" fill="#FFFFFF" stroke="#BCE7D8" strokeWidth="2" />
                  <rect x="214" y="130" width="192" height="112" rx="25" fill="#0090FF" />
                  <rect x="230" y="281" width="160" height="94" rx="20" fill="#1C2024" />
                </g>
                <g fill="none" stroke="#0090FF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="93" cy="99" r="12" />
                  <path d="M75 142c4-18 32-18 36 0M132 101h32M132 119h25M132 137h32" />
                </g>
                <g fill="none" stroke="#29A383" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M469 95h26l12 12v33h-38z" /><path d="M495 95v14h14M479 122h18M479 137h18" />
                </g>
                <g fill="none" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="262" y="158" width="42" height="32" rx="7" />
                  <rect x="320" y="158" width="42" height="32" rx="7" />
                  <path d="M283 190v19M341 190v19M264 210h96" />
                </g>
                <g fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M256 323h58M256 342h34M337 318l10 10 20-24" />
                </g>
                <text x="78" y="157" fill="#146AA0" fontSize="14" fontWeight="800">현장 판단</text>
                <text x="453" y="157" fill="#187357" fontSize="14" fontWeight="800">지식 자산</text>
                <text x="265" y="221" fill="#FFFFFF" fontSize="18" fontWeight="850">AI 조합 · 보완</text>
                <text x="254" y="362" fill="#FFFFFF" fontSize="15" fontWeight="800">검산 가능한 보고서</text>
                <text x="260" y="400" fill="#8E5A00" fontSize="13" fontWeight="800">승인 후, 다음 진단의 공식 자산으로 순환</text>
              </svg>
              <div className="ovx-legend" aria-label="구조도 범례">
                <div className="ovx-legend-item"><span className="ovx-dot" style={{ background: "#0090FF" }} />사람의 판단</div>
                <div className="ovx-legend-item"><span className="ovx-dot" style={{ background: "#29A383" }} />AI·위키 자산</div>
                <div className="ovx-legend-item"><span className="ovx-dot" style={{ background: "#F5A524" }} />검산·승인</div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 5단계 ─────────────────────────────── */}
        <section className="ovx-wrap ovx-process" aria-labelledby="ovx-process-t">
          <div className="ovx-head">
            <div>
              <p className="ovx-eyebrow">5-STEP WORKFLOW</p>
              <h2 id="ovx-process-t">현장 지식이 보고서가 되는 여정</h2>
            </div>
            <p className="ovx-note">
              각 단계는 책임 주체가 다릅니다. 현장 경험이 필요한 판단은 사람이,
              반복 수집은 AI가, 숫자 검증은 코드가 담당합니다.
            </p>
          </div>
          <div className="ovx-track">
            {STEPS.map((s) => (
              <article className="ovx-step" key={s.no}>
                <div className="ovx-step-no">{s.no}</div>
                <span className="ovx-step-role">{s.role}</span>
                <h3>{s.name}</h3>
                <p className="ovx-step-lead">{s.lead}</p>
                <ul>{s.items.map((i) => <li key={i}>{i}</li>)}</ul>
                <div className="ovx-step-foot">OUTPUT · {s.out}</div>
              </article>
            ))}
          </div>
        </section>

        {/* ── 책임 경계 ─────────────────────────── */}
        <section className="ovx-role" aria-labelledby="ovx-boundary-t">
          <div className="ovx-wrap ovx-role-grid">
            <div className="ovx-boundary">
              <p className="ovx-eyebrow">BOUNDARY MAP</p>
              <h2 id="ovx-boundary-t">사람·AI·코드의<br />책임 경계를 명확하게</h2>
              <p className="ovx-boundary-lead">
                무엇을 AI에 맡길지보다, 무엇을 AI에 맡기지 않을지를 먼저 정합니다.
                현장 판단과 책임은 사람이 갖고, AI는 근거를 찾고 조합하며,
                계산은 재현 가능한 코드로 고정합니다.
              </p>
              <div className="ovx-resp">
                <div className="ovx-resp-col ovx-resp-human">
                  <p className="ovx-resp-title"><span className="ovx-resp-icon" aria-hidden="true">H</span>사람이 결정하는 일</p>
                  <ul>
                    <li>진단 범위와 보고서 골격</li>
                    <li>설비 상태의 현장 판정</li>
                    <li>고객사 형식과 표현의 최종 편집</li>
                    <li>결론과 권고안의 승인</li>
                  </ul>
                </div>
                <div className="ovx-resp-col ovx-resp-ai">
                  <p className="ovx-resp-title"><span className="ovx-resp-icon" aria-hidden="true">AI</span>AI가 보완하는 일</p>
                  <ul>
                    <li>과거 문서와 위키 자료 탐색</li>
                    <li>시계열·실측값·근거의 연결</li>
                    <li>초안 문단과 설명의 구조화</li>
                    <li>미측정·누락 상태의 표시</li>
                  </ul>
                </div>
              </div>
              <div className="ovx-code" aria-label="코드 역할 안내">
                <span className="ovx-code-key">CODE</span>
                <p>절감량·회수기간은 같은 입력에서 같은 결과가 나와야 합니다. 수치 계산은 코드가 담당하고, AI는 검증된 결과를 문장으로 옮깁니다.</p>
              </div>
            </div>

            <aside className="ovx-matrix" aria-labelledby="ovx-matrix-t">
              <h3 id="ovx-matrix-t">작업별 책임 매트릭스</h3>
              <p className="ovx-matrix-lead">
                업무를 기능이 아니라 <strong>자료의 상태</strong>로 분리합니다.
                이해·판단이 필요한 자료와, 재사용·검산이 필요한 자료는 처리 방식이 다릅니다.
              </p>
              <div className="ovx-matrix-grid" role="table" aria-label="사람 AI 코드 역할표">
                <div className="ovx-mh" />
                <div className="ovx-mh">사람</div>
                <div className="ovx-mh">AI</div>
                <div className="ovx-mh">코드</div>
                {MATRIX.map(([label, human, ai, code]) => (
                  <Fragment key={label}>
                    <div className="ovx-ml" role="rowheader">{label}</div>
                    <div className="ovx-c-human">{split(human)}</div>
                    <div className="ovx-c-ai">{split(ai)}</div>
                    <div className="ovx-c-code">{split(code)}</div>
                  </Fragment>
                ))}
              </div>
            </aside>
          </div>
        </section>

        {/* ── 도구 ──────────────────────────────── */}
        <section className="ovx-wrap ovx-tools" aria-labelledby="ovx-tools-t">
          <div className="ovx-head">
            <div>
              <p className="ovx-eyebrow">TOOLS BY DATA STATE</p>
              <h2 id="ovx-tools-t">어떤 도구를 언제 쓰나</h2>
            </div>
            <p className="ovx-note">
              도구 선택의 기준은 기능이 아니라 자료의 상태입니다.
              아직 이해 중인 자료는 검색·분석하고, 승인된 지식은 위키·체크리스트로 재사용합니다.
            </p>
          </div>
          <div className="ovx-tool-grid">
            {TOOLS.map((t) => (
              <a className="ovx-tool" key={t.host} href={t.href} target="_blank" rel="noreferrer">
                <div className="ovx-tool-symbol" aria-hidden="true">{t.icon}</div>
                <div>
                  <h3>{t.name}</h3>
                  <span className="ovx-tool-type">{t.type}</span>
                  <p>{t.desc}</p>
                  <div className="ovx-tool-foot">
                    <span className="ovx-tool-stage">{t.stage}</span>
                    <span className="ovx-tool-host">{t.host} ↗</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
          <p className="ovx-tool-note">두 서비스는 각각 별도 로그인이 필요합니다. 계정이 없으면 담당자에게 요청하세요.</p>
        </section>

        {/* ── 다음 단계 ─────────────────────────── */}
        <nav className="ovx-wrap ovx-next" aria-label="다음 단계">
          <div>
            <p className="ovx-eyebrow">NEXT</p>
            <h2>오늘의 업무로</h2>
            <p className="ovx-next-lead">처리할 진단 건과 고객 신청·문의가 대시보드에 모여 있습니다.</p>
          </div>
          <Link className="ovx-next-btn" to="/work">대시보드로 이동 <ArrowRight size={17} /></Link>
        </nav>

        <footer className="ovx-wrap ovx-foot">
          에너지기술서비스 진단 프로세스 · 사람의 판단과 AI의 효율, 코드의 재현성을 하나의 작업 흐름으로 연결합니다.
        </footer>
      </div>
    </WorkShell>
  );
}

/** 매트릭스 칸의 줄바꿈(\n)을 <br /> 로. 원본 개요도가 두 줄로 짜여 있다. */
function split(text: string) {
  const parts = text.split("\n");
  return parts.map((p, i) => (
    <Fragment key={p + i}>{i > 0 && <br />}{p}</Fragment>
  ));
}
