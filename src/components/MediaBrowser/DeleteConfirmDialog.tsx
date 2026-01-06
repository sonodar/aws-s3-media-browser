import { useEffect, useRef, useCallback } from "react";
import type { StorageItem } from "../../types/storage";
import "./CreateFolderDialog.css"; // Reuse dialog styles

interface DeleteConfirmDialogProps {
  /** 削除対象アイテム（複数対応） */
  items: StorageItem[];
  /** ダイアログを閉じる */
  onClose: () => void;
  /** 削除実行 */
  onConfirm: () => Promise<void>;
  /** 削除処理中 */
  isDeleting?: boolean;
}

export function DeleteConfirmDialog({
  items,
  onClose,
  onConfirm,
  isDeleting = false,
}: DeleteConfirmDialogProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // Focus cancel button on mount
  useEffect(() => {
    cancelButtonRef.current?.focus();
  }, []);

  // Handle Escape key
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape" && !isDeleting) {
        onClose();
      }
    },
    [isDeleting, onClose],
  );

  if (items.length === 0) return null;

  const hasFolder = items.some((item) => item.type === "folder");
  const isSingleItem = items.length === 1;

  const handleDelete = async () => {
    await onConfirm();
  };

  const getMessage = () => {
    if (isSingleItem) {
      return `「${items[0].name}」を削除しますか？`;
    }
    return `${items.length}件のアイテムを削除しますか？`;
  };

  return (
    <div className="dialog-overlay">
      <div className="dialog-backdrop" onClick={isDeleting ? undefined : onClose} />
      <div
        className="dialog-content"
        role="alertdialog"
        aria-labelledby="delete-dialog-title"
        onKeyDown={handleKeyDown}
      >
        <h2 id="delete-dialog-title">削除の確認</h2>
        <p>
          {getMessage()}
          {hasFolder && (
            <>
              <br />
              <strong>フォルダ内のすべてのファイルも削除されます。</strong>
            </>
          )}
        </p>
        <div className="dialog-actions">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="cancel-button"
            aria-label="キャンセル"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="submit-button"
            style={{ backgroundColor: "#d32f2f" }}
            aria-label={isDeleting ? "削除中..." : "削除"}
          >
            {isDeleting ? "削除中..." : "削除"}
          </button>
        </div>
      </div>
    </div>
  );
}
