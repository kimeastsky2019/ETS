import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useMember } from "@/hooks/useMember";

function GuardLoading() {
  return (
    <div className="guard-loading">
      <div className="guard-spinner" />
      <p>임직원 권한을 확인하고 있습니다…</p>
    </div>
  );
}

/** 임직원(memberType=staff) 또는 관리자만 통과. */
export function RequireStaff({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { isPending, isAuthenticated, isStaff } = useMember();

  if (isPending) {
    return <GuardLoading />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/work/login" replace state={{ from: location }} />;
  }

  if (!isStaff) {
    return (
      <div className="guard-denied">
        <h1>임직원 전용 공간입니다.</h1>
        <p>이 페이지는 에너지기술서비스 임직원 계정으로만 접근할 수 있습니다.</p>
        <a className="button primary" href="/">홈으로 돌아가기</a>
      </div>
    );
  }

  return <>{children}</>;
}

/** 관리자(role=admin)만 통과. */
export function RequireAdminMember({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { isPending, isAuthenticated, isAdmin } = useMember();

  if (isPending) {
    return <GuardLoading />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/work/login" replace state={{ from: location }} />;
  }

  if (!isAdmin) {
    return (
      <div className="guard-denied">
        <h1>관리자 전용 화면입니다.</h1>
        <p>admin 계정으로 로그인해 주세요.</p>
        <a className="button primary" href="/work">업무 포털로</a>
      </div>
    );
  }

  return <>{children}</>;
}

/** 로그인한 고객이면 통과 (고객 로그인 화면으로 유도). */
export function RequireCustomer({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { isPending, isAuthenticated } = useMember();

  if (isPending) {
    return <GuardLoading />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
