import { useCallback } from "react";
import { Folder, ArrowUp, Home } from "lucide-react";
import { useFolderList } from "../../hooks/storage";
import type { StorageItem } from "../../types/storage";
import "./FolderBrowser.css";

export interface FolderBrowserProps {
  /** Identity ID（認証ユーザーのID） */
  identityId: string | null;
  /** 現在表示中のパス（media/{identityId}/を除いた相対パス） */
  currentPath: string;
  /** ルートパス（これ以上遡れない） */
  rootPath?: string;
  /** 無効化するパス（循環移動防止） */
  disabledPaths: string[];
  /** フォルダナビゲーションコールバック */
  onNavigate: (path: string) => void;
  /** クエリを有効化するかどうか（default: true） */
  enabled?: boolean;
}

/**
 * フォルダ一覧表示・ナビゲーションコンポーネント
 * TanStack Query を使用してフォルダ一覧を取得
 * クリックでフォルダ内に移動する
 */
export function FolderBrowser({
  identityId,
  currentPath,
  rootPath = "",
  disabledPaths,
  onNavigate,
  enabled = true,
}: FolderBrowserProps) {
  // TanStack Query でフォルダ一覧を取得
  const { data: folders, isLoading } = useFolderList(identityId, currentPath, { enabled });

  // パスが無効化されているか判定
  const isDisabled = useCallback((path: string) => disabledPaths.includes(path), [disabledPaths]);

  // フォルダクリック（ナビゲーション）
  const handleClick = useCallback(
    (folder: StorageItem) => {
      if (!isDisabled(folder.key)) {
        onNavigate(folder.key);
      }
    },
    [isDisabled, onNavigate],
  );

  // 親フォルダへのパスを計算
  const getParentPath = useCallback(() => {
    // 末尾のスラッシュを除去してから処理
    const pathWithoutTrailingSlash = currentPath.endsWith("/")
      ? currentPath.slice(0, -1)
      : currentPath;

    const lastSlashIndex = pathWithoutTrailingSlash.lastIndexOf("/");
    if (lastSlashIndex === -1) {
      return "";
    }
    return pathWithoutTrailingSlash.slice(0, lastSlashIndex + 1);
  }, [currentPath]);

  // ルートにいるか判定
  const isAtRoot = currentPath === rootPath;

  // ローディング状態
  if (isLoading) {
    return (
      <div className="folder-browser" data-testid="folder-browser-loading">
        <div className="folder-browser-loading">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="folder-browser">
      {/* ナビゲーションボタン（常に表示、ルートでは無効化） */}
      <div className="folder-browser-nav">
        <button
          type="button"
          onClick={() => onNavigate(getParentPath())}
          className="nav-button"
          aria-label="上へ"
          disabled={isAtRoot}
        >
          <ArrowUp size={16} />
          <span>上へ</span>
        </button>
        <button
          type="button"
          onClick={() => onNavigate(rootPath)}
          className="nav-button"
          aria-label="ホーム"
          disabled={isAtRoot}
        >
          <Home size={16} />
          <span>ホーム</span>
        </button>
      </div>

      {/* フォルダ一覧 */}
      {folders.length === 0 ? (
        <div className="folder-browser-empty">フォルダがありません</div>
      ) : (
        <ul className="folder-list">
          {folders.map((folder) => {
            const disabled = isDisabled(folder.key);

            return (
              <li
                key={folder.key}
                className={`folder-item ${disabled ? "disabled" : ""}`}
                data-disabled={disabled}
                onClick={() => handleClick(folder)}
              >
                <Folder size={18} className="folder-icon" />
                <span className="folder-name">{folder.name}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
