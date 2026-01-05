import { useState, useEffect, useCallback } from 'react';
import { list, remove, uploadData, getUrl } from 'aws-amplify/storage';
import { parseStorageItems } from './parseStorageItems';
import type { StorageItem } from '../types/storage';

export interface UseStorageOperationsProps {
  identityId: string | null;
  currentPath: string;
}

export interface UseStorageOperationsReturn {
  items: StorageItem[];
  loading: boolean;
  error: Error | null;
  uploadFiles: (files: File[]) => Promise<string[]>;
  removeItem: (key: string) => Promise<void>;
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
    createFolder,
    getFileUrl,
    refresh,
  };
}
