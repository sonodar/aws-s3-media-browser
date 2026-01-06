import { useState, useCallback } from "react";
import type { StorageItem } from "../types/storage";

export interface UseMoveDialogReturn {
  /** ダイアログ表示状態 */
  isOpen: boolean;
  /** 移動対象アイテム */
  itemsToMove: StorageItem[];
  /** ダイアログを開く */
  openMoveDialog: (items: StorageItem[]) => void;
  /** ダイアログを閉じる */
  closeMoveDialog: () => void;
}

/**
 * 移動ダイアログの状態管理フック
 */
export function useMoveDialog(): UseMoveDialogReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [itemsToMove, setItemsToMove] = useState<StorageItem[]>([]);

  const openMoveDialog = useCallback((items: StorageItem[]) => {
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
    openMoveDialog,
    closeMoveDialog,
  };
}
