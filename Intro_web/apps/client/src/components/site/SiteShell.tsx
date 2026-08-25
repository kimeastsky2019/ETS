import { IMAGES } from "@/assets/images";
import {
  ArrowUpRight,
  ChevronRight,
  Mail,
  Menu,
  Phone,
  Search,
  ShoppingBag,
  UserRound,
  X,
} from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useMember } from "@/hooks/useMember";

const publicNav = [
  { to: "/company", label: "회사소개" },
  { to: "/business", label: "사업영역" },
  { to: "/performance", label: "사업실적" },
  { to: "/solar-store", label: "태양광 스토어" },
  { to: "/media", label: "블로그·쇼츠" },
  { to: "/contact", label: "문의하기" },
];

export function SiteShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  // 프리렌더된 홈 마크업과 하이드레이션 결과가 어긋나지 않도록,
  // 로그인 상태에 따라 달라지는 UI 는 마운트 이후에만 그린다.
  const [mounted, setMounted] = useState(false);
  const location = useLocation();
  const { isAuthenticated, isStaff, profile } = useMember();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [location.pathname]);

  return (
    <div className="site-app">
      <div className="utility-bar">
        <div className="site-container utility-inner">
          <span>에너지수요관리 전문기업 · Energy Technology Service</span>
          <div className="utility-links">
            <a href="tel:0236670404"><Phone size={13} /> 02.3667.0404</a>
            {mounted && isAuthenticated ? (
              <Link to="/my"><UserRound size={13} /> {profile?.name ?? "마이페이지"}</Link>
            ) : (
              <Link to="/login"><UserRound size={13} /> 로그인·회원가입</Link>
            )}
            <Link to={mounted && isStaff ? "/work" : "/work/login"}><Mail size={13} /> 임직원 포털</Link>
          </div>
        </div>
      </div>

      <header className="main-header">
        <div className="site-container header-inner">
          <Link to="/" className="brand" aria-label="에너지기술서비스 홈">
            <img src={IMAGES.BRAND_DOT_LOGO} alt="에너지기술서비스 주식회사" />
          </Link>

          <nav className="desktop-nav" aria-label="주요 메뉴">
            {publicNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }: { isActive: boolean }) =>
                  isActive ? "nav-link active" : "nav-link"
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="header-actions">
            <Link className="icon-action" to="/media" aria-label="콘텐츠 보기">
              <Search size={18} />
            </Link>
            <Link className="store-action" to="/solar-apply">
              <ShoppingBag size={17} />
              <span>태양광 신청</span>
            </Link>
            <button
              type="button"
              className="menu-toggle"
              aria-label="모바일 메뉴 열기"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={24} />
            </button>
          </div>
        </div>
      </header>

      <div className={mobileOpen ? "mobile-overlay show" : "mobile-overlay"} onClick={() => setMobileOpen(false)} />
      <aside className={mobileOpen ? "mobile-panel open" : "mobile-panel"} aria-hidden={!mobileOpen}>
        <button type="button" className="mobile-close" onClick={() => setMobileOpen(false)} aria-label="메뉴 닫기">
          <X size={24} />
        </button>
        <img className="mobile-logo" src={IMAGES.BRAND_DOT_LOGO} alt="" />
        <nav aria-label="모바일 메뉴">
          <NavLink to="/">홈</NavLink>
          {publicNav.map((item) => <NavLink key={item.to} to={item.to}>{item.label}</NavLink>)}
          <NavLink to="/solar-apply">발코니 태양광 신청</NavLink>
          <NavLink to={mounted && isAuthenticated ? "/my" : "/login"}>{mounted && isAuthenticated ? "마이페이지" : "로그인·회원가입"}</NavLink>
          <NavLink to={mounted && isStaff ? "/work" : "/work/login"}>임직원 포털</NavLink>
        </nav>
        <a className="mobile-mail" href="https://mail.naver.com/" target="_blank" rel="noreferrer">
          회사 메일 확인 <ArrowUpRight size={16} />
        </a>
      </aside>

      <main>{children}</main>

      <footer className="main-footer">
        <div className="site-container footer-grid">
          <div className="footer-brand">
            <img src={IMAGES.BRAND_DOT_LOGO} alt="에너지기술서비스" />
            <p>에너지 효율화부터 신재생에너지, 데이터 기반 운영까지<br />현장에 맞는 실행 가능한 해법을 제안합니다.</p>
          </div>
          <div>
            <p className="footer-label">CONTACT</p>
            <p>서울시 금천구 가산디지털1로 1<br />더루벤스밸리 1108호</p>
            <p className="footer-contact">02-3667-0404<br />ets0404@naver.com</p>
          </div>
          <div>
            <p className="footer-label">QUICK LINKS</p>
            <Link to="/business">사업영역 <ChevronRight size={14} /></Link>
            <Link to="/solar-apply">발코니 태양광 신청 <ChevronRight size={14} /></Link>
            <Link to="/media">블로그·쇼츠 <ChevronRight size={14} /></Link>
            <Link to="/work/login">임직원 포털 <ChevronRight size={14} /></Link>
            <a href="/legacy/index.html">기존 상세자료 <ChevronRight size={14} /></a>
          </div>
        </div>
        <div className="site-container footer-bottom">
          <span>© Energy Technology Service Co., Ltd.</span>
          <span>에너지의 내일을 더 효율적으로.</span>
        </div>
      </footer>
    </div>
  );
}

export function PageHero({
  eyebrow,
  title,
  description,
  image,
  compact = false,
}: {
  eyebrow: string;
  title: string;
  description: string;
  image?: string;
  compact?: boolean;
}) {
  return (
    <section className={compact ? "page-hero compact" : "page-hero"}>
      {image && <img className="page-hero-image" src={image} alt="" />}
      <div className="page-hero-wash" />
      <div className="site-container page-hero-inner">
        <span className="eyebrow light">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
    </section>
  );
}
