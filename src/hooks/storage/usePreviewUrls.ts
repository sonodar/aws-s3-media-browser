import { useQueries } from "@tanstack/react-query";
import { getUrl } from "aws-amplify/storage";
import type { Slide } from "yet-another-react-lightbox";
import type { StorageItem } from "../../types/storage";
import { isImageFile, isVideoFile } from "../../utils/fileTypes";
import { queryKeys } from "../../stores/queryKeys";
import type { QueryReturn } from "../types";

/**
 * ビデオファイルの MIME タイプを取得する
 */
function getVideoMimeType(filename: string): string {
  const ext = filename.toLowerCase().split(".").pop();
  switch (ext) {
    case "webm":
      return "video/webm";
    // mp4, mov, avi, mkv などは video/mp4 として扱う
    // 多くのブラウザは video/quicktime をサポートしていないため
    default:
      return "video/mp4";
  }
}

/**
 * StorageItem から Slide を生成する
 * @param item - StorageItem
 * @param previewUrl - プレビュー用 URL（表示用）
 * @param downloadUrl - ダウンロード用 URL（Content-Disposition: attachment 付き）
 */
// 未取得のスライド用に使う 1px 透明画像（ネットワーク負荷なし）
const TRANSPARENT_PIXEL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

function createSlide(item: StorageItem, previewUrl?: string, downloadUrl?: string): Slide | null {
  if (isImageFile(item.name)) {
    return {
      src: previewUrl ?? TRANSPARENT_PIXEL,
      download: downloadUrl ? { url: downloadUrl, filename: item.name } : false,
    };
  }

  if (isVideoFile(item.name)) {
    return {
      type: "video" as const,
      width: 1280,
      height: 720,
      sources: previewUrl ? [{ src: previewUrl, type: getVideoMimeType(item.name) }] : [],
      download: downloadUrl ? { url: downloadUrl, filename: item.name } : false,
    };
  }

  return null;
}

export interface UsePreviewUrlsOptions {
  enabled?: boolean;
  /** 現在表示中のスライド位置（lazy の基準） */
  currentIndex?: number;
  /** 前後に先読みする枚数 */
  preload?: number;
}

export interface UsePreviewUrlsResult extends QueryReturn<Slide[]> {}

/**
 * プレビュー対象アイテムの署名付き URL を並列取得し、Slide 配列を返す
 *
 * @param items プレビュー対象の StorageItem 配列
 * @param options オプション
 * @returns slides, isLoading, isError, error
 */
export function usePreviewUrls(
  items: StorageItem[],
  options: UsePreviewUrlsOptions = {},
): UsePreviewUrlsResult {
  const { enabled = true, currentIndex, preload = 1 } = options;

  const hasItems = items.length > 0;
  // currentIndex がある場合のみ lazy 対象にする
  const shouldLazyLoad = Number.isFinite(currentIndex);
  const safePreload = Math.max(0, preload);
  // 現在位置から前後 safePreload 枚を取得対象にする
  const loadStart = shouldLazyLoad ? Math.max(0, (currentIndex ?? 0) - safePreload) : 0;
  const loadEnd = shouldLazyLoad
    ? Math.min(items.length - 1, (currentIndex ?? 0) + safePreload)
    : items.length - 1;

  // URL 取得をアイテム単位の query に分割（lazy で必要分だけ取得）
  const results = useQueries({
    queries: items.map((item, index) => {
      const previewable = isImageFile(item.name) || isVideoFile(item.name);
      const inRange = index >= loadStart && index <= loadEnd;
      const shouldFetch = enabled && hasItems && previewable && (!shouldLazyLoad || inRange);
      return {
        queryKey: queryKeys.previewUrl(item.key),
        queryFn: async () => {
          // プレビュー用 URL（通常表示用）
          const { url: previewUrl } = await getUrl({ path: item.key });
          // ダウンロード用 URL（Content-Disposition: attachment 付き）
          const { url: downloadUrl } = await getUrl({
            path: item.key,
            options: {
              contentDisposition: { type: "attachment", filename: item.name },
            },
          });
          return createSlide(item, previewUrl.toString(), downloadUrl.toString());
        },
        enabled: shouldFetch,
        staleTime: 10 * 60 * 1000, // 10分（署名付き URL の有効期限を考慮）
      };
    }),
  });

  // URL 未取得のスライドはプレースホルダにする
  const slides = items
    .map((item, index) => {
      const previewable = isImageFile(item.name) || isVideoFile(item.name);
      if (!previewable) return null;
      const data = results[index]?.data;
      return data ?? createSlide(item);
    })
    .filter((slide): slide is Slide => slide !== null);

  const shouldReturnEmpty = !hasItems || !enabled;
  // 1枚も取得できていない場合は Lightbox を開かない
  const hasLoadedSlide = results.some((result) => Boolean(result.data));

  return {
    data: shouldReturnEmpty || !hasLoadedSlide ? [] : slides,
    isLoading: shouldReturnEmpty ? false : results.some((result) => result.isLoading),
    isError: shouldReturnEmpty ? false : results.some((result) => result.isError),
    error: shouldReturnEmpty
      ? null
      : (results.find((result) => result.isError)?.error as Error | null),
  };
}
