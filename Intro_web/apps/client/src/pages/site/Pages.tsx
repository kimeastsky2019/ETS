import { IMAGES } from "@/assets/images";
import { SOLAR_PACKAGES } from "@/data/solar-packages";
import { PageHero, SiteShell } from "@/components/site/SiteShell";
import { usePageMeta } from "@/lib/use-page-meta";
import { inquiriesApi } from "@/lib/platform";
import { toast } from "sonner";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Building2,
  Check,
  ChevronRight,
  CircleCheck,
  Clock3,
  FileSearch,
  Gauge,
  Mail,
  MapPin,
  Minus,
  PackageCheck,
  Phone,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Sun,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { type FormEvent, useState } from "react";
import { Link } from "react-router-dom";

const services = [
  {
    title: "에너지 진단",
    label: "AUDIT",
    description: "에너지 다소비 건물·공장의 설비와 운영 데이터를 정밀 분석해 손실 요인과 절감 잠재량을 찾아냅니다.",
    icon: Gauge,
    image: IMAGES.BUSINESS_DOT_AUDIT,
    legacy: "energy-audit.html",
  },
  {
    title: "ESCO 사업",
    label: "PERFORMANCE",
    description: "진단에서 확인한 절감 기회에 고효율 설비를 적용해, 에너지 절감을 투자 회수와 경제적 가치로 실현합니다.",
    icon: Zap,
    image: IMAGES.BUSINESS_DOT_ESCO,
    legacy: "esco.html",
  },
  {
    title: "신재생에너지",
    label: "RENEWABLE",
    description: "태양광·태양열·연료전지 등 현장 조건에 맞춘 신재생 솔루션을 제안합니다.",
    icon: Sun,
    image: IMAGES.BUSINESS_DOT_RENEWABLE,
    legacy: "renewable.html",
  },
  {
    title: "에너지 데이터",
    label: "DATA & DIGITAL",
    description: "데이터 분석, 바우처, 디지털 트윈으로 에너지 운영을 더 정확하게 만듭니다.",
    icon: BarChart3,
    image: IMAGES.BUSINESS_DOT_DATA,
    legacy: "voucher.html",
  },
];

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return (
    <div className="section-heading">
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </div>
  );
}

