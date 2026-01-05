import { useState, useEffect, useCallback } from 'react';
import { parseUrlPath, syncToUrl } from './urlSync';

export interface UseStoragePathReturn {
  currentPath: string;
  navigate: (folderName: string) => void;
  goBack: () => void;
}

/**
 * パス状態を管理し URL クエリパラメータと同期するフック
 */
export function useStoragePath(): UseStoragePathReturn {
  const [currentPath, setCurrentPathState] = useState(() => parseUrlPath());

  // Wrapper to sync path changes to URL
  const setCurrentPath = useCallback((path: string) => {
    setCurrentPathState(path);
    syncToUrl(path);
  }, []);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPathState(parseUrlPath());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = useCallback(
    (folderName: string) => {
      const newPath = currentPath ? `${currentPath}/${folderName}` : folderName;
      setCurrentPath(newPath);
    },
    [currentPath, setCurrentPath]
  );

  const goBack = useCallback(() => {
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    const newPath = parts.join('/');
    setCurrentPath(newPath);
  }, [currentPath, setCurrentPath]);

  return { currentPath, navigate, goBack };
}
