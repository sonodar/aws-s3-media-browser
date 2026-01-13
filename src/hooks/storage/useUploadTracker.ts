import { useState, useCallback, useEffect, useRef } from "react";

export interface UseUploadTrackerReturn {
  recentlyUploadedKeys: string[];
  trackUpload: (keys: string[]) => void;
  clearKeys: (keys: string[]) => void;
}

/**
 * アップロードされたファイルのキーを追跡し、指定時間後に自動クリアするフック
 */
export function useUploadTracker(clearDelay: number = 3000): UseUploadTrackerReturn {
  const [recentlyUploadedKeys, setRecentlyUploadedKeys] = useState<string[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current.clear();
    };
  }, []);

  const clearKeys = useCallback((keys: string[]) => {
    setRecentlyUploadedKeys((prev) => prev.filter((key) => !keys.includes(key)));
    // Also clear any pending timers for these keys
    keys.forEach((key) => {
      const timer = timersRef.current.get(key);
      if (timer) {
        clearTimeout(timer);
        timersRef.current.delete(key);
      }
    });
  }, []);

  const trackUpload = useCallback(
    (keys: string[]) => {
      setRecentlyUploadedKeys((prev) => [...prev, ...keys]);

      // Set up auto-clear timer for each key
      keys.forEach((key) => {
        const timer = setTimeout(() => {
          setRecentlyUploadedKeys((prev) => prev.filter((k) => k !== key));
          timersRef.current.delete(key);
        }, clearDelay);
        timersRef.current.set(key, timer);
      });
    },
    [clearDelay],
  );

  return { recentlyUploadedKeys, trackUpload, clearKeys };
}
