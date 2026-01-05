import { useState, useEffect, useCallback } from 'react';
import { list, remove, uploadData, getUrl } from 'aws-amplify/storage';
import { parseStorageItems } from './parseStorageItems';
import type { StorageItem } from '../types/storage';

export interface UseStorageOperationsProps {
  identityId: string | null;
  currentPath: string;
}

/**
 * 削除操作の結果
 */
export interface DeleteResult {
  /** 削除に成功したキー */
  succeeded: string[];
  /** 削除に失敗したキーとエラー */
  failed: Array<{ key: string; error: Error }>;
}

export interface UseStorageOperationsReturn {
  items: StorageItem[];
  loading: boolean;
  error: Error | null;
  uploadFiles: (files: File[]) => Promise<string[]>;
  removeItem: (key: string) => Promise<void>;
  /**
   * 複数アイテムを削除する
   * フォルダが含まれる場合は list で配下コンテンツを取得し一括削除
   */
  removeItems: (items: StorageItem[]) => Promise<DeleteResult>;
  /** 削除処理中フラグ */
  isDeleting: boolean;
  createFolder: (name: string) => Promise<void>;
  getFileUrl: (key: string) => Promise<string>;
  refresh: () => void;
}

/**
 * S3 ストレージ操作を提供するフック
 */
export function useStorageOperations({
  identityId,
  currentPath,
}: UseStorageOperationsProps): UseStorageOperationsReturn {
  const [items, setItems] = useState<StorageItem[]>([]);
  // Start loading if identityId is provided (will fetch on mount)
  const [loading, setLoading] = useState(!!identityId);
  const [error, setError] = useState<Error | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const getBasePath = useCallback(() => {
    if (!identityId) return null;
    const base = `media/${identityId}/`;
    return currentPath ? `${base}${currentPath}/` : base;
  }, [identityId, currentPath]);

  const fetchItems = useCallback(async () => {
    const basePath = getBasePath();
    if (!basePath) return;

    setLoading(true);
    setError(null);

    try {
      const result = await list({
        path: basePath,
        options: { listAll: true },
      });

      const parsed = parseStorageItems(result.items, basePath);
      setItems(parsed);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [getBasePath]);

  // Fetch items when identityId or currentPath changes
  useEffect(() => {
    if (identityId) {
      fetchItems();
    }
  }, [identityId, currentPath, fetchItems]);

  const uploadFiles = useCallback(
    async (files: File[]): Promise<string[]> => {
      const basePath = getBasePath();
      if (!basePath) return [];

      const uploadedKeys = files.map((file) => `${basePath}${file.name}`);

      await Promise.all(
        files.map((file) =>
          uploadData({
            path: `${basePath}${file.name}`,
            data: file,
          })
        )
      );

      await fetchItems();
      return uploadedKeys;
    },
    [getBasePath, fetchItems]
  );

  const removeItem = useCallback(
    async (key: string) => {
      await remove({ path: key });
      await fetchItems();
    },
    [fetchItems]
  );

  /**
   * フォルダ配下のすべてのファイルキーを取得する
   */
  const listFolderContents = useCallback(async (folderKey: string): Promise<string[]> => {
    const result = await list({
      path: folderKey,
      options: { listAll: true },
    });
    return result.items.map((item) => item.path);
  }, []);

  /**
   * 複数アイテムを削除する
   * フォルダが含まれる場合は配下コンテンツも一括削除
   */
  const removeItems = useCallback(
    async (itemsToDelete: StorageItem[]): Promise<DeleteResult> => {
      setIsDeleting(true);

      try {
        // 削除対象のすべてのキーを収集
        const allKeysToDelete: string[] = [];

        for (const item of itemsToDelete) {
          if (item.type === 'folder') {
            // フォルダの場合は配下コンテンツを取得
            const folderContents = await listFolderContents(item.key);
            allKeysToDelete.push(...folderContents);
            // フォルダオブジェクト自体も削除対象に追加
            allKeysToDelete.push(item.key);
          } else {
            allKeysToDelete.push(item.key);
          }
        }

        // 重複を除去
        const uniqueKeys = [...new Set(allKeysToDelete)];

        // 並列で削除を実行
        const results = await Promise.allSettled(
          uniqueKeys.map(async (key) => {
            await remove({ path: key });
            return key;
          })
        );

        // 結果を分類
        const succeeded: string[] = [];
        const failed: Array<{ key: string; error: Error }> = [];

        results.forEach((result, index) => {
          const key = uniqueKeys[index];
          if (result.status === 'fulfilled') {
            succeeded.push(key);
          } else {
            failed.push({ key, error: result.reason as Error });
          }
        });

        // 削除後にリストを更新
        await fetchItems();

        return { succeeded, failed };
      } finally {
        setIsDeleting(false);
      }
    },
    [listFolderContents, fetchItems]
  );

  const createFolder = useCallback(
    async (name: string) => {
      const basePath = getBasePath();
      if (!basePath) return;

      const folderPath = `${basePath}${name}/`;
      await uploadData({
        path: folderPath,
        data: '',
      });
      await fetchItems();
    },
    [getBasePath, fetchItems]
  );

  const getFileUrl = useCallback(async (key: string): Promise<string> => {
    const result = await getUrl({ path: key });
    return result.url.toString();
  }, []);

  const refresh = useCallback(() => {
    fetchItems();
  }, [fetchItems]);

  return {
    items,
    loading,
    error,
    uploadFiles,
    removeItem,
    removeItems,
    isDeleting,
    createFolder,
    getFileUrl,
    refresh,
  };
}
