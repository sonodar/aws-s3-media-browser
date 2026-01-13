import { useCallback } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import {
  // Primitive atoms
  itemsToDeleteAtom,
  isDeletingAtom,
  // Derived atoms
  isDeleteConfirmOpenAtom,
  // Action atoms
  requestDeleteAtom,
  cancelDeleteAtom,
  startDeletingAtom,
  finishDeletingAtom,
} from "../../stores/atoms";
import type { StorageItem } from "../../types/storage";

export interface UseDeleteConfirmReturn {
  /** 削除対象アイテム */
  itemsToDelete: StorageItem[];
  /** 削除処理中 */
  isDeleting: boolean;
  /** ダイアログが開いているか */
  isOpen: boolean;
  /** 削除リクエスト（ダイアログを開く） */
  requestDelete: (items: StorageItem[]) => void;
  /** キャンセル（ダイアログを閉じる） */
  cancelDelete: () => void;
  /** 削除開始（isDeleting を true に） */
  startDeleting: () => void;
  /** 削除完了（状態をリセット） */
  finishDeleting: () => void;
}

/**
 * 削除確認ダイアログの状態を管理するファサード hook
 *
 * どのコンポーネントからでも削除リクエストを発行でき、
 * 状態は Jotai atoms でグローバルに共有される。
 *
 * Usage:
 * - ContextMenu, PreviewModal: requestDelete(items) で削除リクエスト
 * - MediaBrowser: itemsToDelete, isDeleting を監視し、削除処理を実行
 * - DeleteConfirmDialog: itemsToDelete, isDeleting を表示
 */
export function useDeleteConfirm(): UseDeleteConfirmReturn {
  // Primitive atoms
  const itemsToDelete = useAtomValue(itemsToDeleteAtom);
  const isDeleting = useAtomValue(isDeletingAtom);

  // Derived atoms
  const isOpen = useAtomValue(isDeleteConfirmOpenAtom);

  // Action atoms
  const requestDeleteAction = useSetAtom(requestDeleteAtom);
  const cancelDeleteAction = useSetAtom(cancelDeleteAtom);
  const startDeletingAction = useSetAtom(startDeletingAtom);
  const finishDeletingAction = useSetAtom(finishDeletingAtom);

  // Action callbacks
  const requestDelete = useCallback(
    (items: StorageItem[]) => {
      requestDeleteAction(items);
    },
    [requestDeleteAction],
  );

  const cancelDelete = useCallback(() => {
    cancelDeleteAction();
  }, [cancelDeleteAction]);

  const startDeleting = useCallback(() => {
    startDeletingAction();
  }, [startDeletingAction]);

  const finishDeleting = useCallback(() => {
    finishDeletingAction();
  }, [finishDeletingAction]);

  return {
    itemsToDelete,
    isDeleting,
    isOpen,
    requestDelete,
    cancelDelete,
    startDeleting,
    finishDeleting,
  };
}
