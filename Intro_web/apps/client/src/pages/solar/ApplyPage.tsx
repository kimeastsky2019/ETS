import { type FormEvent, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight, CircleCheck, Info, Sun } from "lucide-react";
import { PageHero, SiteShell } from "@/components/site/SiteShell";
import { SOLAR_PACKAGES } from "@/data/solar-packages";
import { solarApi } from "@/lib/platform";
import { useMember } from "@/hooks/useMember";
import { usePageMeta } from "@/lib/use-page-meta";

const BUILDING_TYPES = [
  { value: "apartment", label: "아파트" },
  { value: "villa", label: "빌라·연립" },
  { value: "officetel", label: "오피스텔" },
  { value: "house", label: "단독주택" },
  { value: "etc", label: "기타" }
];

const DIRECTIONS = [
  { value: "south", label: "남향" },
  { value: "southeast", label: "남동향" },
  { value: "southwest", label: "남서향" },
  { value: "east", label: "동향" },
  { value: "west", label: "서향" },
  { value: "north", label: "북향" },
  { value: "unknown", label: "잘 모르겠음" }
];

/** 발코니 태양광 설치 신청폼. 로그인한 고객만 접근한다(RequireCustomer). */
export default function SolarApplyPage() {
  usePageMeta("발코니 태양광 설치 신청", "발코니 조건과 희망 패키지를 입력하면 담당자가 현장 조건을 확인해 견적을 안내합니다.");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile } = useMember();

  const initialPackage = searchParams.get("package") ?? SOLAR_PACKAGES[0].id;
  const [packageId, setPackageId] = useState(initialPackage);
  const [quantity, setQuantity] = useState(Number(searchParams.get("qty") ?? 1) || 1);
  const [monthlyBill, setMonthlyBill] = useState(80000);
  const [submitting, setSubmitting] = useState(false);

  const selected = useMemo(
    () => SOLAR_PACKAGES.find((item) => item.id === packageId) ?? SOLAR_PACKAGES[0],
    [packageId]
  );

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSubmitting(true);

    try {
      await solarApi.apply({
        applicantName: String(form.get("applicantName") ?? ""),
        phone: String(form.get("phone") ?? ""),
        email: String(form.get("email") ?? ""),
        postalCode: String(form.get("postalCode") ?? ""),
        address: String(form.get("address") ?? ""),
        buildingType: String(form.get("buildingType") ?? "apartment"),
        balconyDirection: String(form.get("balconyDirection") ?? "south"),
        balconyWidth: String(form.get("balconyWidth") ?? ""),
        monthlyBill,
        packageId: selected.id,
        packageName: selected.name,
        quantity,
        visitPreference: String(form.get("visitPreference") ?? ""),
        note: String(form.get("note") ?? ""),
        privacyAgreed: true
      });

      toast.success("신청이 접수되었습니다. 담당자가 확인 후 연락드립니다.");
      navigate("/my", { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "신청에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SiteShell>
      <PageHero
        eyebrow="BALCONY SOLAR APPLICATION"
        title="발코니 태양광 설치 신청"
        description="입력하신 조건으로 담당 엔지니어가 설치 가능 여부와 예상 발전량을 검토해 연락드립니다."
        compact
      />

      <section className="section apply-section">
        <div className="site-container apply-layout">
          <form className="apply-form" onSubmit={onSubmit}>
            <fieldset>
              <legend>01. 신청자 정보</legend>
              <div className="field-grid">
                <label>성명<input name="applicantName" required defaultValue={profile?.name ?? ""} placeholder="홍길동" /></label>
                <label>연락처<input name="phone" required defaultValue={profile?.phone ?? ""} placeholder="010-0000-0000" /></label>
                <label className="wide">이메일<input name="email" type="email" required defaultValue={profile?.email ?? ""} placeholder="name@example.com" /></label>
              </div>
            </fieldset>

            <fieldset>
              <legend>02. 설치 장소</legend>
              <div className="field-grid">
                <label>우편번호<input name="postalCode" placeholder="00000" /></label>
                <label>건물 유형
                  <select name="buildingType" defaultValue="apartment">
                    {BUILDING_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </label>
                <label className="wide">주소<input name="address" required placeholder="시/군/구, 도로명, 동·호수" /></label>
                <label>발코니 방향
                  <select name="balconyDirection" defaultValue="south">
                    {DIRECTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </label>
                <label>발코니 폭(대략)<input name="balconyWidth" placeholder="예: 3m" /></label>
              </div>
            </fieldset>

            <fieldset>
              <legend>03. 희망 구성</legend>
              <div className="package-picker">
                {SOLAR_PACKAGES.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    className={item.id === packageId ? "package-option active" : "package-option"}
                    onClick={() => setPackageId(item.id)}
                  >
                    <span className="package-badge">{item.badge}</span>
                    <strong>{item.name}</strong>
                    <span>{item.capacity}</span>
                    {item.id === packageId && <CircleCheck className="package-check" size={18} />}
                  </button>
                ))}
              </div>
              <div className="field-grid">
                <label>수량
                  <input type="number" min={1} max={20} value={quantity} onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))} />
                </label>
                <label>월 평균 전기요금
                  <input type="number" min={0} step={10000} value={monthlyBill} onChange={(event) => setMonthlyBill(Math.max(0, Number(event.target.value) || 0))} />
                </label>
                <label className="wide">방문 희망 시간대<input name="visitPreference" placeholder="예: 평일 오후 / 주말 오전" /></label>
                <label className="wide">추가 요청사항<textarea name="note" placeholder="난간 형태, 관리사무소 승인 여부, 궁금한 점 등을 적어주세요." /></label>
              </div>
            </fieldset>

            <label className="agree-check">
              <input type="checkbox" required /> 설치 상담을 위한 개인정보(이름·연락처·주소) 수집·이용에 동의합니다.
            </label>

            <button className="button primary wide" type="submit" disabled={submitting}>
              {submitting ? "접수 중…" : "설치 신청하기"} <ArrowRight size={17} />
            </button>
          </form>

          <aside className="apply-aside">
            <div className="apply-summary">
              <span className="eyebrow">SELECTED</span>
              <h2>{selected.name}</h2>
              <p>{selected.capacity} · {selected.fit}</p>
              <ul>{selected.includes.map((item) => <li key={item}><CircleCheck size={15} /> {item}</li>)}</ul>
              <p className="apply-quantity"><Sun size={16} /> 수량 {quantity}세트 · 월 전기요금 {monthlyBill.toLocaleString("ko-KR")}원</p>
            </div>
            <div className="apply-notice">
              <Info size={18} />
              <div>
                <strong>신청 후 진행 절차</strong>
                <ol>
                  <li>접수 확인 (영업일 1일 이내)</li>
                  <li>전화 상담 및 현장 조건 확인</li>
                  <li>현장 실사 또는 사진 검토</li>
                  <li>최종 견적 안내 및 설치 일정 협의</li>
                </ol>
                <p>진행 상황은 <Link to="/my">마이페이지</Link>에서 확인할 수 있습니다.</p>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </SiteShell>
  );
}