export function HomePage() {
  usePageMeta("에너지의 내일을 설계합니다", "에너지진단, ESCO, 신재생에너지, 데이터 기술과 발코니 태양광 솔루션을 제공하는 에너지기술서비스입니다.");
  const [monthlyBill, setMonthlyBill] = useState(100000);
  const estimateCapacity = Math.max(0.4, Math.min(1.2, Math.round((monthlyBill / 100000) * 0.8 * 10) / 10));
  const estimatedSaving = Math.round((monthlyBill * Math.min(0.18, 0.07 + estimateCapacity * 0.07)) / 1000) * 1000;

  return (
    <SiteShell>
      <section className="home-hero">
        <img src={IMAGES.HOME_DOT_HERO} alt="태양광 모듈 설계를 검토하는 에너지 전문가" />
        <div className="home-hero-overlay" />
        <div className="site-container home-hero-content">
          <div className="hero-copy">
            <span className="hero-kicker">ENERGY TRANSITION, DELIVERED</span>
            <h1>에너지의 내일을<br /><em>현장에서</em> 완성합니다.</h1>
            <p>진단에서 설계, 시공, 데이터 운영까지. 기술과 실행력을 연결해 더 효율적인 에너지 환경을 만듭니다.</p>
            <div className="hero-actions">
              <Link className="button primary" to="/business">사업 솔루션 보기 <ArrowRight size={17} /></Link>
              <Link className="button glass" to="/solar-store">발코니 태양광 상담 <Sun size={17} /></Link>
            </div>
          </div>
          <div className="hero-status">
            <span>ENERGY TECHNOLOGY SERVICE</span>
            <strong>통합 에너지 솔루션</strong>
            <div className="status-line"><i /><span>진단</span><i /><span>개선</span><i /><span>운영</span></div>
          </div>
        </div>
      </section>

      <section className="metric-ribbon">
        <div className="site-container metric-grid">
          <div><strong>4</strong><span>핵심 사업축</span></div>
          <div><strong>One-stop</strong><span>진단부터 운영까지</span></div>
          <div><strong>Data</strong><span>근거 기반 절감안</span></div>
          <div><strong>Field</strong><span>현장 중심 실행</span></div>
        </div>
      </section>

      <section className="section">
        <div className="site-container">
          <SectionHeading eyebrow="WHAT WE DO" title="기술은 깊게, 실행은 분명하게." description="복잡한 에너지 문제를 현장에서 바로 활용할 수 있는 솔루션으로 바꿉니다." />
          <div className="service-showcase">
            {services.map((service, index) => {
              const Icon = service.icon;
              return (
                <Link className="service-panel" to="/business" key={service.title}>
                  <img src={service.image} alt="" />
                  <div className="service-shade" />
                  <span className="service-index">0{index + 1}</span>
                  <div className="service-panel-copy">
                    <Icon size={23} />
                    <span>{service.label}</span>
                    <h3>{service.title}</h3>
                    <p>{service.description}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section solar-preview">
        <div className="site-container split-feature">
          <div className="split-image">
            <img src={IMAGES.STORE_DOT_BALCONY} alt="태양광 발전 패널 설치 현장" />
            <div className="image-note"><Sun size={20} /><span>URBAN SOLAR SOLUTION</span></div>
          </div>
          <div className="split-copy">
            <span className="eyebrow">BALCONY SOLAR</span>
            <h2>우리 집에 맞는<br />작은 발전소를 시작하세요.</h2>
            <p>발코니 크기와 전력 사용 패턴을 기준으로 소형 태양광 구성을 비교하고, 장바구니에 담아 맞춤 견적을 요청할 수 있습니다.</p>
            <div className="feature-checks">
              <span><CircleCheck size={18} /> 공간별 패키지 비교</span>
              <span><CircleCheck size={18} /> 설치 전 체크리스트</span>
              <span><CircleCheck size={18} /> 장바구니 기반 견적문의</span>
            </div>
            <Link className="text-link" to="/solar-store">스토어 둘러보기 <ArrowRight size={17} /></Link>
          </div>
        </div>
      </section>

      <section className="section calculator-section">
        <div className="site-container calculator-card">
          <div>
            <span className="eyebrow light">QUICK ESTIMATOR</span>
            <h2>월 전기요금으로 보는<br />발코니 태양광 구성 가이드</h2>
            <p>정확한 발전량과 절감액은 방향·일조·난간 구조·계통 조건을 확인한 후 산정됩니다.</p>
          </div>
          <div className="calculator-ui">
            <label htmlFor="bill">월 평균 전기요금</label>
            <div className="range-value">{monthlyBill.toLocaleString("ko-KR")}원</div>
            <input id="bill" type="range" min="30000" max="300000" step="10000" value={monthlyBill} onChange={(event) => setMonthlyBill(Number(event.target.value))} />
            <div className="estimate-grid">
              <div><span>검토 용량</span><strong>약 {estimateCapacity.toFixed(1)}kW</strong></div>
              <div><span>월 절감 예시</span><strong>약 {estimatedSaving.toLocaleString("ko-KR")}원</strong></div>
            </div>
            <Link className="button lime" to="/solar-store">맞춤 패키지 보기 <ArrowRight size={17} /></Link>
          </div>
        </div>
      </section>

      <section className="section staff-preview">
        <div className="site-container">
          <div className="staff-preview-head">
            <SectionHeading eyebrow="WORK HUB" title="업무에 필요한 것을 더 빠르게." description="회사 메일과 주요 문서를 한 곳에서 찾는 임직원 전용 바로가기입니다." />
            <Link className="round-link" to="/work" aria-label="임직원 업무 포털 열기"><ArrowUpRight /></Link>
          </div>
          <div className="staff-shortcuts">
            <Link to="/work"><Mail /><div><strong>회사 메일</strong><span>네이버 메일 바로가기</span></div><ChevronRight /></Link>
            <Link to="/work"><FileSearch /><div><strong>문서 검색</strong><span>사업·실적·고객자료 통합검색</span></div><ChevronRight /></Link>
            <a href="/legacy/index.html"><BookOpen /><div><strong>기존 자료실</strong><span>전체 상세 페이지 아카이브</span></div><ChevronRight /></a>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}

export function CompanyPage() {
  usePageMeta("회사소개", "에너지기술서비스의 전문 역량, 성장 과정과 기업 철학을 소개합니다.");
  return (
    <SiteShell>
      <PageHero eyebrow="ABOUT ETS" title="현장을 이해하는 에너지 전문가" description="책임과 안전, 신뢰를 바탕으로 에너지 절감의 실질적인 성과를 만듭니다." image={IMAGES.MEDIA_DOT_INSIGHT} />
      <section className="section">
        <div className="site-container company-intro">
          <div><span className="eyebrow">OUR PURPOSE</span><h2>에너지 비용을 줄이는 것을 넘어,<br />운영의 기준을 바꿉니다.</h2></div>
          <div><p className="lead-copy">에너지기술서비스(주)는 에너지진단, 에너지효율화, ICT 기반 ESCO, 신재생에너지와 데이터 분석을 연결하는 전문기업입니다.</p><p>설비만 바꾸는 단기 처방이 아니라 현장의 사용 패턴과 운영 조건을 함께 분석해 지속 가능한 개선안을 제안합니다.</p></div>
        </div>
        <div className="site-container values-grid">
          <div><ShieldCheck /><span>01</span><h3>신뢰</h3><p>확인 가능한 데이터와 책임 있는 수행 과정을 중요하게 생각합니다.</p></div>
          <div><Wrench /><span>02</span><h3>현장성</h3><p>도면과 보고서에 머물지 않고 실제 운영 조건에 맞춰 설계합니다.</p></div>
          <div><Sparkles /><span>03</span><h3>혁신</h3><p>ICT·데이터·디지털 트윈으로 에너지 관리의 정확도를 높입니다.</p></div>
        </div>
      </section>
      <section className="section soft-section">
        <div className="site-container timeline-layout">
          <SectionHeading eyebrow="MILESTONES" title="축적된 전문성, 확장되는 역할" description="기존 홈페이지에 정리된 연혁과 사업자료를 바탕으로 핵심 성장 흐름을 재구성했습니다." />
          <div className="timeline-modern">
            {[
              ["FOUNDATION", "에너지 진단과 효율화 전문 역량 구축"],
              ["EXPANSION", "ESCO·전기·기계설비 분야로 수행 범위 확장"],
              ["DATA", "데이터바우처 공급기업 및 분석·가공 역량 강화"],
              ["NEXT", "신재생에너지와 디지털 트윈 기반 통합 서비스 고도화"],
            ].map(([year, text]) => <div key={year}><span>{year}</span><i /><p>{text}</p></div>)}
          </div>
          <a className="button outline" href="/legacy/history.html">전체 회사연혁 보기 <ArrowUpRight size={16} /></a>
        </div>
      </section>
      <section className="section">
        <div className="site-container archive-grid">
          <a href="/legacy/license.html"><span>LICENSE</span><h3>사업면허</h3><p>보유 면허와 자격을 확인하세요.</p><ArrowUpRight /></a>
          <a href="/legacy/awards.html"><span>AWARDS</span><h3>훈포장·수상</h3><p>전문성과 기여를 인정받은 기록입니다.</p><ArrowUpRight /></a>
          <a href="/legacy/org.html"><span>ORGANIZATION</span><h3>조직도</h3><p>전문 분야별 조직 구성을 확인하세요.</p><ArrowUpRight /></a>
          <a href="/legacy/location.html"><span>LOCATION</span><h3>오시는 길</h3><p>서울 가산디지털단지 본사 안내입니다.</p><ArrowUpRight /></a>
        </div>
      </section>
    </SiteShell>
  );
}

export function BusinessPage() {
  usePageMeta("사업영역", "에너지 진단, ESCO, 신재생에너지, 데이터 분석과 디지털 트윈 사업을 확인하세요.");
  return (
    <SiteShell>
      <PageHero eyebrow="BUSINESS SOLUTIONS" title="진단에서 데이터 운영까지" description="에너지 사용의 전 과정을 연결해 현장에 맞는 개선 로드맵을 설계합니다." image={IMAGES.BUSINESS_DOT_RENEWABLE} />
      <section className="section">
        <div className="site-container business-list">
          {services.map((service, index) => {
            const Icon = service.icon;
            return (
              <article className="business-row" key={service.title}>
                <div className="business-image"><img src={service.image} alt={service.title} /><span>0{index + 1}</span></div>
                <div className="business-copy">
                  <div className="business-title"><Icon /><span>{service.label}</span></div>
                  <h2>{service.title}</h2>
                  <p>{service.description}</p>
                  <ul>
                    {index === 0 && <><li>설비별 에너지 사용 현황 조사</li><li>손실 요인 분석 및 개선안 도출</li><li>투자 우선순위와 지원제도 검토</li></>}
                    {index === 1 && <><li>성과 기반 에너지 효율화 검토</li><li>설비 개선과 투자 구조 연계</li><li>성과 측정·검증 체계 제안</li></>}
                    {index === 2 && <><li>태양광·태양열·연료전지 검토</li><li>입지와 부하 조건 기반 최적화</li><li>설치 후 운영·점검 연계</li></>}
                    {index === 3 && <><li>에너지 데이터 수집·가공</li><li>운영 패턴 분석과 시각화</li><li>디지털 트윈 기반 시뮬레이션</li></>}
                  </ul>
                  <a className="text-link" href={`/legacy/${service.legacy}`}>기존 상세자료 보기 <ArrowUpRight size={16} /></a>
                </div>
              </article>
            );
          })}
        </div>
      </section>
      <section className="section process-section">
        <div className="site-container">
          <SectionHeading eyebrow="HOW WE WORK" title="현장 중심의 4단계 수행 체계" />
          <div className="process-grid">
            {[
              ["01", "현황 파악", "에너지 사용과 설비 운전 조건을 확인합니다."],
              ["02", "분석·진단", "데이터와 현장 조사로 개선 기회를 찾습니다."],
              ["03", "실행 설계", "효과·비용·공사 조건을 반영해 실행안을 설계합니다."],
              ["04", "성과 관리", "개선 후 성과를 확인하고 운영 고도화를 지원합니다."],
            ].map(([step, title, text]) => <div key={step}><span>{step}</span><h3>{title}</h3><p>{text}</p></div>)}
          </div>
        </div>
      </section>
    </SiteShell>
  );
}

export function PerformancePage() {
  usePageMeta("사업실적", "에너지기술서비스의 연도별 주요 프로젝트와 수행 역량을 확인하세요.");
  const years = ["2024", "2023", "2022", "2021", "2020"];
  return (
    <SiteShell>
      <PageHero eyebrow="TRACK RECORD" title="성과로 증명하는 실행력" description="다양한 산업과 시설 현장에서 축적한 프로젝트 경험을 확인하세요." image={IMAGES.HOME_DOT_HERO} />
      <section className="section">
        <div className="site-container performance-layout">
          <div className="performance-summary">
            <span className="eyebrow">PROJECT ARCHIVE</span>
            <h2>에너지 절감의 가능성을<br />실제 수행 경험으로 연결합니다.</h2>
            <p>아래 연도별 버튼에서 기존 홈페이지에 정리된 상세 사업실적을 그대로 확인할 수 있습니다.</p>
            <div className="capability-tags"><span>에너지진단</span><span>ESCO</span><span>신재생</span><span>기계설비</span><span>전기공사</span><span>데이터</span></div>
          </div>
          <div className="year-list">
            {years.map((year, index) => (
              <a key={year} href={`/legacy/perf-${year}.html`}>
                <span>{year}</span>
                <div><strong>{index === 0 ? "최근 사업실적" : `${year}년 수행자료`}</strong><p>프로젝트 목록과 상세 내용을 확인합니다.</p></div>
                <ArrowUpRight />
              </a>
            ))}
          </div>
        </div>
      </section>
      <section className="section dark-cta">
        <div className="site-container"><div><span className="eyebrow light">START A PROJECT</span><h2>유사 실적과 적용 가능성을<br />함께 검토해 드립니다.</h2></div><Link className="button lime" to="/contact">프로젝트 문의 <ArrowRight size={17} /></Link></div>
      </section>
    </SiteShell>
  );
}

export function SolarStorePage() {
  usePageMeta("발코니 태양광 스토어", "발코니 태양광 패키지를 비교하고 장바구니에 담아 맞춤 견적을 요청하세요.");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const cartItems = SOLAR_PACKAGES.filter((product) => cart[product.id]).map((product) => ({ ...product, quantity: cart[product.id] || 0 }));
  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);

  const addToCart = (productId: string) => {
    setCart((current) => ({ ...current, [productId]: (current[productId] || 0) + 1 }));
    setCartOpen(true);
  };
  const changeQuantity = (productId: string, delta: number) => {
    setCart((current) => {
      const next = Math.max(0, (current[productId] || 0) + delta);
      const copy = { ...current };
      if (next === 0) delete copy[productId];
      else copy[productId] = next;
      return copy;
    });
  };
  // 장바구니는 "무엇을 신청할지" 고르는 단계까지만 담당하고,
  // 실제 접수는 로그인 뒤 신청폼(/solar-apply)에서 DB 로 저장된다.
  const applyHref = cartItems.length
    ? `/solar-apply?package=${cartItems[0].id}&qty=${cartItems[0].quantity}`
    : "/solar-apply";

  return (
    <SiteShell>
      <section className="store-hero">
        <img src={IMAGES.STORE_DOT_BALCONY} alt="태양광 발전 패널 설치 현장" /><div className="store-hero-overlay" />
        <div className="site-container store-hero-content">
          <span className="eyebrow light">ETS BALCONY SOLAR</span><h1>발코니에서 시작하는<br />우리 집 에너지 전환</h1>
          <p>공간과 사용 패턴에 맞는 구성 예시를 비교하고, 필요한 패키지를 담아 맞춤 견적을 요청하세요.</p>
          <div className="store-hero-badges"><span><Check /> 패키지 비교</span><span><Check /> 현장 조건 상담</span><span><Check /> 온라인 설치 신청</span></div>
          <Link className="button lime" to="/solar-apply">바로 설치 신청 <ArrowRight size={17} /></Link>
        </div>
      </section>
      <section className="section store-section">
        <div className="site-container">
          <div className="store-heading"><SectionHeading eyebrow="SOLAR PACKAGES" title="공간에 맞춘 패키지 구성" description="아래 구성은 상담을 위한 예시이며, 최종 사양·가격·설치 가능 여부는 현장 확인 후 결정됩니다." /><button type="button" className="cart-button" onClick={() => setCartOpen(true)}><ShoppingBag size={19} /> 장바구니 <span>{cartCount}</span></button></div>
          <div className="product-grid">
            {SOLAR_PACKAGES.map((product) => (
              <article className="product-card" key={product.id}>
                <div className="product-image"><img src={product.image} alt={product.name} /><span>{product.badge}</span></div>
                <div className="product-body">
                  <p className="product-capacity">{product.capacity}</p><h2>{product.name}</h2><p>{product.lead}</p>
                  <div className="product-fit"><MapPin size={16} /> {product.fit}</div>
                  <ul>{product.includes.map((item) => <li key={item}><Check size={15} /> {item}</li>)}</ul>
                  <button type="button" onClick={() => addToCart(product.id)}>장바구니 담기 <Plus size={17} /></button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="section installation-guide">
        <div className="site-container">
          <SectionHeading eyebrow="BEFORE INSTALLATION" title="설치 전 반드시 확인합니다" />
          <div className="guide-grid">
            <div><Sun /><h3>일조와 방향</h3><p>그늘 발생 시간과 발코니 방향을 확인해 발전 조건을 검토합니다.</p></div>
            <div><Building2 /><h3>난간과 구조</h3><p>설치 면적, 고정 방식, 건물 관리규약과 안전 조건을 확인합니다.</p></div>
            <div><Zap /><h3>전기 계통</h3><p>인버터와 계통 연결 방식, 보호장치 등 전기 조건을 검토합니다.</p></div>
            <div><PackageCheck /><h3>맞춤 견적</h3><p>현장 조건과 선택 구성에 따라 최종 사양과 비용을 안내합니다.</p></div>
          </div>
        </div>
      </section>
      <div className={cartOpen ? "cart-overlay show" : "cart-overlay"} onClick={() => setCartOpen(false)} />
      <aside className={cartOpen ? "cart-drawer open" : "cart-drawer"} aria-hidden={!cartOpen}>
        <div className="cart-head"><div><span>MY QUOTE CART</span><h2>견적 장바구니</h2></div><button type="button" onClick={() => setCartOpen(false)} aria-label="장바구니 닫기"><X /></button></div>
        <div className="cart-content">
          {!cartItems.length && <div className="cart-empty"><ShoppingBag /><h3>담긴 패키지가 없습니다.</h3><p>비교하고 싶은 태양광 구성을 장바구니에 담아보세요.</p></div>}
          {cartItems.map((item) => <div className="cart-item" key={item.id}><img src={item.image} alt="" /><div><strong>{item.name}</strong><span>{item.capacity}</span><div className="quantity"><button type="button" onClick={() => changeQuantity(item.id, -1)}><Minus size={14} /></button><b>{item.quantity}</b><button type="button" onClick={() => changeQuantity(item.id, 1)}><Plus size={14} /></button></div></div></div>)}
        </div>
        <div className="cart-footer"><p><ShieldCheck size={16} /> 결제는 없습니다. 신청 후 현장 조건을 확인해 견적을 안내합니다.</p><Link className={cartItems.length ? "cart-apply" : "cart-apply disabled"} to={applyHref} aria-disabled={!cartItems.length}>선택 구성으로 설치 신청 <ArrowRight size={17} /></Link></div>
      </aside>
    </SiteShell>
  );
}

export function ContactPage() {
  usePageMeta("문의하기", "에너지진단, ESCO, 신재생에너지, 발코니 태양광 구매 및 사업제휴 문의를 접수하세요.");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 메일 클라이언트를 여는 대신 접수 DB 로 저장한다 → 임직원 포털의 처리 큐로 이어진다.
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setSubmitting(true);

    try {
      await inquiriesApi.create({
        type: String(data.get("type") ?? "기타"),
        name: String(data.get("name") ?? ""),
        company: String(data.get("company") ?? ""),
        phone: String(data.get("phone") ?? ""),
        email: String(data.get("email") ?? ""),
        message: String(data.get("message") ?? ""),
        privacyAgreed: true
      });
      setSent(true);
      form.reset();
      toast.success("문의가 접수되었습니다.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "문의 접수에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SiteShell>
      <PageHero eyebrow="CONTACT ETS" title="에너지 문제를 함께 풀어보세요." description="사업 검토, 태양광 구매, 기술 자료와 제휴 문의를 남겨주세요." compact />
      <section className="section contact-section">
        <div className="site-container contact-layout">
          <div className="contact-panel">
            <span className="eyebrow">CONTACT INFO</span><h2>상담이 필요한 순간,<br />가장 가까운 전문가로.</h2>
            <div className="contact-list">
              <a href="tel:0236670404"><Phone /><div><span>대표전화</span><strong>02-3667-0404</strong></div></a>
              <a href="mailto:ets0404@naver.com"><Mail /><div><span>이메일</span><strong>ets0404@naver.com</strong></div></a>
              <div><MapPin /><div><span>주소</span><strong>서울시 금천구 가산디지털1로 1<br />더루벤스밸리 1108호</strong></div></div>
              <div><Clock3 /><div><span>상담시간</span><strong>평일 09:00–18:00</strong></div></div>
            </div>
            <a className="text-link light-link" href="/legacy/location.html">상세 위치 보기 <ArrowUpRight size={16} /></a>
          </div>
          <form className="contact-form" onSubmit={submit}>
            <div className="field-grid">
              <label>문의 유형<select name="type" required><option>에너지진단·ESCO</option><option>신재생에너지</option><option>발코니 태양광 구매</option><option>데이터·디지털트윈</option><option>사업제휴·기타</option></select></label>
              <label>성명<input name="name" required placeholder="성명을 입력하세요" /></label>
              <label>회사명<input name="company" placeholder="회사 또는 기관명" /></label>
              <label>연락처<input name="phone" required placeholder="010-0000-0000" /></label>
              <label className="wide">이메일<input name="email" type="email" required placeholder="name@company.com" /></label>
              <label className="wide">문의내용<textarea name="message" required placeholder="검토 중인 현장과 필요한 내용을 알려주세요." /></label>
            </div>
            <label className="agree-check"><input type="checkbox" required /> 문의 응대를 위한 개인정보 수집·이용에 동의합니다.</label>
            <button className="button primary" type="submit" disabled={submitting}>{submitting ? "접수 중…" : "문의 접수하기"} <ArrowRight size={17} /></button>
            {sent && <p className="form-status"><CircleCheck size={17} /> 문의가 접수되었습니다. 담당자가 확인 후 연락드립니다.</p>}
          </form>
        </div>
      </section>
    </SiteShell>
  );
}
