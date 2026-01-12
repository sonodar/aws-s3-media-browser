import { useQuery } from "@tanstack/react-query";
import { list } from "aws-amplify/storage";
import { queryKeys } from "../../stores/queryKeys";
import { parseStorageItems } from "./parseStorageItems";
import type { StorageItem } from "../../types/storage";

export interface UseFolderListOptions {
  /** クエリを有効化するかどうか（default: true） */
  enabled?: boolean;
}

export interface UseFolderListReturn {
  folders: StorageItem[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

/**
 * 指定パスのフォルダ一覧を取得するフック（移動先選択用）
 *
 * TanStack Query を使用してS3からフォルダのみを取得
 * - enabled: identityId が存在し、enabled オプションが true の場合のみ実行
 * - フォルダのみをフィルタリングして返す
 * - MoveDialog が開いている間のみ有効化することを想定
 */
export function useFolderList(
  identityId: string | null,
  path: string,
  options: UseFolderListOptions = {},
): UseFolderListReturn {
  const { enabled = true } = options;

  const query = useQuery({
    queryKey: queryKeys.folders(identityId ?? "", path),
    queryFn: async () => {
      if (!identityId) {
        return [];
      }

      // パスの末尾スラッシュを正規化
      const normalizedPath = path.endsWith("/") || path === "" ? path : `${path}/`;
      const basePath = normalizedPath
        ? `media/${identityId}/${normalizedPath}`
        : `media/${identityId}/`;

      const result = await list({
        path: basePath,
        options: { listAll: true },
      });

      const allItems = parseStorageItems(result.items, basePath);

      // フォルダのみをフィルタリング
      return allItems.filter((item) => item.type === "folder");
    },
    enabled: enabled && !!identityId,
  });

  return {
    folders: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ?? null,
  };
}
