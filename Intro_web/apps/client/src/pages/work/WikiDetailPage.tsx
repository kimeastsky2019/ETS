import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, CheckCircle2, History, Link2, Pencil, Shield, Trash2 } from "lucide-react";
import { WorkShell } from "@/pages/work/WorkShell";
import { wikiApi, type WikiPage } from "@/lib/platform";
import { useMember } from "@/hooks/useMember";
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

const BASIS_LABEL: Record<WikiPage["measurementBasis"], string> = {
  measured: "실측",
  estimated: "추정",
  design: "설계값",
  documented: "문서 인용"
};

/** 위키 문서 상세 — 본문, 데이터 컨트랙트, [[링크]], 리비전. */
export default function WikiDetailPage() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useMember();

  const { data, isPending, isError } = useQuery({
    queryKey: ["wiki", "detail", slug],
    queryFn: () => wikiApi.get(slug),
    retry: false
  });

  const taxonomy = useQuery({ queryKey: ["wiki", "taxonomy"], queryFn: () => wikiApi.taxonomy(), retry: false });

  usePageMeta(data?.page.title ?? "위키 문서", "LLM Wiki");

  const remove = async () => {
    if (!window.confirm("이 문서를 삭제할까요? 되돌릴 수 없습니다.")) return;
    try {
      await wikiApi.remove(slug);
      toast.success("문서를 삭제했습니다.");
      navigate("/work/wiki", { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "삭제에 실패했습니다.");
    }
  };

  if (isPending) {
    return <WorkShell><div className="guard-loading"><div className="guard-spinner" /><p>불러오는 중…</p></div></WorkShell>;
  }

  if (isError || !data) {
    return (
      <WorkShell>
        <div className="work-container empty-state">
          <h3>문서를 찾을 수 없습니다.</h3>
          <Link className="button primary" to="/work/wiki">위키 목록으로</Link>
        </div>
      </WorkShell>
    );
  }

  const { page, links, revisions } = data;
  const sectorName = taxonomy.data?.sectors.find((item) => item.code === page.sector)?.name ?? page.sector;
  const externalSafe = page.acl === "public" || page.acl === "internal";

  return (
    <WorkShell>
      <div className="work-container wiki-detail">
        <Link className="text-link" to="/work/wiki"><ArrowLeft size={16} /> 위키 목록</Link>

        <header className="wiki-detail-head">
          <div>
            <div className="wiki-detail-tags">
              <span className="wiki-type">{taxonomy.data?.typeLabels?.[page.type] ?? page.type}</span>
              <span className={`wiki-status status-${page.status}`}>{STATUS_LABEL[page.status]}</span>
              <span className={page.acl === "public" ? "wiki-acl open" : "wiki-acl"}><Shield size={12} /> {ACL_LABEL[page.acl]}</span>
              <span className="wiki-version">v{page.version}</span>
            </div>
            <h1>{page.title}</h1>
            <p>{page.summary}</p>
          </div>
          <div className="wiki-detail-actions">
            <Link className="button outline" to={`/work/wiki/${page.slug}/edit`}><Pencil size={15} /> 수정</Link>
            {isAdmin && <button className="button danger" type="button" onClick={() => void remove()}><Trash2 size={15} /> 삭제</button>}
          </div>
        </header>

        <div className={page.numericVerified ? "contract-strip verified" : "contract-strip"}>
          {page.numericVerified ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{page.numericVerified ? "수치 검산 완료" : "수치 검산 전 — AI 응답에 인용되지 않습니다"}</span>
          <i />
          <span>업종 {sectorName}</span>
          <i />
          <span>근거 {BASIS_LABEL[page.measurementBasis]}{page.measurementPeriod && ` · ${page.measurementPeriod}`}</span>
          <i />
          <span>신뢰도 {page.confidence}</span>
          <i />
          <span>{externalSafe ? "외부 모델 질의 가능" : "사내 경로 전용"}</span>
        </div>

        <div className="wiki-detail-body">
          <article>
            {page.body.split("\n").map((line, index) => {
              if (line.startsWith("## ")) return <h2 key={index}>{line.slice(3)}</h2>;
              if (line.startsWith("# ")) return <h2 key={index}>{line.slice(2)}</h2>;
              if (line.startsWith("> ")) return <blockquote key={index}>{line.slice(2)}</blockquote>;
              if (line.startsWith("|")) return <pre className="table-line" key={index}>{line}</pre>;
              if (line.startsWith("- ")) return <li key={index}>{line.slice(2)}</li>;
              return line.trim() ? <p key={index}>{line}</p> : <br key={index} />;
            })}
          </article>

          <aside>
            <div className="wiki-side-block">
              <h3>데이터 컨트랙트</h3>
              <dl className="contract-list">
                <div><dt>stable_id</dt><dd>{page.slug}</dd></div>
                <div><dt>출처</dt><dd>{page.sourceRef || "미기재"}</dd></div>
                <div><dt>담당자</dt><dd>{page.owner || "미지정"}</dd></div>
                <div><dt>content_hash</dt><dd>{page.contentHash || "-"}</dd></div>
                <div><dt>ingested_by</dt><dd>{page.ingestedBy}</dd></div>
                {page.validUntil && <div><dt>유효기간</dt><dd>~{page.validUntil}</dd></div>}
                {page.tags && <div><dt>태그</dt><dd>{page.tags}</dd></div>}
              </dl>
            </div>

            <div className="wiki-side-block">
              <h3><Link2 size={15} /> 연결 문서</h3>
              {links.length ? (
                <ul>{links.map((target) => <li key={target}><Link to={`/work/wiki/${target}`}>[[{target}]]</Link></li>)}</ul>
              ) : (
                <p className="muted">연결된 문서가 없습니다.</p>
              )}
            </div>

            <div className="wiki-side-block">
              <h3><History size={15} /> 변경 이력</h3>
              <ul>
                {revisions.map((revision) => (
                  <li key={revision.id}>
                    <strong>v{revision.version}</strong> {revision.createdAt.slice(0, 10)}
                    {revision.note && <span> · {revision.note}</span>}
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </WorkShell>
  );
}
