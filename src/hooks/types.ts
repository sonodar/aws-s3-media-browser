/**
 * 共通の Query Hook 戻り値の型定義
 */

/**
 * 基本的な Query Hook の戻り値
 */
export interface BaseQueryReturn {
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

/**
 * データを返す Query Hook の戻り値
 */
export interface QueryReturn<T> extends BaseQueryReturn {
  data: T;
}

/**
 * Mutation Hook の戻り値
 */
export interface MutationReturn<TParams = void> {
  mutate: (params: TParams) => void;
  mutateAsync: (params: TParams) => Promise<void>;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
}
