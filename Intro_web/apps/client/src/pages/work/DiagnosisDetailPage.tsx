import { type FormEvent, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, CheckCircle2, FileText, Lightbulb, Plus, Trash2 } from "lucide-react";
import { WorkShell } from "@/pages/work/WorkShell";
import { diagnosesApi, wikiApi, type MeasureCandidate } from "@/lib/platform";
import { usePageMeta } from "@/lib/use-page-meta";

const EMPTY_MEASURE = {
  measureSlug: "",
  savingKwh: 0,
  savingToe: 0,
  investmentKrw: 0,
  annualSavingKrw: 0,
  adopted: false,
  adoptionNote: ""
};

/** 진단 건 상세 — 지표, 커버리지 갭, ECM 실적·추천(UC2), 보고서 초안(UC3). */
export default function DiagnosisDetailPage() {
  const { code = "" } = useParams();
  const queryClient = useQueryClient();
  const [measureForm, setMeasureForm] = useState(EMPTY_MEASURE);
  const [measureOpen, setMeasureOpen] = useState(false);
  const [draft, setDraft] = useState<{ draft: string; unverified: string[] } | null>(null);

  const detail = useQuery({
    queryKey: ["diagnoses", "detail", code],
    queryFn: () => diagnosesApi.get(code),
    retry: false
  });
  const taxonomy = useQuery({ queryKey: ["wiki", "taxonomy"], queryFn: () => wikiApi.taxonomy(), retry: false });

  const diagnosis = detail.data?.diagnosis;
  usePageMeta(diagnosis?.facilityName ?? "진단 건", "에너지진단 상세");

  const recommend = useQuery({
    queryKey: ["wiki", "recommend", diagnosis?.sector, diagnosis?.equipmentTags],
    queryFn: () =>
      wikiApi.recommend(
        diagnosis?.sector ?? "other",
        (diagnosis?.equipmentTags ?? "").split(",").map((item) => item.trim()).filter(Boolean)
      ),
    enabled: Boolean(diagnosis),
    retry: false
  });

  const addMeasure = useMutation({
    mutationFn: () => diagnosesApi.addMeasure(code, measureForm),
    onSuccess: (result) => {
      toast.success("개선안 실적을 등록했습니다.");
      result.notes.forEach((note) => note.level === "block" && toast.warning(note.message));
      setMeasureForm(EMPTY_MEASURE);
      setMeasureOpen(false);
      queryClient.invalidateQueries({ queryKey: ["diagnoses", "detail", code] });
      queryClient.invalidateQueries({ queryKey: ["wiki", "recommend"] });
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "등록에 실패했습니다.")
  });

  const removeMeasure = useMutation({
    mutationFn: (id: string) => diagnosesApi.removeMeasure(code, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["diagnoses", "detail", code] }),
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "삭제에 실패했습니다.")
  });

  const generateDraft = useMutation({
    mutationFn: () => wikiApi.reportDraft(code),
    onSuccess: (result) => setDraft(result),
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "초안 생성에 실패했습니다.")
  });

  if (detail.isPending) {
    return <WorkShell><div className="guard-loading"><div className="guard-spinner" /><p>불러오는 중…</p></div></WorkShell>;
  }

  if (detail.isError || !diagnosis) {
    return (
      <WorkShell>
        <div className="work-container empty-state">
          <h3>진단 건을 찾을 수 없습니다.</h3>
          <Link className="button primary" to="/work/diagnosis">진단 목록으로</Link>
        </div>
      </WorkShell>
    );
  }

  const profile = taxonomy.data?.sectors.find((item) => item.code === diagnosis.sector);
  const gaps = detail.data?.gaps ?? [];
  const measures = detail.data?.measures ?? [];
  const externalSafe = diagnosis.acl === "public" || diagnosis.acl === "internal";

  const applyCandidate = (candidate: MeasureCandidate) => {
    setMeasureForm({ ...EMPTY_MEASURE, measureSlug: candidate.slug });
    setMeasureOpen(true);
  };

  const onSubmitMeasure = (event: FormEvent) => {
    event.preventDefault();
    addMeasure.mutate();
  };

  return (
    <WorkShell>
      <div className="work-container">
        <Link className="text-link" to="/work/diagnosis"><ArrowLeft size={16} /> 진단 목록</Link>

        <header className="work-page-head">
          <div>
            <span className="eyebrow">{diagnosis.code}</span>
            <h1>{diagnosis.facilityName}</h1>
            <p>
              {profile?.name ?? diagnosis.sector} · {diagnosis.region || "지역 미기재"} · {diagnosis.auditYear || "연도 미기재"}
              {" · "}측정근거 {diagnosis.measurementBasis} {diagnosis.measurementPeriod}
            </p>
          </div>
        </header>

        <div className={diagnosis.numericVerified ? "contract-strip verified" : "contract-strip"}>
          {diagnosis.numericVerified ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{diagnosis.numericVerified ? "수치 검산 완료" : "수치 검산 전 — 벤치마크·보고서에 반영되지 않습니다"}</span>
          <i />
          <span>보안 등급 {diagnosis.acl}</span>
          <i />
          <span>{externalSafe ? "보고서 초안 생성 가능" : "외부 모델 전송 차단"}</span>
        </div>

        <div className="metric-cards">
          <div><span>연간 전력</span><strong>{diagnosis.annualElectricityKwh.toLocaleString("ko-KR")}</strong><em>kWh</em></div>
          <div><span>연간 연료</span><strong>{diagnosis.annualFuelToe.toLocaleString("ko-KR")}</strong><em>toe</em></div>
          <div><span>환산에너지</span><strong>{diagnosis.annualEnergyToe.toLocaleString("ko-KR")}</strong><em>toe · 계산값</em></div>
          <div><span>온실가스</span><strong>{diagnosis.annualGhgTco2eq.toLocaleString("ko-KR")}</strong><em>tCO2eq · 계산값</em></div>
          <div><span>에너지 원단위</span><strong>{diagnosis.energyIntensity ? diagnosis.energyIntensity.toFixed(4) : "-"}</strong><em>{profile?.unitBasis ?? ""}</em></div>
        </div>

        {gaps.length > 0 && (
          <div className="calc-notes">
            <AlertTriangle size={16} />
            <div>
              <strong>{profile?.name} 필수지표 커버리지 갭 {gaps.length}건</strong>
              <ul>{gaps.map((gap) => <li key={gap.code} className="warn">{gap.label} 이(가) 확인되지 않습니다.</li>)}</ul>
            </div>
          </div>
        )}

        <section className="work-panel">
          <div className="work-panel-head">
            <div>
              <span className="eyebrow">UC2 · ECM CANDIDATES</span>
              <h2>적용 가능 개선안</h2>
              <p>업종·설비 조건에 맞는 ECM 카드와 과거 진단에서의 실제 회수기간입니다.</p>
            </div>
          </div>

          {recommend.isPending && <p className="muted">추천을 계산하는 중…</p>}
          {recommend.data && !recommend.data.candidates.length && (
            <p className="muted">조건에 맞는 ECM 카드가 없습니다. 위키에 개선안 카드를 먼저 등록해 주세요.</p>
          )}

          <div className="candidate-grid">
            {recommend.data?.candidates.map((candidate) => (
              <article className="candidate-card" key={candidate.slug}>
                <div className="candidate-head">
                  <Lightbulb size={16} />
                  <Link to={`/work/wiki/${candidate.slug}`}>{candidate.title}</Link>
                </div>
                <p>{candidate.summary}</p>
                <div className="candidate-tags">
                  {candidate.matchedOn.map((reason) => <span key={reason}>{reason}</span>)}
                </div>
                <div className="candidate-stats">
                  <span>과거 적용 {candidate.cases}건 (채택 {candidate.adoptedCases})</span>
                  {candidate.paybackYears ? (
                    <span>회수기간 {candidate.paybackYears.min}~{candidate.paybackYears.max}년 (중앙값 {candidate.paybackYears.median})</span>
                  ) : (
                    <span className="muted">검산된 회수기간 실적 없음</span>
                  )}
                </div>
                <button className="button outline small" type="button" onClick={() => applyCandidate(candidate)}>
                  <Plus size={14} /> 이 진단에 적용 실적 추가
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className="work-panel">
          <div className="work-panel-head">
            <div>
              <span className="eyebrow">APPLIED MEASURES</span>
              <h2>개선안 실적 {measures.length}건</h2>
              <p>회수기간은 입력값이 아니라 투자비 ÷ 연간 절감액으로 계산됩니다.</p>
            </div>
            <button className="button outline" type="button" onClick={() => setMeasureOpen((open) => !open)}>
              <Plus size={15} /> {measureOpen ? "닫기" : "실적 추가"}
            </button>
          </div>

          {measureOpen && (
            <form className="measure-form" onSubmit={onSubmitMeasure}>
              <div className="field-grid">
                <label className="wide">ECM 슬러그<input value={measureForm.measureSlug} onChange={(event) => setMeasureForm({ ...measureForm, measureSlug: event.target.value })} required placeholder="ecm-waste-heat-recovery-boiler" /></label>
                <label>절감 전력량 (kWh)<input type="number" value={measureForm.savingKwh} onChange={(event) => setMeasureForm({ ...measureForm, savingKwh: Number(event.target.value) || 0 })} /></label>
                <label>절감 에너지 (toe)<input type="number" step="0.001" value={measureForm.savingToe} onChange={(event) => setMeasureForm({ ...measureForm, savingToe: Number(event.target.value) || 0 })} /></label>
                <label>투자비 (원)<input type="number" value={measureForm.investmentKrw} onChange={(event) => setMeasureForm({ ...measureForm, investmentKrw: Number(event.target.value) || 0 })} /></label>
                <label>연간 절감액 (원)<input type="number" value={measureForm.annualSavingKrw} onChange={(event) => setMeasureForm({ ...measureForm, annualSavingKrw: Number(event.target.value) || 0 })} placeholder="비우면 전력단가로 계산" /></label>
                <label className="check-row">
                  <input type="checkbox" checked={measureForm.adopted} onChange={(event) => setMeasureForm({ ...measureForm, adopted: event.target.checked })} /> 실제 채택됨
                </label>
                <label className="wide">채택/미채택 사유<input value={measureForm.adoptionNote} onChange={(event) => setMeasureForm({ ...measureForm, adoptionNote: event.target.value })} placeholder="가동시간 부족으로 미실행" /></label>
              </div>
              <button className="button primary" type="submit" disabled={addMeasure.isPending}>
                {addMeasure.isPending ? "등록 중…" : "등록"}
              </button>
            </form>
          )}

          {measures.length > 0 && (
            <div className="table-scroll">
              <table className="work-table">
                <thead>
                  <tr><th>ECM</th><th className="num">절감(toe)</th><th className="num">투자비(원)</th><th className="num">연간절감(원)</th><th className="num">회수기간</th><th>채택</th><th>검산</th><th /></tr>
                </thead>
                <tbody>
                  {measures.map((measure) => (
                    <tr key={measure.id}>
                      <td><Link to={`/work/wiki/${measure.measureSlug}`}>{measure.measureSlug}</Link></td>
                      <td className="num">{measure.savingToe.toLocaleString("ko-KR")}</td>
                      <td className="num">{measure.investmentKrw.toLocaleString("ko-KR")}</td>
                      <td className="num">{measure.annualSavingKrw.toLocaleString("ko-KR")}</td>
                      <td className="num">{measure.numericVerified ? `${measure.paybackYears}년` : "산출 불가"}</td>
                      <td>{measure.adopted ? "예" : "아니오"}</td>
                      <td><span className={measure.numericVerified ? "sev ok" : "sev warn"}>{measure.numericVerified ? "완료" : "대기"}</span></td>
                      <td><button type="button" className="icon-danger" onClick={() => removeMeasure.mutate(measure.id)} aria-label="삭제"><Trash2 size={14} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="work-panel">
          <div className="work-panel-head">
            <div>
              <span className="eyebrow">UC3 · REPORT DRAFT</span>
              <h2>보고서 초안 생성</h2>
              <p>검산을 통과한 수치만 본문에 들어가고, 나머지는 <code>[검토 필요]</code> 로 남습니다.</p>
            </div>
            <button className="button primary" type="button" onClick={() => generateDraft.mutate()} disabled={generateDraft.isPending || !externalSafe}>
              <FileText size={15} /> {generateDraft.isPending ? "생성 중…" : "초안 생성"}
            </button>
          </div>

          {!externalSafe && (
            <p className="muted">
              이 진단 건은 {diagnosis.acl} 등급이라 외부 모델로 전송할 수 없습니다. 등급을 내리거나 사내 모델 경로가 준비된 뒤 사용하세요.
            </p>
          )}

          {draft && (
            <div className="report-draft">
              {draft.unverified.length > 0 && (
                <p className="draft-warning">
                  <AlertTriangle size={15} /> 미검증 항목 {draft.unverified.length}건이 <code>[검토 필요]</code> 로 남았습니다: {draft.unverified.join(", ")}
                </p>
              )}
              <pre>{draft.draft}</pre>
              <button
                className="button outline small"
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(draft.draft);
                  toast.success("초안을 복사했습니다.");
                }}
              >
                초안 복사
              </button>
            </div>
          )}
        </section>
      </div>
    </WorkShell>
  );
}
