import { QueryClient, type DefaultOptions } from "@tanstack/react-query";

/**
 * TanStack Query のデフォルトオプション
 *
 * - staleTime: 5分（頻繁な再取得を抑制）
 * - gcTime: 30分（メモリ効率のためガベージコレクション）
 * - retry: 3（ネットワークエラーの自動リトライ）
 * - refetchOnWindowFocus: false（S3 データは頻繁に変わらない）
 * - networkMode: 'always'（オフラインでもリクエストを試行し、失敗時にエラー状態にする）
 *   デフォルトの 'online' では、オフライン時にクエリが「一時停止」状態になり、
 *   isLoading: false, isError: false, data: undefined となるため、
 *   エラー表示ができず「ファイルがありません」と表示されてしまう問題を回避する
 */
export const queryClientOptions: DefaultOptions = {
  queries: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 3,
    refetchOnWindowFocus: false,
    networkMode: "always",
  },
};

/**
 * アプリケーション全体で共有する QueryClient インスタンス
 */
export const queryClient = new QueryClient({
  defaultOptions: queryClientOptions,
});
