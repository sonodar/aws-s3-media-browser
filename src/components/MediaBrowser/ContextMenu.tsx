import { Menu } from "@mantine/core";
import { Pencil, Trash2, FolderInput } from "lucide-react";
import type { StorageItem } from "../../types/storage";

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
  /** 削除コールバック（async 対応） */
  onDelete: () => void | Promise<void>;
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
  if (!isOpen || !item) {
    return null;
  }

  const handleAction = async (action: () => void | Promise<void>) => {
    // メニューを先に閉じてからアクションを実行
    // async アクション（削除など）でも正しく動作するよう await する
    onClose();
    await action();
  };

  return (
    <Menu
      opened={isOpen}
      onClose={onClose}
      position="bottom-start"
      withinPortal
      shadow="md"
      closeOnItemClick={false}
    >
      <Menu.Target>
        {/* 仮想アンカー要素: クリック位置に配置 */}
        <div
          data-testid="context-menu-anchor"
          aria-label={`${item.name} のアクション`}
          style={{
            position: "fixed",
            left: position.x,
            top: position.y,
            width: 0,
            height: 0,
            pointerEvents: "none",
          }}
        />
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item
          leftSection={<Pencil size={16} aria-hidden="true" />}
          onClick={() => handleAction(onRename)}
        >
          名前を変更
        </Menu.Item>

        <Menu.Item
          leftSection={<FolderInput size={16} aria-hidden="true" />}
          onClick={() => handleAction(onMove)}
        >
          移動
        </Menu.Item>

        <Menu.Item
          leftSection={<Trash2 size={16} aria-hidden="true" />}
          color="red"
          onClick={() => handleAction(onDelete)}
        >
          削除
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
