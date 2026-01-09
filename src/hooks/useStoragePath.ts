import { useEffect, useCallback, useRef } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { currentPathAtom, navigateAtom, goBackAtom, setPathAtom } from "../stores/atoms";
import { parseUrlPath, syncToUrl } from "./urlSync";

export interface UseStoragePathReturn {
  currentPath: string;
  navigate: (folderName: string) => void;
  goBack: () => void;
}

/**
 * パス状態を管理し URL クエリパラメータと同期するファサード hook
 *
 * Jotai atoms に接続し、URL との双方向同期を維持する。
 *
 * Architecture Note:
 * - popstate リスナーは useEffect で維持（許可用途：ブラウザ API 同期）
 * - URL への同期は atom 更新時に行う
 */
export function useStoragePath(): UseStoragePathReturn {
  // Path atoms
  const currentPath = useAtomValue(currentPathAtom);
  const navigateAction = useSetAtom(navigateAtom);
  const goBackAction = useSetAtom(goBackAtom);
  const setPath = useSetAtom(setPathAtom);

  // 初期化: URL からパスを読み込む（初回のみ）
  const isInitializedRef = useRef(false);
  useEffect(() => {
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      const urlPath = parseUrlPath();
      if (urlPath) {
        setPath(urlPath);
      }
    }
  }, [setPath]);

  // URL への同期: currentPath が変更されたら URL を更新
  // Note: これは「外部システム（URL）への同期」なので useEffect 許可用途
  const prevPathRef = useRef<string | null>(null);
  useEffect(() => {
    // 初回レンダリング時は URL からの読み込みなので同期しない
    if (prevPathRef.current === null) {
      prevPathRef.current = currentPath;
      return;
    }
    // パスが変わった場合のみ URL を同期
    if (prevPathRef.current !== currentPath) {
      prevPathRef.current = currentPath;
      syncToUrl(currentPath);
    }
  }, [currentPath]);

  // Handle browser back/forward navigation
  // Note: これはブラウザ API との同期なので useEffect 許可用途
  useEffect(() => {
    const handlePopState = () => {
      const urlPath = parseUrlPath();
      setPath(urlPath);
      // popstate 時は URL 更新は不要（ブラウザが既に更新済み）
      prevPathRef.current = urlPath;
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [setPath]);

  // Action callbacks
  const navigate = useCallback(
    (folderName: string) => {
      navigateAction(folderName);
    },
    [navigateAction],
  );

  const goBack = useCallback(() => {
    goBackAction();
  }, [goBackAction]);

  return { currentPath, navigate, goBack };
}
