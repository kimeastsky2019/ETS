import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ClipboardList, MapPin, Phone, Sun } from "lucide-react";
import { WorkShell } from "@/pages/work/WorkShell";
import { inquiriesApi, solarApi, type Inquiry, type SolarApplication } from "@/lib/platform";
import { usePageMeta } from "@/lib/use-page-meta";

const SOLAR_STATUS: Array<{ value: SolarApplication["status"]; label: string }> = [
  { value: "received", label: "접수" },
  { value: "reviewing", label: "검토" },
  { value: "surveying", label: "현장확인" },
  { value: "quoted", label: "견적안내" },
  { value: "closed", label: "완료" }
];

const INQUIRY_STATUS: Array<{ value: Inquiry["status"]; label: string }> = [
  { value: "received", label: "접수" },
  { value: "handling", label: "처리중" },
  { value: "done", label: "완료" }
];

/** 고객 신청·문의 처리 큐 (임직원 전용). */
export default function RequestsPage() {
  usePageMeta("신청·문의 처리", "고객 신청과 문의를 처리합니다.");
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "inquiry" ? "inquiry" : "solar";
  const queryClient = useQueryClient();
  const [memoDraft, setMemoDraft] = useState<Record<string, string>>({});

  const applications = useQuery({ queryKey: ["solar", "queue"], queryFn: () => solarApi.queue(), retry: false });
  const inquiries = useQuery({ queryKey: ["inquiries", "queue"], queryFn: () => inquiriesApi.queue(), retry: false });

  const updateSolar = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: { status?: SolarApplication["status"]; staffMemo?: string } }) =>
      solarApi.update(id, patch),
    onSuccess: () => {
      toast.success("신청 정보를 갱신했습니다.");
      queryClient.invalidateQueries({ queryKey: ["solar", "queue"] });
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "갱신에 실패했습니다.")
  });

  const updateInquiry = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: { status?: Inquiry["status"]; staffMemo?: string } }) =>
      inquiriesApi.update(id, patch),
    onSuccess: () => {
      toast.success("문의 상태를 갱신했습니다.");
      queryClient.invalidateQueries({ queryKey: ["inquiries", "queue"] });
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "갱신에 실패했습니다.")
  });

  return (
    <WorkShell>
      <div className="work-container">
        <header className="work-page-head">
          <div>
            <span className="eyebrow">REQUEST QUEUE</span>
            <h1>신청·문의 처리</h1>
            <p>홈페이지에서 접수된 고객 요청을 담당자가 직접 처리합니다.</p>
          </div>
        </header>

        <div className="work-tabs">
          <button type="button" className={tab === "solar" ? "active" : ""} onClick={() => setSearchParams({})}>
            <Sun size={16} /> 태양광 신청 ({applications.data?.applications.length ?? 0})
          </button>
          <button type="button" className={tab === "inquiry" ? "active" : ""} onClick={() => setSearchParams({ tab: "inquiry" })}>
            <ClipboardList size={16} /> 고객 문의 ({inquiries.data?.inquiries.length ?? 0})
          </button>
        </div>

        {tab === "solar" && (
          <div className="queue-list">
            {applications.isPending && <p className="muted">불러오는 중…</p>}
            {applications.data && !applications.data.applications.length && <p className="muted">접수된 신청이 없습니다.</p>}
            {applications.data?.applications.map((application) => (
              <article className="queue-card" key={application.id}>
                <div className="queue-main">
                  <div className="queue-title">
                    <strong>{application.applicantName}</strong>
                    <span>{application.packageName || "맞춤 구성"} × {application.quantity}</span>
                  </div>
                  <p className="queue-line"><MapPin size={14} /> {application.address} · {application.buildingType} · {application.balconyDirection}</p>
                  <p className="queue-line"><Phone size={14} /> {application.phone} · {application.email}</p>
                  <p className="queue-line">월 전기요금 {application.monthlyBill.toLocaleString("ko-KR")}원 · 발코니 {application.balconyWidth || "미기재"} · 방문희망 {application.visitPreference || "미기재"}</p>
                  {application.note && <p className="queue-note">{application.note}</p>}
                </div>

                <div className="queue-actions">
                  <span className="request-date">{application.createdAt.slice(0, 10)}</span>
                  <select
                    value={application.status}
                    onChange={(event) =>
                      updateSolar.mutate({ id: application.id, patch: { status: event.target.value as SolarApplication["status"] } })
                    }
                  >
                    {SOLAR_STATUS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                  <textarea
                    placeholder="담당자 메모"
                    defaultValue={application.staffMemo}
                    onChange={(event) => setMemoDraft((current) => ({ ...current, [application.id]: event.target.value }))}
                  />
                  <button
                    className="button outline"
                    type="button"
                    onClick={() =>
                      updateSolar.mutate({
                        id: application.id,
                        patch: { staffMemo: memoDraft[application.id] ?? application.staffMemo }
                      })
                    }
                  >
                    메모 저장
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        {tab === "inquiry" && (
          <div className="queue-list">
            {inquiries.isPending && <p className="muted">불러오는 중…</p>}
            {inquiries.data && !inquiries.data.inquiries.length && <p className="muted">접수된 문의가 없습니다.</p>}
            {inquiries.data?.inquiries.map((inquiry) => (
              <article className="queue-card" key={inquiry.id}>
                <div className="queue-main">
                  <div className="queue-title">
                    <strong>{inquiry.name}</strong>
                    <span>{inquiry.type}</span>
                  </div>
                  <p className="queue-line">{inquiry.company || "개인"} · {inquiry.phone} · {inquiry.email}</p>
                  <p className="queue-note">{inquiry.message}</p>
                </div>
                <div className="queue-actions">
                  <span className="request-date">{inquiry.createdAt.slice(0, 10)}</span>
                  <select
                    value={inquiry.status}
                    onChange={(event) =>
                      updateInquiry.mutate({ id: inquiry.id, patch: { status: event.target.value as Inquiry["status"] } })
                    }
                  >
                    {INQUIRY_STATUS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                  <textarea
                    placeholder="담당자 메모"
                    defaultValue={inquiry.staffMemo}
                    onChange={(event) => setMemoDraft((current) => ({ ...current, [inquiry.id]: event.target.value }))}
                  />
                  <button
                    className="button outline"
                    type="button"
                    onClick={() =>
                      updateInquiry.mutate({ id: inquiry.id, patch: { staffMemo: memoDraft[inquiry.id] ?? inquiry.staffMemo } })
                    }
                  >
                    메모 저장
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </WorkShell>
  );
}
