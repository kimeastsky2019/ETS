import { type FormEvent, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight, Lock, Mail, ShieldCheck, User } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { GoogleLoginButton } from "@/components/google/GoogleLoginButton";
import { authClient } from "@/lib/auth";
import { usePageMeta } from "@/lib/use-page-meta";

type Mode = "signin" | "signup";

/**
 * 고객용 간편 회원가입 / 로그인.
 * 발코니 태양광 신청폼(/solar-apply)의 진입 관문이며, 이메일 + Google(SNS) 두 가지를 제공한다.
 * 임직원 로그인은 /work/login 에서 사번(username)으로 별도 처리한다.
 */
export default function AuthPage() {
  usePageMeta("로그인 · 회원가입", "발코니 태양광 신청과 콘텐츠 참여를 위한 간편 회원가입 및 로그인.");
  const navigate = useNavigate();
  const location = useLocation();
  const { data: session, isPending } = authClient.useSession();

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/my";
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (isPending) {
    return (
      <SiteShell>
        <div className="guard-loading"><div className="guard-spinner" /><p>세션을 확인하고 있습니다…</p></div>
      </SiteShell>
    );
  }

  if (session?.user) {
    return <Navigate to={from} replace />;
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      const result =
        mode === "signup"
          ? await authClient.signUp.email({ name, email, password })
          : await authClient.signIn.email({ email, password });

      if (result.error) {
        throw new Error(result.error.message ?? "인증에 실패했습니다.");
      }

      toast.success(mode === "signup" ? "가입이 완료되었습니다." : "로그인되었습니다.");
      navigate(from, { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "인증에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SiteShell>
      <section className="section auth-section">
        <div className="site-container auth-layout">
          <div className="auth-intro">
            <span className="eyebrow">MEMBER</span>
            <h1>간편하게 가입하고<br />우리 집 태양광을 신청하세요.</h1>
            <p>회원가입은 발코니 태양광 신청과 진행 상황 확인, 콘텐츠 참여를 위해서만 사용됩니다.</p>
            <ul className="auth-benefits">
              <li><ShieldCheck size={18} /> 신청 진행 상황을 마이페이지에서 확인</li>
              <li><ShieldCheck size={18} /> 블로그·쇼츠 좋아요와 맞춤 알림</li>
              <li><ShieldCheck size={18} /> 현장 조건에 맞춘 견적 상담 연결</li>
            </ul>
            <p className="auth-staff-note">
              임직원이신가요? <Link to="/work/login">임직원 로그인으로 이동</Link>
            </p>
          </div>

          <div className="auth-card">
            <div className="auth-tabs">
              <button type="button" className={mode === "signin" ? "active" : ""} onClick={() => setMode("signin")}>로그인</button>
              <button type="button" className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>회원가입</button>
            </div>

            <form onSubmit={onSubmit} className="auth-form">
              {mode === "signup" && (
                <label>
                  <span><User size={15} /> 이름</span>
                  <input value={name} onChange={(event) => setName(event.target.value)} required placeholder="홍길동" autoComplete="name" />
                </label>
              )}
              <label>
                <span><Mail size={15} /> 이메일</span>
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="name@example.com" autoComplete="email" />
              </label>
              <label>
                <span><Lock size={15} /> 비밀번호</span>
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} placeholder="8자 이상" autoComplete={mode === "signup" ? "new-password" : "current-password"} />
              </label>

              <button className="button primary wide" type="submit" disabled={submitting}>
                {submitting ? "처리 중…" : mode === "signup" ? "가입하고 시작하기" : "로그인"} <ArrowRight size={16} />
              </button>
            </form>

            <div className="auth-divider"><span>또는 SNS 계정으로</span></div>
            <GoogleLoginButton className="google-button" landingPath={from}>Google 계정으로 계속하기</GoogleLoginButton>

            <p className="auth-terms">가입 시 개인정보 수집·이용에 동의하는 것으로 간주합니다. 수집 항목은 이름·이메일이며 상담 목적 외에는 사용하지 않습니다.</p>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
