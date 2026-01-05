import './Header.css';

interface HeaderProps {
  currentPath: string;
  onBack: () => void;
  onSignOut: () => void;
  /** 選択モードが有効か */
  isSelectionMode?: boolean;
  /** 選択件数 */
  selectedCount?: number;
  /** 全選択状態か */
  isAllSelected?: boolean;
  /** 選択モード開始 */
  onEnterSelectionMode?: () => void;
  /** 選択モード終了 */
  onExitSelectionMode?: () => void;
  /** 全選択/解除トグル */
  onToggleSelectAll?: () => void;
  /** 削除ボタン押下 */
  onDeleteSelected?: () => void;
  /** 設定モーダルを開く */
  onOpenSettings?: () => void;
}

export function Header({
  currentPath,
  onBack,
  onSignOut,
  isSelectionMode = false,
  selectedCount = 0,
  isAllSelected = false,
  onEnterSelectionMode,
  onExitSelectionMode,
  onToggleSelectAll,
  onDeleteSelected,
  onOpenSettings,
}: HeaderProps) {
  const pathParts = currentPath.split('/').filter(Boolean);
  const currentFolder = pathParts[pathParts.length - 1] || null;

  if (isSelectionMode) {
    return (
      <header className="media-browser-header media-browser-header--selection">
        <div className="header-left">
          <button
            className="cancel-button"
            onClick={onExitSelectionMode}
            aria-label="キャンセル"
          >
            キャンセル
          </button>
          <span className="selection-count" aria-live="polite">{selectedCount}件選択中</span>
        </div>
        <div className="header-right">
          {onToggleSelectAll && (
            <button
              className="select-all-button"
              onClick={onToggleSelectAll}
              aria-label={isAllSelected ? '全解除' : '全選択'}
            >
              {isAllSelected ? '全解除' : '全選択'}
            </button>
          )}
          {onDeleteSelected && (
            <button
              className="delete-button"
              onClick={onDeleteSelected}
              disabled={selectedCount === 0}
              aria-label="削除"
            >
              削除
            </button>
          )}
        </div>
      </header>
    );
  }

  return (
    <header className="media-browser-header">
      <div className="header-left">
        {currentPath && (
          <button
            className="back-button"
            onClick={onBack}
            aria-label="戻る"
          >
            ←
          </button>
        )}
        <div className="header-title">
          <h1>S3 Media Browser</h1>
          {currentFolder && (
            <span className="current-folder">{currentFolder}</span>
          )}
        </div>
      </div>
      <div className="header-right">
        {onEnterSelectionMode && (
          <button
            className="selection-mode-button"
            onClick={onEnterSelectionMode}
            aria-label="選択"
          >
            選択
          </button>
        )}
        {onOpenSettings && (
          <button
            className="settings-button"
            onClick={onOpenSettings}
            aria-label="設定"
          >
            設定
          </button>
        )}
        <button
          className="signout-button"
          onClick={onSignOut}
          aria-label="サインアウト"
        >
          サインアウト
        </button>
      </div>
    </header>
  );
}
