import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { BarChart3, BookOpen, ClipboardList, LayoutDashboard, LogOut, Settings, Stethoscope, Sun } from "lucide-react";
import { IMAGES } from "@/assets/images";
import { useMember } from "@/hooks/useMember";

const workNav = [
  { to: "/work", label: "대시보드", icon: LayoutDashboard, end: true },
  { to: "/work/diagnosis", label: "진단", icon: Stethoscope, end: false },
  { to: "/work/wiki", label: "LLM Wiki", icon: BookOpen, end: false },
  { to: "/work/benchmark", label: "벤치마크", icon: BarChart3, end: false },
  { to: "/work/requests", label: "신청·문의", icon: ClipboardList, end: false }
];

/** 임직원 업무 공간 공통 레이아웃 (고객 사이트와 시각적으로 분리된 워크스페이스). */
export function WorkShell({ children }: { children: ReactNode }) {
  const { profile, isAdmin, signOut } = useMember();

  return (
    <div className="work-app">
      <header className="work-header">
        <div className="work-header-inner">
          <Link to="/work" className="work-brand">
            <img src={IMAGES.BRAND_DOT_LOGO} alt="에너지기술서비스" />
            <span>WORK HUB</span>
          </Link>

          <nav className="work-nav">
            {workNav.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => (isActive ? "active" : "")}>
                  <Icon size={16} /> {item.label}
                </NavLink>
              );
            })}
            {isAdmin && (
              <NavLink to="/admin" className={({ isActive }) => (isActive ? "active" : "")}>
                <Settings size={16} /> 관리자
              </NavLink>
            )}
          </nav>

          <div className="work-user">
            <Link className="work-public-link" to="/"><Sun size={15} /> 고객 사이트</Link>
            <div className="work-user-chip">
              <strong>{profile?.username ?? profile?.name}</strong>
              <span>{profile?.department ?? (isAdmin ? "관리자" : "임직원")}</span>
            </div>
            <button type="button" onClick={() => void signOut()} aria-label="로그아웃"><LogOut size={16} /></button>
          </div>
        </div>
      </header>

      <main className="work-main">{children}</main>
    </div>
  );
}
