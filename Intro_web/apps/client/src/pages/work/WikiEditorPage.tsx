import { type FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Save, Wand2 } from "lucide-react";
import { WorkShell } from "@/pages/work/WorkShell";
import { wikiApi, type WikiPage } from "@/lib/platform";
import { usePageMeta } from "@/lib/use-page-meta";

const TYPES: Array<{ value: WikiPage["type"]; label: string }> = [
  { value: "source", label: "원문 요약 (source)" },
  { value: "facility", label: "사업장 (facility)" },
  { value: "equipment", label: "설비 (equipment)" },
  { value: "measure", label: "개선안 ECM (measure)" },
  { value: "metric", label: "원단위·지표 (metric)" },
  { value: "regulation", label: "법규·계수 (regulation)" },
  { value: "vendor", label: "공급사 (vendor)" },
  { value: "diagnosis", label: "진단 건 (diagnosis)" },
  { value: "concept", label: "인사이트 (concept)" }
];

const TEMPLATES: Partial<Record<WikiPage["type"], string>> = {
  measure: `## 요약

## 적용 조건
- 

## 산출 근거
| 항목 | 산출 방법 | 출처 |
|---|---|---|
|  |  |  |

> 수치는 이 페이지에서 생성하지 않는다. 값은 진단 건에서 계산되고 검산을 거친다.

## 검토 시 흔한 함정
- 

## 관련
[[관련-문서-슬러그]]
`,
  regulation: `## 사용 원칙
값은 최신 고시 원문에서 확인해 인용한다.

## 적용 범위

## 갱신 이력
- 
`,
  source: `## 문서 개요

## 핵심 수치 (원문 인용)

## 확인 필요 사항
- 
`
};

const DEFAULT_TEMPLATE = `## 개요

## 현황

## 문제점

## 관련
[[관련-문서-슬러그]]
`;

