import { useEffect, useRef, useCallback } from "react";
import { Stack, Group, Button } from "@mantine/core";
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
        <Stack gap="md">
          <h2 id="delete-dialog-title" style={{ margin: 0 }}>
            削除の確認
          </h2>
          <p style={{ margin: 0 }}>
            {getMessage()}
            {hasFolder && (
              <>
                <br />
                <strong>フォルダ内のすべてのファイルも削除されます。</strong>
              </>
            )}
          </p>
          <Group justify="flex-end" gap="sm">
            <Button ref={cancelButtonRef} variant="default" onClick={onClose} disabled={isDeleting}>
              キャンセル
            </Button>
            <Button color="red" onClick={handleDelete} loading={isDeleting}>
              削除
            </Button>
          </Group>
        </Stack>
      </div>
    </div>
  );
}
