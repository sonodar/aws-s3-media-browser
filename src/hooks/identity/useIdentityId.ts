import { useQuery } from "@tanstack/react-query";
import { fetchAuthSession } from "aws-amplify/auth";
import { queryKeys } from "../../stores/queryKeys";

export interface UseIdentityIdReturn {
  identityId: string | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Cognito 認証セッションから Identity ID を取得・保持するフック
 *
 * TanStack Query を使用してセッション情報をキャッシュ管理
 * - staleTime: Infinity でセッション中は再取得しない
 * - gcTime: Infinity でログアウトまでキャッシュ保持
 * - retry: false で認証エラーはリトライしない
 */
export function useIdentityId(): UseIdentityIdReturn {
  const query = useQuery({
    queryKey: queryKeys.identityId(),
    queryFn: async () => {
      const session = await fetchAuthSession();
      return session.identityId ?? null;
    },
    staleTime: Number.POSITIVE_INFINITY, // セッション中は変わらない
    gcTime: Number.POSITIVE_INFINITY, // ログアウトまでキャッシュ保持
    retry: false, // 認証エラーはリトライしない
  });

  return {
    identityId: query.data ?? null,
    loading: query.isLoading,
    error: query.error ?? null,
  };
}