/** 위키 문서 작성/수정. 데이터 컨트랙트 필드가 사이드바에 모두 노출된다. */
export default function WikiEditorPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(slug);
  usePageMeta(editing ? "위키 문서 수정" : "위키 문서 작성", "LLM Wiki 편집");

  const taxonomy = useQuery({ queryKey: ["wiki", "taxonomy"], queryFn: () => wikiApi.taxonomy(), retry: false });

  const existing = useQuery({
    queryKey: ["wiki", "detail", slug],
    queryFn: () => wikiApi.get(slug as string),
    enabled: editing,
    retry: false
  });

  const [form, setForm] = useState({
    title: "",
    slug: "",
    type: "concept" as WikiPage["type"],
    summary: "",
    tags: "",
    sourceRef: "",
    sector: "other",
    measurementBasis: "documented" as WikiPage["measurementBasis"],
    measurementPeriod: "",
    confidence: "medium" as WikiPage["confidence"],
    numericVerified: false,
    owner: "",
    validUntil: "",
    acl: "internal" as WikiPage["acl"],
    status: "draft" as WikiPage["status"],
    body: DEFAULT_TEMPLATE,
    note: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [classifying, setClassifying] = useState(false);

  useEffect(() => {
    const page = existing.data?.page;
    if (!page) return;
    setForm({
      title: page.title,
      slug: page.slug,
      type: page.type,
      summary: page.summary,
      tags: page.tags,
      sourceRef: page.sourceRef,
      sector: page.sector,
      measurementBasis: page.measurementBasis,
      measurementPeriod: page.measurementPeriod,
      confidence: page.confidence,
      numericVerified: page.numericVerified,
      owner: page.owner,
      validUntil: page.validUntil,
      acl: page.acl,
      status: page.status,
      body: page.body,
      note: ""
    });
  }, [existing.data]);

  const update = (patch: Partial<typeof form>) => setForm((current) => ({ ...current, ...patch }));

  const changeType = (type: WikiPage["type"]) => {
    const template = TEMPLATES[type] ?? DEFAULT_TEMPLATE;
    const untouched = !editing && (form.body === DEFAULT_TEMPLATE || Object.values(TEMPLATES).includes(form.body));
    update({ type, ...(untouched ? { body: template } : {}) });
  };

  const classify = async () => {
    if (!form.body.trim()) return;
    setClassifying(true);
    try {
      const result = await wikiApi.classify(`${form.title}\n${form.summary}\n${form.tags}\n${form.body}`);
      if (result.sector === "other") {
        toast.info(result.reason);
      } else {
        update({ sector: result.sector });
        toast.success(`업종 자동분류: ${result.reason} (신뢰도 ${Math.round(result.confidence * 100)}%)`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "분류에 실패했습니다.");
    } finally {
      setClassifying(false);
    }
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      const { page } = editing ? await wikiApi.update(slug as string, form) : await wikiApi.create(form);
      toast.success(editing ? "문서를 저장했습니다." : "문서를 만들었습니다.");
      navigate(`/work/wiki/${page.slug}`, { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "저장에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <WorkShell>
      <div className="work-container">
        <button className="text-link" type="button" onClick={() => navigate(-1)}><ArrowLeft size={16} /> 뒤로</button>

        <form className="wiki-editor" onSubmit={onSubmit}>
          <div className="wiki-editor-main">
            <input
              className="wiki-title-input"
              value={form.title}
              onChange={(event) => update({ title: event.target.value })}
              placeholder="문서 제목 (예: 폐열회수 — 보일러 배가스 이코노마이저)"
              required
            />
            <textarea
              className="wiki-body-input"
              value={form.body}
              onChange={(event) => update({ body: event.target.value })}
              placeholder="Markdown 본문. 다른 문서는 [[슬러그]] 로 연결합니다."
              rows={28}
            />
            {editing && (
              <input
                className="wiki-note-input"
                value={form.note}
                onChange={(event) => update({ note: event.target.value })}
                placeholder="변경 사유 (리비전 로그에 기록됩니다)"
              />
            )}
          </div>

          <aside className="wiki-editor-side">
            <div className="contract-group">
              <span className="contract-label">식별</span>
              <label>슬러그<input value={form.slug} onChange={(event) => update({ slug: event.target.value })} placeholder="ecm-waste-heat-recovery" /></label>
              <label>유형
                <select value={form.type} onChange={(event) => changeType(event.target.value as WikiPage["type"])}>
                  {TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>
              <label>업종
                <select value={form.sector} onChange={(event) => update({ sector: event.target.value })}>
                  {taxonomy.data?.sectors.map((item) => (
                    <option key={item.code} value={item.code}>{item.name}</option>
                  ))}
                </select>
              </label>
              <button className="button outline small" type="button" onClick={() => void classify()} disabled={classifying}>
                <Wand2 size={14} /> {classifying ? "분류 중…" : "본문으로 업종 자동분류"}
              </button>
            </div>

            <div className="contract-group">
              <span className="contract-label">내용</span>
              <label>요약<textarea value={form.summary} onChange={(event) => update({ summary: event.target.value })} rows={4} placeholder="한 문장 요약 (검색·AI 근거로 쓰입니다)" /></label>
              <label>태그<input value={form.tags} onChange={(event) => update({ tags: event.target.value })} placeholder="폐열회수, 보일러, 산업체" /></label>
            </div>

            <div className="contract-group">
              <span className="contract-label">출처 · 근거</span>
              <label>출처(source_span)<input value={form.sourceRef} onChange={(event) => update({ sourceRef: event.target.value })} placeholder="2024 한빛공장 진단보고서 p.47-48" /></label>
              <label>측정 근거
                <select value={form.measurementBasis} onChange={(event) => update({ measurementBasis: event.target.value as WikiPage["measurementBasis"] })}>
                  <option value="measured">실측 (measured)</option>
                  <option value="estimated">추정 (estimated)</option>
                  <option value="design">설계값 (design)</option>
                  <option value="documented">문서 인용 (documented)</option>
                </select>
              </label>
              <label>측정 기간<input value={form.measurementPeriod} onChange={(event) => update({ measurementPeriod: event.target.value })} placeholder="2025-01 ~ 2025-12" /></label>
              <label>신뢰도
                <select value={form.confidence} onChange={(event) => update({ confidence: event.target.value as WikiPage["confidence"] })}>
                  <option value="high">높음</option>
                  <option value="medium">보통</option>
                  <option value="low">낮음</option>
                </select>
              </label>
              <label className="check-row">
                <input type="checkbox" checked={form.numericVerified} onChange={(event) => update({ numericVerified: event.target.checked })} />
                수치 검산 완료 — 계산식·단위를 확인했습니다
              </label>
              <p className="contract-hint">검산하지 않은 수치는 AI 응답에 인용되지 않습니다. 본문을 수정하면 검산 표시는 자동으로 해제됩니다.</p>
            </div>

            <div className="contract-group">
              <span className="contract-label">관리</span>
              <label>담당자<input value={form.owner} onChange={(event) => update({ owner: event.target.value })} placeholder="에너지진단팀 / 홍길동" /></label>
              <label>보안 등급
                <select value={form.acl} onChange={(event) => update({ acl: event.target.value as WikiPage["acl"] })}>
                  <option value="public">공개 (public)</option>
                  <option value="internal">내부 (internal) — AI 질의 가능</option>
                  <option value="confidential">기밀 (confidential) — 외부 전송 금지</option>
                  <option value="restricted">제한 (restricted) — 외부 전송 금지</option>
                </select>
              </label>
              <label>상태
                <select value={form.status} onChange={(event) => update({ status: event.target.value as WikiPage["status"] })}>
                  <option value="draft">초안</option>
                  <option value="reviewed">검토완료</option>
                  <option value="deprecated">폐기</option>
                </select>
              </label>
              {form.type === "regulation" && (
                <label>유효기간(만료일)<input type="date" value={form.validUntil} onChange={(event) => update({ validUntil: event.target.value })} /></label>
              )}
            </div>

            <button className="button primary wide" type="submit" disabled={submitting}>
              <Save size={16} /> {submitting ? "저장 중…" : "저장"}
            </button>
          </aside>
        </form>
      </div>
    </WorkShell>
  );
}
