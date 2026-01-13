/**
 * サムネイル URL 取得用 useQuery フック
 *
 * - originalKey からサムネイル URL を取得
 * - Lambda による生成完了を待機するリトライ機構
 * - 5分間のキャッシュ保持
 */
import { useQuery } from "@tanstack/react-query";
import { getProperties, getUrl } from "aws-amplify/storage";
import { queryKeys } from "../../stores/queryKeys";
import { getThumbnailPath } from "../../utils/pathUtils";

export interface UseThumbnailUrlOptions {
  /** リトライ回数（デフォルト: 4） - テスト時に false を指定可能 */
  retry?: number | false;
}

/**
 * サムネイル URL を取得するフック
 *
 * Lambda によるサムネイル生成には遅延があるため、
 * 指数バックオフによるリトライ（最大4回）で生成完了を待機する。
 *
 * @param originalKey オリジナルファイルのキー（例: "media/abc123/photos/image.jpg"）
 * @param options オプション
 * @returns url, isLoading, isError
 */
export function useThumbnailUrl(originalKey: string, options: UseThumbnailUrlOptions = {}) {
  const { retry = 4 } = options;

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.thumbnail(originalKey),
    queryFn: async () => {
      const thumbnailPath = getThumbnailPath(originalKey);

      // ファイル存在確認（存在しない場合は例外 → リトライ発動）
      // 注意: getUrl はファイルが存在しなくても署名付き URL を返すため、
      // getUrl だけではファイルが存在しない場合にリトライされない。
      // getProperties でファイルの存在を確認し、存在しなければ例外を発生させる。
      await getProperties({ path: thumbnailPath });

      // URL 取得
      const result = await getUrl({ path: thumbnailPath });
      return result.url.toString();
    },
    retry,
    retryDelay: (attemptIndex) => Math.pow(2, attemptIndex) * 1000, // 1s, 2s, 4s, 8s
    staleTime: 5 * 60 * 1000, // 5分間のキャッシュ
  });

  return {
    url: data ?? null,
    isLoading,
    isError,
  };
}
