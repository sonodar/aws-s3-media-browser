import { useQuery } from "@tanstack/react-query";
import { list } from "aws-amplify/storage";
import { queryKeys } from "../../stores/queryKeys";
import { parseExcludedSubpaths, mergeAndDeduplicateFolders } from "./storageItemParser";
import { buildMediaBasePath } from "../../utils/storagePathUtils";
import type { StorageItem } from "../../types/storage";
import type { QueryReturn } from "../types";

export interface UseStorageItemsReturn extends QueryReturn<StorageItem[]> {}

/**
 * ストレージアイテム一覧を取得・管理するフック
 *
 * subpathStrategy: 'exclude' を使用してAPIコールを最適化
 * - 直接の子のみを取得（ネストされたファイルを除外）
 * - excludedSubpaths からサブフォルダ情報を取得
 * - FolderBrowser と MediaBrowser でキャッシュを共有
 */
export function useStorageItems(
  identityId: string | null,
  currentPath: string,
): UseStorageItemsReturn {
  const query = useQuery({
    queryKey: queryKeys.storageItems(identityId ?? "", currentPath),
    queryFn: async () => {
      if (!identityId) {
        return [];
      }

      const basePath = buildMediaBasePath(identityId, currentPath);
      const result = await list({
        path: basePath,
        options: {
          subpathStrategy: { strategy: "exclude" },
        },
      });

      // items から直接の子を抽出（ファイルと明示的フォルダ）
      const files: StorageItem[] = [];
      const explicitFolders: StorageItem[] = [];

      for (const item of result.items) {
        // 現在のパスマーカーを除外
        if (item.path === basePath) continue;

        const relativePath = item.path.replace(basePath, "");
        const name = relativePath.replace(/\/$/, "");

        if (item.path.endsWith("/")) {
          // 明示的フォルダ（0バイトのスラッシュオブジェクト）
          explicitFolders.push({
            key: item.path,
            name,
            type: "folder" as const,
          });
        } else {
          // ファイル
          files.push({
            key: item.path,
            name: relativePath,
            type: "file" as const,
            size: item.size,
            lastModified: item.lastModified,
          });
        }
      }

      // excludedSubpaths から暗黙的フォルダを抽出
      const implicitFolders = parseExcludedSubpaths(result.excludedSubpaths ?? [], basePath);

      // 明示的フォルダと暗黙的フォルダを統合（重複排除）
      const allFolders = mergeAndDeduplicateFolders(explicitFolders, implicitFolders);

      // フォルダとファイルを結合してソート（フォルダ優先、アルファベット順）
      const combined = [...allFolders, ...files];
      combined.sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === "folder" ? -1 : 1;
      });

      return combined;
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
