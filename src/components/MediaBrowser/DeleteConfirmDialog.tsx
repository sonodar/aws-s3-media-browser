import { Modal, Stack, Group, Button, Text } from "@mantine/core";
import type { StorageItem } from "../../types/storage";

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
    <Modal
      opened={items.length > 0}
      onClose={onClose}
      title="削除の確認"
      centered
      closeOnClickOutside={!isDeleting}
      closeOnEscape={!isDeleting}
      withCloseButton={!isDeleting}
    >
      <Stack gap="md">
        <Text>{getMessage()}</Text>
        {hasFolder && (
          <Text fw={700} c="dimmed">
            フォルダ内のすべてのファイルも削除されます。
          </Text>
        )}
        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={onClose} disabled={isDeleting} data-autofocus>
            キャンセル
          </Button>
          <Button color="red" onClick={handleDelete} loading={isDeleting}>
            削除
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
