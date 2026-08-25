import { type FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, ClipboardCheck, Plus, Search, ShieldCheck } from "lucide-react";
import { WorkShell } from "@/pages/work/WorkShell";
import { diagnosesApi, wikiApi, type CalcNote, type Diagnosis } from "@/lib/platform";
import { usePageMeta } from "@/lib/use-page-meta";

const EMPTY = {
  facilityName: "",
  sector: "building",
  region: "",
  auditYear: new Date().getFullYear(),
  unitBasisValue: 0,
  annualElectricityKwh: 0,
  annualFuelToe: 0,
  measurementBasis: "documented" as Diagnosis["measurementBasis"],
  measurementPeriod: "",
  acl: "confidential" as Diagnosis["acl"],
  equipmentTags: "",
  note: ""
};

/** 진단 프로젝트 원장 — 등록, 목록, 유사 사례 검색(UC1). */
export default function DiagnosisListPage() {
  usePageMeta("진단 프로젝트", "에너지진단 건 등록과 유사 사례 검색");
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY);
  const [formOpen, setFormOpen] = useState(false);
  const [notes, setNotes] = useState<CalcNote[]>([]);
  const [similarOpen, setSimilarOpen] = useState(false);
  const [query, setQuery] = useState({ sector: "building", unitBasisValue: 0, equipment: "" });

  const taxonomy = useQuery({ queryKey: ["wiki", "taxonomy"], queryFn: () => wikiApi.taxonomy(), retry: false });
  const list = useQuery({ queryKey: ["diagnoses", "list"], queryFn: () => diagnosesApi.list(), retry: false });

  const sectorName = (code: string) =>
    taxonomy.data?.sectors.find((item) => item.code === code)?.name ?? code;
  const unitBasis = (code: string) =>
    taxonomy.data?.sectors.find((item) => item.code === code)?.unitBasis ?? "";

  const create = useMutation({
    mutationFn: () => diagnosesApi.create(form),
    onSuccess: (result) => {
      toast.success("진단 건을 등록했습니다.");
      setNotes(result.notes);
      setForm(EMPTY);
      setFormOpen(false);
      queryClient.invalidateQueries({ queryKey: ["diagnoses"] });
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "등록에 실패했습니다.")
  });

  const similar = useMutation({
    mutationFn: () =>
      diagnosesApi.similar({
        sector: query.sector,
        unitBasisValue: query.unitBasisValue || undefined,
        equipment: query.equipment.split(",").map((item) => item.trim()).filter(Boolean)
      }),
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "검색에 실패했습니다.")
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    create.mutate();
  };

  return (
    <WorkShell>
      <div className="work-container">
        <header className="work-page-head">
          <div>
            <span className="eyebrow">DIAGNOSIS LEDGER</span>
            <h1>진단 프로젝트</h1>
            <p>진단 건의 정량 데이터가 여기 쌓여야 유사 사례 검색·ECM 추천·원단위 벤치마크가 작동합니다.</p>
          </div>
          <button className="button primary" type="button" onClick={() => setFormOpen((open) => !open)}>
            <Plus size={16} /> {formOpen ? "닫기" : "진단 건 등록"}
          </button>
        </header>

        {formOpen && (
          <form className="work-panel diagnosis-form" onSubmit={onSubmit}>
            <h2>새 진단 건</h2>
            <div className="field-grid">
              <label>사업장명<input value={form.facilityName} onChange={(event) => setForm({ ...form, facilityName: event.target.value })} required placeholder="한빛 제1공장" /></label>
              <label>업종
                <select value={form.sector} onChange={(event) => setForm({ ...form, sector: event.target.value })}>
                  {taxonomy.data?.sectors.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
                </select>
              </label>
              <label>지역<input value={form.region} onChange={(event) => setForm({ ...form, region: event.target.value })} placeholder="경기" /></label>
              <label>진단 연도<input type="number" value={form.auditYear} onChange={(event) => setForm({ ...form, auditYear: Number(event.target.value) || 0 })} /></label>
              <label>
                원단위 분모 <em>({unitBasis(form.sector)})</em>
                <input type="number" value={form.unitBasisValue} onChange={(event) => setForm({ ...form, unitBasisValue: Number(event.target.value) || 0 })} placeholder="연면적/생산량/처리량" />
              </label>
              <label>연간 전력사용량 (kWh)<input type="number" value={form.annualElectricityKwh} onChange={(event) => setForm({ ...form, annualElectricityKwh: Number(event.target.value) || 0 })} /></label>
              <label>연간 연료 (toe)<input type="number" step="0.001" value={form.annualFuelToe} onChange={(event) => setForm({ ...form, annualFuelToe: Number(event.target.value) || 0 })} /></label>
              <label>측정 근거
                <select value={form.measurementBasis} onChange={(event) => setForm({ ...form, measurementBasis: event.target.value as Diagnosis["measurementBasis"] })}>
                  <option value="measured">실측</option>
                  <option value="estimated">추정</option>
                  <option value="design">설계값</option>
                  <option value="documented">문서 인용</option>
                </select>
              </label>
              <label>측정 기간<input value={form.measurementPeriod} onChange={(event) => setForm({ ...form, measurementPeriod: event.target.value })} placeholder="2025-01 ~ 2025-12" /></label>
              <label>보안 등급
                <select value={form.acl} onChange={(event) => setForm({ ...form, acl: event.target.value as Diagnosis["acl"] })}>
                  <option value="internal">내부 — 보고서 초안 생성 가능</option>
                  <option value="confidential">기밀 — 외부 전송 차단</option>
                  <option value="restricted">제한 — 외부 전송 차단</option>
                </select>
              </label>
              <label className="wide">주요 설비 (쉼표 구분)<input value={form.equipmentTags} onChange={(event) => setForm({ ...form, equipmentTags: event.target.value })} placeholder="보일러, 냉동기, 압축기" /></label>
              <label className="wide">비고<textarea value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} rows={3} /></label>
            </div>
            <p className="contract-hint">
              환산에너지(toe)·온실가스·원단위는 입력값이 아니라 <strong>계수 표를 참조한 코드 계산</strong>으로 산출됩니다.
            </p>
            <button className="button primary" type="submit" disabled={create.isPending}>
              {create.isPending ? "등록 중…" : "등록"}
            </button>
          </form>
        )}

        {notes.length > 0 && (
          <div className="calc-notes">
            <AlertTriangle size={16} />
            <div>
              <strong>계산 메모</strong>
              <ul>{notes.map((note) => <li key={note.message} className={note.level}>{note.message}</li>)}</ul>
            </div>
          </div>
        )}

        <section className="work-panel">
          <div className="work-panel-head">
            <div>
              <span className="eyebrow">UC1 · SIMILAR CASES</span>
              <h2>유사 사례 검색</h2>
              <p>업종·규모·설비 조건으로 과거 진단 건을 찾습니다.</p>
            </div>
            <button className="button outline" type="button" onClick={() => setSimilarOpen((open) => !open)}>
              <Search size={15} /> {similarOpen ? "닫기" : "조건 입력"}
            </button>
          </div>

          {similarOpen && (
            <>
              <div className="field-grid">
                <label>업종
                  <select value={query.sector} onChange={(event) => setQuery({ ...query, sector: event.target.value })}>
                    {taxonomy.data?.sectors.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
                  </select>
                </label>
                <label>규모 ({unitBasis(query.sector)})<input type="number" value={query.unitBasisValue} onChange={(event) => setQuery({ ...query, unitBasisValue: Number(event.target.value) || 0 })} /></label>
                <label className="wide">설비 (쉼표 구분)<input value={query.equipment} onChange={(event) => setQuery({ ...query, equipment: event.target.value })} placeholder="흡수식 냉동기, 공조기" /></label>
              </div>
              <button className="button primary" type="button" onClick={() => similar.mutate()} disabled={similar.isPending}>
                {similar.isPending ? "검색 중…" : "유사 사례 찾기"}
              </button>

              {similar.data && (
                <div className="similar-list">
                  {!similar.data.matches.length && <p className="muted">조건에 맞는 과거 진단 건이 없습니다.</p>}
                  {similar.data.matches.map((match) => (
                    <Link className="similar-card" key={match.diagnosis.id} to={`/work/diagnosis/${match.diagnosis.code}`}>
                      <div>
                        <strong>{match.diagnosis.facilityName}</strong>
                        <span>{sectorName(match.diagnosis.sector)} · {match.diagnosis.auditYear} · 원단위 {match.diagnosis.energyIntensity.toFixed(4)}</span>
                      </div>
                      <div className="similar-reasons">
                        {match.reasons.map((reason) => <span key={reason}>{reason}</span>)}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </section>

        <section className="work-panel">
          <div className="work-panel-head">
            <div>
              <span className="eyebrow">LEDGER</span>
              <h2>진단 건 {list.data?.diagnoses.length ?? 0}건</h2>
            </div>
          </div>

          {list.isPending && <p className="muted">불러오는 중…</p>}
          {list.data && !list.data.diagnoses.length && (
            <div className="empty-state">
              <h3>등록된 진단 건이 없습니다.</h3>
              <p>진단 건을 등록하면 벤치마크와 ECM 추천이 함께 채워집니다.</p>
            </div>
          )}

          {Boolean(list.data?.diagnoses.length) && (
            <div className="table-scroll">
              <table className="work-table">
                <thead>
                  <tr><th>사업장</th><th>업종</th><th>연도</th><th className="num">환산에너지(toe)</th><th className="num">원단위</th><th>검산</th><th>등급</th></tr>
                </thead>
                <tbody>
                  {list.data?.diagnoses.map((diagnosis) => (
                    <tr key={diagnosis.id}>
                      <td><Link to={`/work/diagnosis/${diagnosis.code}`}>{diagnosis.facilityName}</Link></td>
                      <td>{sectorName(diagnosis.sector)}</td>
                      <td className="num">{diagnosis.auditYear || "-"}</td>
                      <td className="num">{diagnosis.annualEnergyToe.toLocaleString("ko-KR")}</td>
                      <td className="num">{diagnosis.energyIntensity ? diagnosis.energyIntensity.toFixed(4) : "-"}</td>
                      <td>
                        {diagnosis.numericVerified
                          ? <span className="sev ok"><ShieldCheck size={12} /> 완료</span>
                          : <span className="sev warn"><ClipboardCheck size={12} /> 대기</span>}
                      </td>
                      <td>{diagnosis.acl}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </WorkShell>
  );
}
