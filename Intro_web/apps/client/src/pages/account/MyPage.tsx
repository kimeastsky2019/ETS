import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, FileText, LogOut, Sun, User } from "lucide-react";
import { PageHero, SiteShell } from "@/components/site/SiteShell";
import { inquiriesApi, solarApi, type SolarApplication } from "@/lib/platform";
import { useMember } from "@/hooks/useMember";
import { usePageMeta } from "@/lib/use-page-meta";

const STATUS_STEPS: Array<{ key: SolarApplication["status"]; label: string }> = [
  { key: "received", label: "접수" },
  { key: "reviewing", label: "검토" },
  { key: "surveying", label: "현장확인" },
  { key: "quoted", label: "견적안내" },
  { key: "closed", label: "완료" }
];

/** 고객 마이페이지 — 신청 진행 상황과 문의 이력을 한 화면에서 확인한다. */
export default function MyPage() {
  usePageMeta("마이페이지", "발코니 태양광 신청 진행 상황과 문의 내역을 확인하세요.");
  const { profile, signOut } = useMember();

  const applications = useQuery({
    queryKey: ["solar", "mine"],
    queryFn: () => solarApi.mine(),
    retry: false
  });

  const inquiries = useQuery({
    queryKey: ["inquiries", "mine"],
    queryFn: () => inquiriesApi.mine(),
    retry: false
  });

  return (
    <SiteShell>
      <PageHero eyebrow="MY PAGE" title={`${profile?.name ?? "고객"}님, 반갑습니다.`} description="신청하신 내용의 진행 상황을 확인하고 추가 상담을 이어갈 수 있습니다." compact />

      <section className="section my-section">
        <div className="site-container my-layout">
          <aside className="my-profile">
            <div className="my-avatar"><User size={26} /></div>
            <strong>{profile?.name}</strong>
            <span>{profile?.email}</span>
            <span className="my-badge">{profile?.memberType === "staff" ? "임직원" : "고객 회원"}</span>
            <Link className="button primary wide" to="/solar-apply">새 태양광 신청 <Sun size={16} /></Link>
            {profile?.memberType === "staff" && (
              <Link className="button outline wide" to="/work">업무 포털로 이동 <ArrowRight size={16} /></Link>
            )}
            <button className="text-link" type="button" onClick={() => void signOut()}><LogOut size={15} /> 로그아웃</button>
          </aside>

          <div className="my-content">
            <div className="my-block">
              <h2><Sun size={20} /> 발코니 태양광 신청</h2>
              {applications.isPending && <p className="muted">불러오는 중…</p>}
              {applications.isError && <p className="muted">신청 내역을 불러오지 못했습니다.</p>}
              {applications.data && !applications.data.applications.length && (
                <div className="empty-state small">
                  <p>아직 신청 내역이 없습니다.</p>
                  <Link className="button primary" to="/solar-apply">지금 신청하기 <ArrowRight size={16} /></Link>
                </div>
              )}
              {applications.data?.applications.map((application) => {
                const activeIndex = STATUS_STEPS.findIndex((step) => step.key === application.status);
                return (
                  <div className="request-card" key={application.id}>
                    <div className="request-head">
                      <div>
                        <strong>{application.packageName || "맞춤 구성"} × {application.quantity}</strong>
                        <span>{application.address}</span>
                      </div>
                      <span className={`status-chip status-${application.status}`}>
                        {STATUS_STEPS.find((step) => step.key === application.status)?.label ?? application.status}
                      </span>
                    </div>
                    <ol className="status-track">
                      {STATUS_STEPS.map((step, index) => (
                        <li key={step.key} className={index <= activeIndex ? "done" : ""}>
                          <i /><span>{step.label}</span>
                        </li>
                      ))}
                    </ol>
                    {application.staffMemo && <p className="request-memo">담당자 메모: {application.staffMemo}</p>}
                    <span className="request-date">신청일 {application.createdAt.slice(0, 10)}</span>
                  </div>
                );
              })}
            </div>

            <div className="my-block">
              <h2><FileText size={20} /> 문의 내역</h2>
              {inquiries.isPending && <p className="muted">불러오는 중…</p>}
              {inquiries.data && !inquiries.data.inquiries.length && <p className="muted">등록된 문의가 없습니다.</p>}
              {inquiries.data?.inquiries.map((inquiry) => (
                <div className="request-card compact" key={inquiry.id}>
                  <div className="request-head">
                    <div><strong>{inquiry.type}</strong><span>{inquiry.message.slice(0, 80)}</span></div>
                    <span className={`status-chip status-${inquiry.status}`}>
                      {inquiry.status === "received" ? "접수" : inquiry.status === "handling" ? "처리중" : "완료"}
                    </span>
                  </div>
                  <span className="request-date">{inquiry.createdAt.slice(0, 10)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
