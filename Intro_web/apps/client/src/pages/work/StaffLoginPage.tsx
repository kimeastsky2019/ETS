import { type FormEvent, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, Building2, KeyRound, Lock, ShieldAlert, User } from "lucide-react";
import { IMAGES } from "@/assets/images";
import { authClient } from "@/lib/auth";
import { membersApi } from "@/lib/platform";
import { useSession } from "@/hooks/useSession";
import { usePageMeta } from "@/lib/use-page-meta";

/**
 * 임직원 로그인 — 사번 계정(ets00~ets09, admin)으로 로그인한다.
 * Better Auth 의 username 플러그인을 사용하므로 이메일이 아니라 사번으로 인증한다.
 */
export default function StaffLoginPage() {
  usePageMeta("임직원 로그인", "에너지기술서비스 임직원 업무 포털 로그인");
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isPending } = useSession();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);

  const bootstrapStatus = useQuery({
    queryKey: ["members", "bootstrap"],
    queryFn: () => membersApi.bootstrapStatus(),
    retry: false
  });

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/work";

  if (isPending) {
    return <div className="guard-loading"><div className="guard-spinner" /><p>세션 확인 중…</p></div>;
  }

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      const result = await authClient.signIn.username({ username: username.trim(), password });
      if (result.error) {
        throw new Error(result.error.message ?? "사번 또는 비밀번호를 확인해 주세요.");
      }
      toast.success("로그인되었습니다.");
      navigate(from, { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "로그인에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const runBootstrap = async () => {
    setBootstrapping(true);
    try {
      const { accounts, seeded } = await membersApi.bootstrap();
      toast.success(
        `임직원 계정 ${accounts.length}개 준비 완료 · 초기 콘텐츠 ${seeded.createdPosts}건, 위키 ${seeded.createdWiki}건 생성`
      );
      await bootstrapStatus.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "계정 생성에 실패했습니다.");
    } finally {
      setBootstrapping(false);
    }
  };

  const needsBootstrap = bootstrapStatus.data?.staffCount === 0;

  return (
    <div className="staff-login">
      <div className="staff-login-visual">
        <img src={IMAGES.HOME_DOT_HERO} alt="" />
        <div className="staff-login-wash" />
        <div className="staff-login-copy">
          <img className="staff-login-logo" src={IMAGES.BRAND_DOT_LOGO} alt="에너지기술서비스" />
          <h1>ETS WORK HUB</h1>
          <p>진단 지식(LLM Wiki)과 고객 신청·문의 처리를 한 곳에서.<br />임직원 전용 업무 공간입니다.</p>
          <ul>
            <li><Building2 size={16} /> 진단 사례·개선안(ECM)·법규 지식 검색</li>
            <li><Building2 size={16} /> 위키 근거 기반 AI 질의응답</li>
            <li><Building2 size={16} /> 발코니 태양광 신청·고객 문의 처리</li>
          </ul>
        </div>
      </div>

      <div className="staff-login-panel">
        <div className="staff-login-card">
          <span className="eyebrow">EMPLOYEE SIGN IN</span>
          <h2>사번으로 로그인</h2>
          <p className="staff-login-hint">직원 계정은 <code>ets00</code> ~ <code>ets09</code>, 관리자 계정은 <code>admin</code> 입니다.</p>

          <form onSubmit={onSubmit}>
            <label>
              <span><User size={15} /> 사번</span>
              <input value={username} onChange={(event) => setUsername(event.target.value)} required placeholder="ets00" autoComplete="username" />
            </label>
            <label>
              <span><Lock size={15} /> 비밀번호</span>
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required placeholder="비밀번호" autoComplete="current-password" />
            </label>
            <button className="button primary wide" type="submit" disabled={submitting}>
              {submitting ? "로그인 중…" : "로그인"} <ArrowRight size={16} />
            </button>
          </form>

          {needsBootstrap && (
            <div className="bootstrap-box">
              <ShieldAlert size={18} />
              <div>
                <strong>임직원 계정이 아직 생성되지 않았습니다.</strong>
                <p>아래 버튼을 누르면 ets00~ets09와 admin 계정 11개, 그리고 블로그·쇼츠·위키 초기 콘텐츠가 함께 생성됩니다. 최초 1회만 실행됩니다.</p>
                <button className="button outline" type="button" onClick={() => void runBootstrap()} disabled={bootstrapping}>
                  <KeyRound size={15} /> {bootstrapping ? "생성 중…" : "임직원 계정 생성"}
                </button>
              </div>
            </div>
          )}

          <p className="staff-login-footer">
            고객이신가요? <Link to="/login">고객 로그인으로 이동</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
