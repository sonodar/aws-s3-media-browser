import { useState, useEffect, useRef } from "react";
import { EllipsisVertical, type LucideIcon } from "lucide-react";
import "./DropdownMenu.css";

export interface DropdownMenuItem {
  /** 項目のラベル */
  label: string;
  /** アイコンコンポーネント */
  icon: LucideIcon;
  /** クリック時のコールバック */
  onClick: () => void;
  /** 危険なアクション（削除など）かどうか */
  danger?: boolean;
}

export interface DropdownMenuProps {
  /** メニュー項目 */
  items: DropdownMenuItem[];
  /** トリガーアイコン (省略時は EllipsisVertical) */
  triggerIcon?: LucideIcon;
  /** メニュートリガーのaria-label */
  triggerLabel: string;
  /** メニュー位置（デフォルト: 'auto'）'auto'の場合は画面端を検出して自動決定 */
  position?: "bottom-left" | "bottom-right" | "auto";
}

export function DropdownMenu({
  items,
  triggerIcon: TriggerIcon = EllipsisVertical,
  triggerLabel,
  position = "auto",
}: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [computedPosition, setComputedPosition] = useState<"bottom-left" | "bottom-right">(
    "bottom-right",
  );
  const containerRef = useRef<HTMLDivElement>(null);

  // 外部クリックでメニューを閉じる
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Escape キーでメニューを閉じる
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  // メニュー位置を計算（autoの場合は画面端を検出）
  const calculatePosition = (): "bottom-left" | "bottom-right" => {
    if (position !== "auto") {
      return position;
    }

    if (!containerRef.current) {
      return "bottom-right";
    }

    const rect = containerRef.current.getBoundingClientRect();
    const menuWidth = 160; // min-width from CSS
    const viewportWidth = window.innerWidth;

    // 左端に近い場合（メニューを右に展開）
    if (rect.left < menuWidth) {
      return "bottom-left";
    }

    // 右端に近い場合（メニューを左に展開）
    if (viewportWidth - rect.right < menuWidth) {
      return "bottom-right";
    }

    // デフォルトは右寄せ
    return "bottom-right";
  };

  const handleToggle = () => {
    if (!isOpen) {
      // メニューを開く前に位置を計算
      setComputedPosition(calculatePosition());
    }
    setIsOpen((prev) => !prev);
  };

  const handleItemClick = (onClick: () => void) => {
    onClick();
    setIsOpen(false);
  };

  const handleItemKeyDown = (event: React.KeyboardEvent, onClick: () => void) => {
    if (event.key === "Enter") {
      handleItemClick(onClick);
    }
  };

  return (
    <div className="dropdown-menu-container" ref={containerRef}>
      <button
        className="dropdown-menu-trigger"
        onClick={handleToggle}
        aria-label={triggerLabel}
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <TriggerIcon size={20} aria-hidden="true" />
      </button>

      {isOpen && (
        <div className={`dropdown-menu dropdown-menu--${computedPosition}`} role="menu">
          {items.map((item) => {
            const ItemIcon = item.icon;
            return (
              <button
                key={item.label}
                className={`dropdown-menu-item${item.danger ? " dropdown-menu-item--danger" : ""}`}
                role="menuitem"
                onClick={() => handleItemClick(item.onClick)}
                onKeyDown={(e) => handleItemKeyDown(e, item.onClick)}
              >
                <ItemIcon size={16} aria-hidden="true" />
                <span className="dropdown-menu-item-label">{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
