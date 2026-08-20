import { IMAGES } from "@/assets/images";
import {
  ArrowUpRight,
  ChevronRight,
  Mail,
  Menu,
  Phone,
  Search,
  ShoppingBag,
  X,
} from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";

const publicNav = [
  { to: "/company", label: "회사소개" },
  { to: "/business", label: "사업영역" },
  { to: "/performance", label: "사업실적" },
  { to: "/solar-store", label: "태양광 스토어" },
  { to: "/media", label: "인사이트" },
];

export function SiteShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

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
            <Link to="/staff"><Mail size={13} /> 임직원 포털</Link>
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
            <Link className="icon-action" to="/staff" aria-label="문서 검색">
              <Search size={18} />
            </Link>
            <Link className="store-action" to="/solar-store">
              <ShoppingBag size={17} />
              <span>구매 상담</span>
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
          <NavLink to="/staff">임직원 포털</NavLink>
          <NavLink to="/contact">문의하기</NavLink>
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
            <Link to="/solar-store">발코니 태양광 <ChevronRight size={14} /></Link>
            <Link to="/staff">임직원 문서검색 <ChevronRight size={14} /></Link>
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
