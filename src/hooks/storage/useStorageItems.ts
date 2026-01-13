import { useQuery } from "@tanstack/react-query";
import { list } from "aws-amplify/storage";
import { queryKeys } from "../../stores/queryKeys";
import { parseStorageItems } from "./parseStorageItems";
import { buildMediaBasePath } from "../../utils/storagePathUtils";
import type { StorageItem } from "../../types/storage";
import type { QueryReturn } from "../types";

export interface UseStorageItemsReturn extends QueryReturn<StorageItem[]> {}

/**
 * ストレージアイテム一覧を取得・管理するフック
 *
 * TanStack Query を使用してS3からアイテムを取得
 * - enabled: identityId が存在する場合のみ実行
 * - パス変更時に自動で再取得
 * - キャッシュにより同じパスへの再訪問時は即座に表示
 */
export function useStorageItems(
  identityId: string | null,
  currentPath: string,
): UseStorageItemsReturn {
  const query = useQuery({
    queryKey: queryKeys.items(identityId ?? "", currentPath),
    queryFn: async () => {
      if (!identityId) {
        return [];
      }

      const basePath = buildMediaBasePath(identityId, currentPath);
      const result = await list({
        path: basePath,
        options: { listAll: true },
      });

      return parseStorageItems(result.items, basePath);
    },
    enabled: !!identityId,
  });

  const data = query.data ?? [];

  return {
    data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as Error | null,
  };
}
