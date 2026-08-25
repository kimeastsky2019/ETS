import { type FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, BookOpen, Bot, CheckCircle2, Plus, Search, Send, Shield, ShieldAlert } from "lucide-react";
import { WorkShell } from "@/pages/work/WorkShell";
import { wikiApi, type AskResult, type WikiPage } from "@/lib/platform";
import { usePageMeta } from "@/lib/use-page-meta";

const STATUS_LABEL: Record<WikiPage["status"], string> = {
  draft: "초안",
  reviewed: "검토완료",
  deprecated: "폐기"
};

const ACL_LABEL: Record<WikiPage["acl"], string> = {
  public: "공개",
  internal: "내부",
  confidential: "기밀",
  restricted: "제한"
};

/** LLM Wiki 목록 + 위키 근거 기반 AI 질의 + Lint 결과. */
export default function WikiListPage() {
  usePageMeta("LLM Wiki", "에너지진단 사내 지식 베이스");
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [sector, setSector] = useState("");
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState<AskResult | null>(null);
  const [lintOpen, setLintOpen] = useState(false);

  const taxonomy = useQuery({ queryKey: ["wiki", "taxonomy"], queryFn: () => wikiApi.taxonomy(), retry: false });
  const pages = useQuery({
    queryKey: ["wiki", "list", q, type, sector],
    queryFn: () => wikiApi.list({ q: q || undefined, type: type || undefined, sector: sector || undefined }),
    retry: false
  });
  const lint = useQuery({ queryKey: ["wiki", "lint"], queryFn: () => wikiApi.lint(), retry: false });

  const typeLabels = taxonomy.data?.typeLabels;
  const report = lint.data?.report;

  const ask = async (event: FormEvent) => {
    event.preventDefault();
    if (!question.trim()) return;
    setAsking(true);
    setAnswer(null);

    try {
      setAnswer(await wikiApi.ask(question.trim()));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "질의에 실패했습니다.");
    } finally {
      setAsking(false);
    }
  };

  return (
    <WorkShell>
      <div className="work-container">
        <header className="work-page-head">
          <div>
            <span className="eyebrow">KNOWLEDGE BASE</span>
            <h1>에너지진단 LLM Wiki</h1>
            <p>진단 사례·설비·개선안(ECM)·법규를 하나의 데이터 컨트랙트로 축적하고, 근거와 함께 다시 꺼내 씁니다.</p>
          </div>
          <Link className="button primary" to="/work/wiki/new"><Plus size={16} /> 새 문서</Link>
        </header>

        <section className="wiki-ask">
          <form onSubmit={ask}>
            <Bot size={20} />
            <input
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="예: 인버터 제어 개선안은 어떤 조건에서 효과가 없나?"
            />
            <button className="button primary" type="submit" disabled={asking}>
              {asking ? "확인 중…" : "질문"} <Send size={15} />
            </button>
          </form>
          <p className="wiki-ask-note">
            <Shield size={14} /> 기밀·제한 등급 문서는 외부 모델로 전송되지 않습니다. 검산을 통과하지 않은 수치는 인용되지 않습니다.
          </p>

          {answer && (
            <div className="wiki-answer">
              <p>{answer.answer}</p>
              {answer.withheld > 0 && (
                <p className="wiki-withheld">
                  <ShieldAlert size={14} /> 기밀 이상 등급 {answer.withheld}건은 검색 대상에서 제외되었습니다.
                </p>
              )}
              {answer.sources.length > 0 && (
                <div className="wiki-sources">
                  <span>근거 문서</span>
                  {answer.sources.map((source) => (
                    <Link key={source.slug} to={`/work/wiki/${source.slug}`}>
                      [{source.slug}]
                      {source.status === "draft" && <em> 초안</em>}
                      {!source.numericVerified && <em> 검산전</em>}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {report && (
          <div className={report.blocking ? "wiki-lint blocking" : "wiki-lint"}>
            {report.blocking ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
            <div>
              <strong>Lint — 차단 {report.blocking}건 · 경고 {report.warnings}건</strong>
              <p>
                문서 {report.total}건 (검토완료 {report.reviewed} · 초안 {report.drafts} · 기밀 {report.confidential}).
                차단 항목이 남아 있으면 해당 문서는 AI 응답에 인용되지 않습니다.
              </p>
              {report.issues.length > 0 && (
                <button type="button" className="lint-toggle" onClick={() => setLintOpen((open) => !open)}>
                  {lintOpen ? "접기" : `전체 ${report.issues.length}건 보기`}
                </button>
              )}
            </div>
          </div>
        )}

        {lintOpen && report && (
          <div className="table-scroll">
            <table className="work-table">
              <thead>
                <tr><th>등급</th><th>분류</th><th>문서</th><th>내용</th></tr>
              </thead>
              <tbody>
                {report.issues.map((issue, index) => (
                  <tr key={`${issue.rule}-${issue.slug}-${index}`}>
                    <td><span className={issue.severity === "block" ? "sev block" : "sev warn"}>{issue.severity === "block" ? "차단" : "경고"}</span></td>
                    <td>{issue.category}</td>
                    <td>
                      {issue.slug.startsWith("factor:")
                        ? <span className="muted">{issue.title}</span>
                        : <Link to={`/work/wiki/${issue.slug}`}>{issue.title}</Link>}
                    </td>
                    <td>{issue.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <section className="work-panel">
          <div className="work-panel-head">
            <div>
              <span className="eyebrow">PAGES</span>
              <h2>문서 {pages.data?.pages.length ?? 0}건</h2>
            </div>
            <div className="search-box">
              <Search size={19} />
              <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="제목·본문·태그 검색 (BM25)" />
            </div>
          </div>

          <div className="category-filters">
            <button type="button" className={type === "" ? "active" : ""} onClick={() => setType("")}>전체 유형</button>
            {typeLabels &&
              (Object.keys(typeLabels) as Array<WikiPage["type"]>).map((key) => (
                <button type="button" key={key} className={type === key ? "active" : ""} onClick={() => setType(key)}>
                  {typeLabels[key]}
                </button>
              ))}
          </div>

          <div className="category-filters subtle">
            <button type="button" className={sector === "" ? "active" : ""} onClick={() => setSector("")}>전체 업종</button>
            {taxonomy.data?.sectors.map((item) => (
              <button type="button" key={item.code} className={sector === item.code ? "active" : ""} onClick={() => setSector(item.code)}>
                {item.name}
              </button>
            ))}
          </div>

          {pages.isPending && <p className="muted">불러오는 중…</p>}
          {pages.isError && <p className="muted">위키를 불러오지 못했습니다.</p>}

          <div className="wiki-grid">
            {pages.data?.pages.map((page) => (
              <Link className="wiki-card" key={page.id} to={`/work/wiki/${page.slug}`}>
                <div className="wiki-card-top">
                  <span className="wiki-type">{typeLabels?.[page.type] ?? page.type}</span>
                  <span className={`wiki-status status-${page.status}`}>{STATUS_LABEL[page.status]}</span>
                </div>
                <h3><BookOpen size={16} /> {page.title}</h3>
                <p>{page.summary || "요약이 없습니다."}</p>
                <div className="wiki-card-foot">
                  <span>{page.slug}</span>
                  <span>v{page.version}</span>
                  {page.acl !== "internal" && <span className={page.acl === "public" ? "wiki-acl open" : "wiki-acl"}><Shield size={12} /> {ACL_LABEL[page.acl]}</span>}
                </div>
              </Link>
            ))}
          </div>

          {pages.data && !pages.data.pages.length && (
            <div className="empty-state">
              <h3>문서가 없습니다.</h3>
              <p>진단 보고서 요약, 개선안(ECM) 카드, 법규 계수부터 등록해 보세요.</p>
              <Link className="button primary" to="/work/wiki/new"><Plus size={16} /> 첫 문서 만들기</Link>
            </div>
          )}
        </section>
      </div>
    </WorkShell>
  );
}
