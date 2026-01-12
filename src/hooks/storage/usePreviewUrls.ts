import { useQuery } from "@tanstack/react-query";
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
    case "mp4":
      return "video/mp4";
    case "webm":
      return "video/webm";
    case "mov":
      return "video/quicktime";
    case "avi":
      return "video/x-msvideo";
    case "mkv":
      return "video/x-matroska";
    default:
      return "video/mp4";
  }
}

/**
 * StorageItem から Slide を生成する
 */
async function createSlide(item: StorageItem): Promise<Slide | null> {
  const { url } = await getUrl({ path: item.key });
  const urlString = url.toString();

  if (isImageFile(item.name)) {
    return { src: urlString };
  }

  if (isVideoFile(item.name)) {
    return {
      type: "video" as const,
      width: 1280,
      height: 720,
      sources: [{ src: urlString, type: getVideoMimeType(item.name) }],
    };
  }

  return null;
}

export interface UsePreviewUrlsOptions {
  enabled?: boolean;
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
  const { enabled = true } = options;

  const itemKeys = items.map((item) => item.key);
  const hasItems = items.length > 0;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.previewUrls(itemKeys),
    queryFn: async () => {
      const slidePromises = items.map(createSlide);
      const results = await Promise.all(slidePromises);
      return results.filter((slide): slide is Slide => slide !== null);
    },
    enabled: enabled && hasItems,
    staleTime: 10 * 60 * 1000, // 10分（署名付き URL の有効期限を考慮）
  });

  const slides = data ?? [];

  return {
    data: slides,
    isLoading: hasItems && enabled ? isLoading : false,
    isError,
    error: error as Error | null,
  };
}
