import { useState, useCallback, useRef } from "react";
import type { StorageItem } from "../../types/storage";

export interface UseMoveDialogReturn {
  /** ダイアログ表示状態 */
  isOpen: boolean;
  /** 移動対象アイテム */
  itemsToMove: StorageItem[];
  /** ダイアログの key（状態リセット用） */
  dialogKey: number;
  /** ダイアログを開く */
  openMoveDialog: (items: StorageItem[]) => void;
  /** ダイアログを閉じる */
  closeMoveDialog: () => void;
}

/**
 * 移動ダイアログの状態管理フック
 *
 * Architecture Note:
 * - dialogKey を使用してダイアログを開くたびにコンポーネントを再マウント
 * - これにより MoveDialog 内の useEffect を排除し、`key` 属性で状態リセット
 */
export function useMoveDialog(): UseMoveDialogReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [itemsToMove, setItemsToMove] = useState<StorageItem[]>([]);
  const dialogKeyRef = useRef(0);
  const [dialogKey, setDialogKey] = useState(0);

  const openMoveDialog = useCallback((items: StorageItem[]) => {
    // 新しい key を生成してダイアログを再マウント
    dialogKeyRef.current += 1;
    setDialogKey(dialogKeyRef.current);
    setItemsToMove(items);
    setIsOpen(true);
  }, []);

  const closeMoveDialog = useCallback(() => {
    setIsOpen(false);
    setItemsToMove([]);
  }, []);

  return {
    isOpen,
    itemsToMove,
    dialogKey,
    openMoveDialog,
    closeMoveDialog,
  };
}
