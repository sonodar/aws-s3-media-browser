import { useState } from "react";
import { Modal, Stack, Group, Button, TextInput } from "@mantine/core";

interface CreateFolderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /**
   * フォルダ作成コールバック
   * 成功時はダイアログを閉じるので、呼び出し元で必要な後処理を行った後に
   * Promise を resolve すること
   */
  onCreate: (name: string) => Promise<void>;
}

export function CreateFolderDialog({ isOpen, onClose, onCreate }: CreateFolderDialogProps) {
  const [folderName, setFolderName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFolderName = (name: string): string | null => {
    if (!name.trim()) {
      return "フォルダ名を入力してください";
    }
    if (name.includes("/") || name.includes("\\")) {
      return "フォルダ名にスラッシュは使用できません";
    }
    if (name.length > 100) {
      return "フォルダ名は100文字以内にしてください";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateFolderName(folderName);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      await onCreate(folderName.trim());
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
            error={error}
          />
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
