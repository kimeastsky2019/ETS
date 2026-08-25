import { useQuery } from "@tanstack/react-query";
import { membersApi, type MemberProfile } from "@/lib/platform";
import { useSession } from "@/hooks/useSession";

/**
 * 통합 플랫폼의 회원 구분(고객/임직원)까지 포함한 프로필.
 * Better Auth 세션만으로는 memberType 을 알 수 없어 /api/members/me 를 함께 읽는다.
 */
export function useMember() {
  const { isAuthenticated, isPending: sessionPending, user, signOut } = useSession();

  const query = useQuery({
    queryKey: ["member", "me", user?.id ?? null],
    queryFn: async () => (await membersApi.me()).profile,
    enabled: isAuthenticated,
    staleTime: 60_000,
    retry: false
  });

  const profile: MemberProfile | null = query.data ?? null;

  return {
    profile,
    isPending: sessionPending || (isAuthenticated && query.isPending),
    isAuthenticated,
    isStaff: Boolean(profile && (profile.memberType === "staff" || profile.role === "admin")),
    isAdmin: profile?.role === "admin",
    signOut,
    refetch: query.refetch
  };
}
