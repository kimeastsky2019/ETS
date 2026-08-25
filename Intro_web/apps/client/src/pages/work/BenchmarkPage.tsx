import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BarChart3, CheckCircle2, Gauge, ShieldAlert } from "lucide-react";
import { WorkShell } from "@/pages/work/WorkShell";
import { diagnosesApi, wikiApi, type EnergyFactor } from "@/lib/platform";
import { usePageMeta } from "@/lib/use-page-meta";

/** 원단위 벤치마크(UC4) + 환산계수 SSOT 관리(UC5 근거). */
export default function BenchmarkPage() {
  usePageMeta("원단위 벤치마크", "업종별 에너지 원단위 분포와 환산계수 관리");
  const queryClient = useQueryClient();
  const [sector, setSector] = useState("building");
  const [target, setTarget] = useState(0);
  const [edits, setEdits] = useState<Record<string, { value: string; source: string; validUntil: string }>>({});

  const taxonomy = useQuery({ queryKey: ["wiki", "taxonomy"], queryFn: () => wikiApi.taxonomy(), retry: false });
  const benchmark = useQuery({
    queryKey: ["diagnoses", "benchmark", sector, target],
    queryFn: () => diagnosesApi.benchmark(sector, target || undefined),
    retry: false
  });
  const factors = useQuery({ queryKey: ["wiki", "factors"], queryFn: () => wikiApi.factors(), retry: false });

  const saveFactor = useMutation({
    mutationFn: ({ code, patch }: { code: string; patch: Parameters<typeof wikiApi.updateFactor>[1] }) =>
      wikiApi.updateFactor(code, patch),
    onSuccess: () => {
      toast.success("계수를 갱신했습니다.");
      queryClient.invalidateQueries({ queryKey: ["wiki", "factors"] });
      queryClient.invalidateQueries({ queryKey: ["wiki", "lint"] });
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "갱신에 실패했습니다.")
  });

  const report = benchmark.data?.report;
  const unverifiedCount = (factors.data?.factors ?? []).filter((factor) => !factor.verified).length;

  const draftOf = (factor: EnergyFactor) =>
    edits[factor.code] ?? { value: String(factor.value), source: factor.source, validUntil: factor.validUntil };

  const setDraft = (factor: EnergyFactor, patch: Partial<{ value: string; source: string; validUntil: string }>) =>
    setEdits((current) => ({ ...current, [factor.code]: { ...draftOf(factor), ...patch } }));

  const scaleMax = report?.distribution.max || 1;

  return (
    <WorkShell>
      <div className="work-container">
        <header className="work-page-head">
          <div>
            <span className="eyebrow">UC4 · BENCHMARK</span>
            <h1>원단위 벤치마크</h1>
            <p>검산을 통과한 진단 건만 분포에 들어갑니다. 분모가 다른 업종끼리는 비교하지 않습니다.</p>
          </div>
        </header>

        <section className="work-panel">
          <div className="field-grid">
            <label>업종
              <select value={sector} onChange={(event) => setSector(event.target.value)}>
                {taxonomy.data?.sectors.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
              </select>
            </label>
            <label>대상 사업장 원단위 (선택)
              <input type="number" step="0.0001" value={target || ""} onChange={(event) => setTarget(Number(event.target.value) || 0)} placeholder="비교할 값" />
            </label>
          </div>

          {report && report.distribution.count === 0 && (
            <p className="muted">
              {report.sectorName} 업종에 검산 완료된 진단 건이 없습니다. <Link to="/work/diagnosis">진단 건을 먼저 등록</Link>하세요.
            </p>
          )}

          {report && report.distribution.count > 0 && (
            <>
              <p className="benchmark-basis"><Gauge size={15} /> 분모: {report.unitBasis} · 표본 {report.distribution.count}건</p>

              <div className="benchmark-bars">
                {(["min", "p25", "median", "p75", "max"] as const).map((key) => (
                  <div key={key}>
                    <span>{key === "min" ? "최소" : key === "median" ? "중앙값" : key === "max" ? "최대" : key.toUpperCase()}</span>
                    <div className="bar-track"><i style={{ width: `${(report.distribution[key] / scaleMax) * 100}%` }} /></div>
                    <strong>{report.distribution[key].toFixed(4)}</strong>
                  </div>
                ))}
                {target > 0 && (
                  <div className="target-row">
                    <span>대상</span>
                    <div className="bar-track"><i className="target" style={{ width: `${Math.min(100, (target / scaleMax) * 100)}%` }} /></div>
                    <strong>{target.toFixed(4)}</strong>
                  </div>
                )}
              </div>

              {report.percentile !== null && (
                <p className="benchmark-verdict">
                  <BarChart3 size={16} /> 대상 사업장은 {report.sectorName} 표본에서 하위 {report.percentile}% 위치입니다
                  ({report.percentile <= 50 ? "표본 대비 효율이 좋은 편" : "개선 여지가 큰 편"}).
                </p>
              )}

              <div className="table-scroll">
                <table className="work-table">
                  <thead><tr><th>사업장</th><th className="num">연도</th><th className="num">원단위</th></tr></thead>
                  <tbody>
                    {report.samples.map((sample) => (
                      <tr key={sample.code}>
                        <td><Link to={`/work/diagnosis/${sample.code}`}>{sample.facilityName}</Link></td>
                        <td className="num">{sample.auditYear || "-"}</td>
                        <td className="num">{sample.energyIntensity.toFixed(4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        <section className="work-panel">
          <div className="work-panel-head">
            <div>
              <span className="eyebrow">SSOT</span>
              <h2>환산계수 · 단가</h2>
              <p>모든 toe 환산·배출량·절감액 계산이 이 표의 값만 사용합니다.</p>
            </div>
            {unverifiedCount > 0 && (
              <span className="factor-alert"><ShieldAlert size={15} /> 미확인 계수 {unverifiedCount}건</span>
            )}
          </div>

          <p className="contract-hint">
            고시 원문에서 값을 확인한 뒤 <strong>확인 처리</strong>해야 계산 결과가 검산 완료로 표시됩니다.
            확인되지 않은 계수를 쓴 계산은 벤치마크와 보고서 초안에서 제외됩니다.
          </p>

          <div className="table-scroll">
            <table className="work-table factor-table">
              <thead>
                <tr><th>계수</th><th className="num">값</th><th>단위</th><th>출처</th><th>유효기간</th><th>상태</th><th /></tr>
              </thead>
              <tbody>
                {factors.data?.factors.map((factor) => {
                  const draft = draftOf(factor);
                  return (
                    <tr key={factor.code}>
                      <td><strong>{factor.label}</strong><br /><span className="muted">{factor.code}</span></td>
                      <td className="num"><input value={draft.value} onChange={(event) => setDraft(factor, { value: event.target.value })} /></td>
                      <td>{factor.unit}</td>
                      <td><input value={draft.source} onChange={(event) => setDraft(factor, { source: event.target.value })} /></td>
                      <td><input type="date" value={draft.validUntil} onChange={(event) => setDraft(factor, { validUntil: event.target.value })} /></td>
                      <td>
                        {factor.verified
                          ? <span className="sev ok"><CheckCircle2 size={12} /> 확인됨</span>
                          : <span className="sev block">미확인</span>}
                      </td>
                      <td>
                        <button
                          className="button outline small"
                          type="button"
                          onClick={() =>
                            saveFactor.mutate({
                              code: factor.code,
                              patch: {
                                value: Number(draft.value),
                                source: draft.source,
                                validUntil: draft.validUntil,
                                verified: true
                              }
                            })
                          }
                        >
                          확인 처리
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </WorkShell>
  );
}
