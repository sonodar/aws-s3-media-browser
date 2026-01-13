import { useQuery } from "@tanstack/react-query";
import { list } from "aws-amplify/storage";
import { queryKeys } from "../../stores/queryKeys";
import { parseStorageItems } from "./parseStorageItems";
import { buildMediaBasePath, extractRelativePath } from "../../utils/storagePathUtils";
import type { StorageItem } from "../../types/storage";
import type { QueryReturn } from "../types";

export interface UseFolderListOptions {
  /** クエリを有効化するかどうか（default: true） */
  enabled?: boolean;
}

export interface UseFolderListReturn extends QueryReturn<StorageItem[]> {}

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

  // path がフルパスの場合は相対パスに変換
  // （MoveDialog や FolderBrowser からフルパスが渡される場合がある）
  // クエリキーの一貫性のため、queryFn の外で正規化する
  let normalizedPath = path;
  if (identityId) {
    const extracted = extractRelativePath(path, identityId);
    if (extracted !== null) {
      normalizedPath = extracted;
    }
  }

  const query = useQuery({
    queryKey: queryKeys.folders(identityId ?? "", normalizedPath),
    queryFn: async () => {
      if (!identityId) {
        return [];
      }

      const basePath = buildMediaBasePath(identityId, normalizedPath);
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

  const data = query.data ?? [];

  return {
    data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as Error | null,
  };
}
