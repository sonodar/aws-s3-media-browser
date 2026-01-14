import { useState } from "react";
import { Modal, Stack, Group, Button, TextInput } from "@mantine/core";
import { validateItemName, type ValidationResult } from "../../utils/validateItemName";
import type { StorageItem } from "../../types/storage";
import { ErrorMessage } from "./ErrorMessage";

interface CreateFolderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /**
   * フォルダ作成コールバック
   * 成功時はダイアログを閉じるので、呼び出し元で必要な後処理を行った後に
   * Promise を resolve すること
   */
  onCreate: (name: string) => Promise<void>;
  /** 現在のディレクトリ内の既存アイテム */
  existingItems: StorageItem[];
}

/**
 * 新規フォルダ名のバリデーションを行う
 *
 * バリデーションルール（優先度順）:
 * 1. 基本バリデーション（空文字、スラッシュ、長さ）
 * 2. フォルダ重複チェック（フォルダタイプのみを対象）
 */
function validateNewFolderName(name: string, existingItems: StorageItem[]): ValidationResult {
  // 1. 基本バリデーション
  const baseResult = validateItemName(name);
  if (!baseResult.valid) {
    return baseResult;
  }

  const normalizedName = baseResult.normalizedName!;

  // 2. フォルダ重複チェック（フォルダタイプのみを対象）
  const isDuplicate = existingItems.some(
    (existing) => existing.type === "folder" && existing.name === normalizedName,
  );

  if (isDuplicate) {
    return { valid: false, error: "同じ名前のフォルダが既に存在します" };
  }

  return { valid: true, normalizedName };
}

export function CreateFolderDialog({
  isOpen,
  onClose,
  onCreate,
  existingItems,
}: CreateFolderDialogProps) {
  const [folderName, setFolderName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationResult = validateNewFolderName(folderName, existingItems);
    if (!validationResult.valid) {
      setError(validationResult.error || "バリデーションエラー");
      return;
    }

    const normalizedName = validationResult.normalizedName!;
    setIsCreating(true);
    setError(null);

    try {
      await onCreate(normalizedName);
      setFolderName("");
      onClose();
    } catch (err: unknown) {
      console.error("Failed to create folder:", err);
      setError("フォルダの作成に失敗しました");
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    if (isCreating) return;
    setFolderName("");
    setError(null);
    onClose();
  };

  return (
    <Modal
      opened={isOpen}
      onClose={handleClose}
      title="新しいフォルダを作成"
      centered
      closeOnClickOutside={!isCreating}
      closeOnEscape={!isCreating}
      withCloseButton={!isCreating}
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <TextInput
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="フォルダ名"
            data-autofocus
            disabled={isCreating}
            aria-label="フォルダ名"
          />
          {error && <ErrorMessage message={error} />}
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={handleClose} disabled={isCreating}>
              キャンセル
            </Button>
            <Button type="submit" loading={isCreating} disabled={!folderName.trim()}>
              作成
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
