import {
  ArrowLeft,
  X,
  Trash2,
  CopyCheck,
  Square,
  SquareCheck,
  SquareMinus,
  Settings,
  LogOut,
} from "lucide-react";
import { DropdownMenu, type DropdownMenuItem } from "./DropdownMenu";
import "./Header.css";

interface HeaderProps {
  currentPath: string;
  onBack: () => void;
  onSignOut: () => void;
  /** 選択モードが有効か */
  isSelectionMode?: boolean;
  /** 選択件数 */
  selectedCount?: number;
  /** 全アイテム件数（3状態チェックボックス用） */
  totalCount?: number;
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
  totalCount = 0,
  isAllSelected = false,
  onEnterSelectionMode,
  onExitSelectionMode,
  onToggleSelectAll,
  onDeleteSelected,
  onOpenSettings,
}: HeaderProps) {
  const pathParts = currentPath.split("/").filter(Boolean);
  const currentFolder = pathParts[pathParts.length - 1] || null;

  // 3状態チェックボックスの状態を判定
  const getSelectionState = (): "none" | "partial" | "all" => {
    if (selectedCount === 0) return "none";
    if (isAllSelected || (totalCount > 0 && selectedCount >= totalCount)) return "all";
    return "partial";
  };

  const selectionState = getSelectionState();

  const getSelectAllIcon = () => {
    switch (selectionState) {
      case "all":
        return <SquareCheck size={20} aria-hidden="true" />;
      case "partial":
        return <SquareMinus size={20} aria-hidden="true" />;
      default:
        return <Square size={20} aria-hidden="true" />;
    }
  };

  const getSelectAllLabel = () => {
    switch (selectionState) {
      case "all":
        return "全解除";
      case "partial":
        return "全選択";
      default:
        return "全選択";
    }
  };

  if (isSelectionMode) {
    return (
      <header className="media-browser-header media-browser-header--selection">
        <div className="header-left">
          <button
            className="cancel-button icon-button"
            onClick={onExitSelectionMode}
            aria-label="キャンセル"
          >
            <X size={20} aria-hidden="true" />
          </button>
          <span className="selection-count" aria-live="polite">
            {selectedCount}件選択中
          </span>
        </div>
        <div className="header-right">
          {onToggleSelectAll && (
            <button
              className="select-all-button icon-button"
              onClick={onToggleSelectAll}
              aria-label={getSelectAllLabel()}
            >
              {getSelectAllIcon()}
            </button>
          )}
          {onDeleteSelected && (
            <button
              className="delete-button icon-button"
              onClick={onDeleteSelected}
              disabled={selectedCount === 0}
              aria-label="削除"
            >
              <Trash2 size={20} aria-hidden="true" />
            </button>
          )}
        </div>
      </header>
    );
  }

  // ドロップダウンメニュー項目を構築
  const menuItems: DropdownMenuItem[] = [];
  if (onOpenSettings) {
    menuItems.push({
      label: "設定",
      icon: Settings,
      onClick: onOpenSettings,
    });
  }
  menuItems.push({
    label: "サインアウト",
    icon: LogOut,
    onClick: onSignOut,
    danger: true,
  });

  return (
    <header className="media-browser-header">
      <div className="header-left">
        {currentPath && (
          <button className="back-button icon-button" onClick={onBack} aria-label="戻る">
            <ArrowLeft size={20} aria-hidden="true" />
          </button>
        )}
        <h1 className="header-title">{currentFolder ?? "ホーム"}</h1>
      </div>
      <div className="header-right">
        {onEnterSelectionMode && (
          <button
            className="selection-mode-button icon-button"
            onClick={onEnterSelectionMode}
            aria-label="選択"
          >
            <CopyCheck size={20} aria-hidden="true" />
          </button>
        )}
        <DropdownMenu items={menuItems} triggerLabel="メニューを開く" />
      </div>
    </header>
  );
}
