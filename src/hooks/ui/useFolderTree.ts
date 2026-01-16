import { useState, useCallback, useMemo, useEffect } from "react";
import { useTree, type TreeNodeData } from "@mantine/core";
import { useQueryClient } from "@tanstack/react-query";
import { list } from "aws-amplify/storage";
import { useStorageItems } from "../storage";
import type { StorageItem } from "../../types/storage";
import { toRelativeStoragePath, buildMediaBasePath } from "../../utils/storagePathUtils";
import { toRelativePath } from "../../utils/pathUtils";
import { parseExcludedSubpaths, mergeAndDeduplicateFolders } from "../storage/storageItemParser";
import { queryKeys } from "../../stores/queryKeys";

export interface UseFolderTreeOptions {
  /** Identity ID */
  identityId: string;
  /** ルートパス */
  rootPath: string;
  /** 無効化するパス */
  disabledPaths: string[];
  /** 現在のパス（移動元） */
  currentPath: string;
}

export interface UseFolderTreeReturn {
  /** ツリーデータ（Mantine Tree 用） */
  treeData: TreeNodeData[];
  /** 選択中のパス */
  selectedPath: string | null;
  /** ローディング中のパス Set */
  loadingPaths: Set<string>;
  /** Mantine useTree コントローラ */
  tree: ReturnType<typeof useTree>;
  /** ノード選択ハンドラ */
  selectNode: (path: string) => void;
  /** ノード展開ハンドラ */
  toggleExpanded: (path: string) => void;
  /** パスが無効かどうか判定 */
  isDisabled: (path: string) => boolean;
}

/**
 * StorageItem から TreeNodeData への変換ユーティリティ
 */
export function toTreeNodeData(folder: StorageItem, children?: TreeNodeData[]): TreeNodeData {
  return {
    value: folder.key,
    label: folder.name,
    children,
  };
}

/**
 * フォルダツリーのデータ管理と非同期読み込みロジック
 */
export function useFolderTree({
  identityId,
  rootPath,
  disabledPaths,
  currentPath,
}: UseFolderTreeOptions): UseFolderTreeReturn {
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [loadingPaths, setLoadingPaths] = useState<Set<string>>(new Set());
  const [childrenCache, setChildrenCache] = useState<Map<string, TreeNodeData[]>>(new Map());

  // TanStack Query クライアント
  const queryClient = useQueryClient();

  // Mantine useTree フック（展開状態を管理）
  const tree = useTree({
    initialExpandedState: { [rootPath]: true },
  });

  // ルートフォルダの相対パス（useStorageItems用）
  const normalizedRootPath = toRelativeStoragePath(rootPath, identityId);

  // ルートフォルダの子フォルダを取得
  const { data: rootFolders, isLoading: isRootLoading } = useStorageItems(
    identityId,
    normalizedRootPath,
  );

  // フォルダのみをフィルタリング
  const rootFolderItems = useMemo(
    () => rootFolders.filter((item) => item.type === "folder"),
    [rootFolders],
  );

  // ルートの子ノードをキャッシュに設定
  useEffect(() => {
    if (!isRootLoading && rootFolderItems.length > 0) {
      const childNodes = rootFolderItems.map((folder) => toTreeNodeData(folder));
      setChildrenCache((prev) => {
        const next = new Map(prev);
        next.set(rootPath, childNodes);
        return next;
      });
    }
  }, [rootFolderItems, isRootLoading, rootPath]);

  // ツリーデータの構築
  const treeData = useMemo<TreeNodeData[]>(() => {
    const buildChildren = (parentPath: string): TreeNodeData[] | undefined => {
      const cachedChildren = childrenCache.get(parentPath);
      if (!cachedChildren) return undefined;
      return cachedChildren.map((node) => ({
        ...node,
        children: buildChildren(node.value),
      }));
    };

    const rootNode: TreeNodeData = {
      value: rootPath,
      label: "ホーム",
      children: buildChildren(rootPath),
    };

    return [rootNode];
  }, [rootPath, childrenCache]);

  // パスが無効かどうか判定
  const isDisabled = useCallback(
    (path: string): boolean => {
      // 現在のパス（移動元）は無効
      if (path === currentPath) return true;

      // disabledPaths に含まれるか、その配下か
      for (const disabledPath of disabledPaths) {
        if (path === disabledPath || path.startsWith(disabledPath)) {
          return true;
        }
      }

      return false;
    },
    [currentPath, disabledPaths],
  );

  // ノード選択ハンドラ
  const selectNode = useCallback(
    (path: string) => {
      if (!isDisabled(path)) {
        setSelectedPath(path);
      }
    },
    [isDisabled],
  );

  /**
   * ストレージアイテムを取得する（useStorageItems と同じロジック）
   */
  const fetchStorageItems = useCallback(
    async (normalizedPath: string): Promise<StorageItem[]> => {
      const basePath = buildMediaBasePath(identityId, normalizedPath);
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

        // basePath からの相対パスを取得
        const name = toRelativePath(item.path, basePath);

        if (item.path.endsWith("/")) {
          // 明示的フォルダ
          explicitFolders.push({
            key: item.path,
            name,
            type: "folder" as const,
          });
        } else {
          // ファイル
          files.push({
            key: item.path,
            name,
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

      return [...allFolders, ...files];
    },
    [identityId],
  );

  // ノード展開ハンドラ（動的フェッチ対応）
  const toggleExpanded = useCallback(
    async (path: string) => {
      if (tree.expandedState[path]) {
        tree.collapse(path);
      } else {
        tree.expand(path);

        // 未取得の場合は子フォルダを取得
        if (!childrenCache.has(path)) {
          setLoadingPaths((prev) => new Set([...prev, path]));
          try {
            const normalizedPath = toRelativeStoragePath(path, identityId);
            const items = await queryClient.fetchQuery({
              queryKey: queryKeys.storageItems(identityId, normalizedPath),
              queryFn: () => fetchStorageItems(normalizedPath),
            });

            // フォルダのみをフィルタリング
            const folders = items.filter((item) => item.type === "folder");
            const childNodes = folders.map((folder) => toTreeNodeData(folder));

            setChildrenCache((prev) => {
              const next = new Map(prev);
              next.set(path, childNodes);
              return next;
            });
          } catch (error) {
            console.error("Failed to fetch children:", error);
            // エラー時は空の配列をキャッシュ
            setChildrenCache((prev) => {
              const next = new Map(prev);
              next.set(path, []);
              return next;
            });
          } finally {
            setLoadingPaths((prev) => {
              const next = new Set(prev);
              next.delete(path);
              return next;
            });
          }
        }
      }
    },
    [tree, childrenCache, identityId, queryClient, fetchStorageItems],
  );

  return {
    treeData,
    selectedPath,
    loadingPaths,
    tree,
    selectNode,
    toggleExpanded,
    isDisabled,
  };
}
