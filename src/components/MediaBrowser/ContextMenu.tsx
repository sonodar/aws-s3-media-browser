import { useEffect, useRef, useCallback } from "react";
import { Pencil, Trash2, FolderInput } from "lucide-react";
import type { StorageItem } from "../../types/storage";
import "./ContextMenu.css";

export interface ContextMenuProps {
  /** メニューが開いているかどうか */
  isOpen: boolean;
  /** 対象アイテム */
  item: StorageItem | null;
  /** 表示位置 */
  position: { x: number; y: number };
  /** 閉じるコールバック */
  onClose: () => void;
  /** リネームコールバック */
  onRename: () => void;
  /** 移動コールバック */
  onMove: () => void;
  /** 削除コールバック */
  onDelete: () => void;
}

export function ContextMenu({
  isOpen,
  item,
  position,
  onClose,
  onRename,
  onMove,
  onDelete,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // 外部クリックでメニューを閉じる
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  // Escape キーでメニューを閉じる
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // 画面端でのオーバーフロー調整
  const adjustedPosition = useCallback(() => {
    if (!menuRef.current) {
      return position;
    }

    const menuWidth = 160; // min-width from CSS
    const menuHeight = 150; // approximate height
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 8;

    let x = position.x;
    let y = position.y;

    // 右端を超える場合
    if (x + menuWidth > viewportWidth - margin) {
      x = viewportWidth - menuWidth - margin;
    }

    // 下端を超える場合
    if (y + menuHeight > viewportHeight - margin) {
      y = viewportHeight - menuHeight - margin;
    }

    // 左端を超える場合
    if (x < margin) {
      x = margin;
    }

    // 上端を超える場合
    if (y < margin) {
      y = margin;
    }

    return { x, y };
  }, [position]);

  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  if (!isOpen || !item) {
    return null;
  }

  const adjustedPos = adjustedPosition();

  return (
    <div
      ref={menuRef}
      className="context-menu"
      role="menu"
      aria-label={`${item.name} のアクション`}
      style={{
        left: `${adjustedPos.x}px`,
        top: `${adjustedPos.y}px`,
      }}
    >
      <button className="context-menu-item" role="menuitem" onClick={() => handleAction(onRename)}>
        <Pencil size={16} aria-hidden="true" />
        <span className="context-menu-item-label">名前を変更</span>
      </button>

      <button className="context-menu-item" role="menuitem" onClick={() => handleAction(onMove)}>
        <FolderInput size={16} aria-hidden="true" />
        <span className="context-menu-item-label">移動</span>
      </button>

      <button
        className="context-menu-item context-menu-item--danger"
        role="menuitem"
        onClick={() => handleAction(onDelete)}
      >
        <Trash2 size={16} aria-hidden="true" />
        <span className="context-menu-item-label">削除</span>
      </button>
    </div>
  );
}
