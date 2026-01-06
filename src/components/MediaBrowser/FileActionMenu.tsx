import { Ellipsis, Pencil, Trash2 } from "lucide-react";
import { DropdownMenu, type DropdownMenuItem } from "./DropdownMenu";
import "./FileActionMenu.css";

export interface FileActionMenuProps {
  /** 対象アイテム名（aria-label用） */
  itemName: string;
  /** リネームコールバック */
  onRename: () => void;
  /** 削除コールバック */
  onDelete: () => void;
}

export function FileActionMenu({ itemName, onRename, onDelete }: FileActionMenuProps) {
  const handleContainerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const menuItems: DropdownMenuItem[] = [
    {
      label: "名前を変更",
      icon: Pencil,
      onClick: onRename,
    },
    {
      label: "削除",
      icon: Trash2,
      onClick: onDelete,
      danger: true,
    },
  ];

  return (
    <div className="file-action-menu" onClick={handleContainerClick}>
      <DropdownMenu
        items={menuItems}
        triggerIcon={Ellipsis}
        triggerLabel={`${itemName} のアクション`}
        position="bottom-right"
      />
    </div>
  );
}
