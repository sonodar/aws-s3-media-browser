import { useState, useEffect, useCallback } from 'react';
import { list, remove, uploadData, getUrl } from 'aws-amplify/storage';
import { fetchAuthSession } from 'aws-amplify/auth';

export interface StorageItem {
  key: string;
  name: string;
  type: 'file' | 'folder';
  size?: number;
  lastModified?: Date;
}

export interface UseStorageReturn {
  items: StorageItem[];
  loading: boolean;
  error: Error | null;
  currentPath: string;
  navigate: (path: string) => void;
  goBack: () => void;
  upload: (files: File[]) => Promise<void>;
  remove: (key: string) => Promise<void>;
  createFolder: (name: string) => Promise<void>;
  refresh: () => void;
  getFileUrl: (key: string) => Promise<string>;
  /** Keys of recently uploaded files (for delayed thumbnail fetch) */
  recentlyUploadedKeys: string[];
}

/** Delay in ms before fetching thumbnails for newly uploaded files */
const THUMBNAIL_FETCH_DELAY = 3000;

export function useStorage(): UseStorageReturn {
  const [items, setItems] = useState<StorageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [currentPath, setCurrentPath] = useState('');
  const [identityId, setIdentityId] = useState<string | null>(null);
  const [recentlyUploadedKeys, setRecentlyUploadedKeys] = useState<string[]>([]);

  // Fetch identity ID on mount
  useEffect(() => {
    fetchAuthSession()
      .then((session) => {
        setIdentityId(session.identityId ?? null);
      })
      .catch((err) => {
        setError(err);
        setLoading(false);
      });
  }, []);

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

      // Parse items - filter out current path prefix and extract relative names
      const parsed: StorageItem[] = result.items
        .filter((item) => item.path !== basePath) // Exclude current folder marker
        .map((item) => {
          const relativePath = item.path.replace(basePath, '');
          // Check if this is a direct child or nested
          const parts = relativePath.split('/').filter(Boolean);

          if (parts.length === 0) return null;

          // Only show direct children
          const isFolder = item.path.endsWith('/') || parts.length > 1;
          const name = parts[0];

          return {
            key: item.path,
            name: isFolder ? name : relativePath,
            type: isFolder ? 'folder' : 'file',
            size: item.size,
            lastModified: item.lastModified,
          } as StorageItem;
        })
        .filter((item): item is StorageItem => item !== null);

      // Deduplicate folders (multiple files in same subfolder)
      const uniqueItems = parsed.reduce((acc, item) => {
        const existing = acc.find((i) => i.name === item.name && i.type === item.type);
        if (!existing) {
          acc.push(item);
        }
        return acc;
      }, [] as StorageItem[]);

      // Sort: folders first, then files
      uniqueItems.sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === 'folder' ? -1 : 1;
      });

      setItems(uniqueItems);
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

  const navigate = useCallback((path: string) => {
    setCurrentPath((prev) => (prev ? `${prev}/${path}` : path));
  }, []);

  const goBack = useCallback(() => {
    setCurrentPath((prev) => {
      const parts = prev.split('/').filter(Boolean);
      parts.pop();
      return parts.join('/');
    });
  }, []);

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

  const uploadFiles = useCallback(
    async (files: File[]) => {
      const basePath = getBasePath();
      if (!basePath) return;

      // Calculate the keys for uploaded files
      const uploadedKeys = files.map((file) => `${basePath}${file.name}`);

      await Promise.all(
        files.map((file) =>
          uploadData({
            path: `${basePath}${file.name}`,
            data: file,
          })
        )
      );

      // Track recently uploaded keys for delayed thumbnail fetch
      setRecentlyUploadedKeys((prev) => [...prev, ...uploadedKeys]);

      // Clear recently uploaded keys after delay
      setTimeout(() => {
        setRecentlyUploadedKeys((prev) =>
          prev.filter((key) => !uploadedKeys.includes(key))
        );
      }, THUMBNAIL_FETCH_DELAY);

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
    currentPath,
    navigate,
    goBack,
    upload: uploadFiles,
    remove: removeItem,
    createFolder,
    refresh,
    getFileUrl,
    recentlyUploadedKeys,
  };
}
