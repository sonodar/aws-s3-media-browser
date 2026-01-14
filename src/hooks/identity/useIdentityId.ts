import { useQuery } from "@tanstack/react-query";
import { fetchAuthSession } from "aws-amplify/auth";
import { queryKeys } from "../../stores/queryKeys";
import type { QueryReturn } from "../types";

export interface UseIdentityIdOptions {
  shouldFetch?: boolean;
}

export interface UseIdentityIdReturn extends Omit<QueryReturn<string | null>, "data"> {
  identityId: string | null;
  loading: boolean;
  refetch: () => void;
}

/**
 * Cognito 認証セッションから Identity ID を取得・保持するフック
 *
 * TanStack Query を使用してセッション情報をキャッシュ管理
 * - staleTime: Infinity でセッション中は再取得しない
 * - gcTime: Infinity でログアウトまでキャッシュ保持
 * - retry: false で認証エラーはリトライしない
 *
 * @param options.shouldFetch - identityId を取得するかどうか（デフォルト: true）
 */
export function useIdentityId(options?: UseIdentityIdOptions): UseIdentityIdReturn {
  const { shouldFetch = true } = options ?? {};

  const query = useQuery({
    queryKey: queryKeys.identityId(),
    queryFn: async () => {
      const session = await fetchAuthSession();
      return session.identityId ?? null;
    },
    staleTime: Number.POSITIVE_INFINITY, // セッション中は変わらない
    gcTime: Number.POSITIVE_INFINITY, // ログアウトまでキャッシュ保持
    retry: false, // 認証エラーはリトライしない
    enabled: shouldFetch,
  });

  return {
    identityId: query.data ?? null,
    loading: query.isLoading,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as Error | null,
    refetch: () => query.refetch(),
  };
}
