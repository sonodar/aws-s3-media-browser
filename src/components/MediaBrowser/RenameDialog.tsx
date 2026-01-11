import { useState, useCallback } from "react";
import { Stack, Group, Button, TextInput } from "@mantine/core";
import { validateRename } from "../../utils/validateRename";
import type { StorageItem } from "../../types/storage";
import type {
  RenameItemResult,
  RenameFolderResult,
  RenameProgress,
} from "../../hooks/useStorageOperations";
import "./CreateFolderDialog.css";

export interface RenameDialogProps {
  isOpen: boolean;
  item: StorageItem;
  existingItems: StorageItem[];
  onClose: () => void;
  onRenameFile: (currentKey: string, newName: string) => Promise<RenameItemResult>;
  onRenameFolder: (
    currentPrefix: string,
    newName: string,
    onProgress?: (progress: RenameProgress) => void,
  ) => Promise<RenameFolderResult>;
}

/**
 * フォルダリネーム失敗時の詳細情報
 */
interface FolderErrorDetails {
  succeeded?: number;
  failed?: number;
  failedFiles?: string[];
  duplicates?: string[];
}

/**
 * リネームダイアログ
 *
 * Architecture Note:
 * - 状態リセットは `key` 属性で行う（禁止用途 useEffect の排除）
 * - 親コンポーネント（MediaBrowser）でダイアログを開くたびに新しい key を設定し、
 *   コンポーネントを再マウントすることで内部状態を初期化する
 */
export function RenameDialog({
  isOpen,
  item,
  existingItems,
  onClose,
  onRenameFile,
  onRenameFolder,
}: RenameDialogProps) {
  // 初期値は item.name（コンポーネント再マウント時に設定される）
  const [newName, setNewName] = useState(item.name);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<RenameProgress | null>(null);
  const [folderErrorDetails, setFolderErrorDetails] = useState<FolderErrorDetails | null>(null);

  const handleSubmit = useCallback(async () => {
    // Validate using UI layer validation
    const validationResult = validateRename({
      newName,
      item,
      existingItems,
    });

    if (!validationResult.valid) {
      setError(validationResult.error || "バリデーションエラー");
      return;
    }

    const normalizedName = validationResult.normalizedName!;
    setIsProcessing(true);
    setError(null);
    setProgress(null);
    setFolderErrorDetails(null);

    try {
      if (item.type === "folder") {
        // Folder rename with progress callback
        const result = await onRenameFolder(item.key, normalizedName, (p) => {
          setProgress(p);
        });

        if (!result.success) {
          setError(result.error || "フォルダのリネームに失敗しました");
          // Store folder error details for display
          setFolderErrorDetails({
            succeeded: result.succeeded,
            failed: result.failed,
            failedFiles: result.failedFiles,
            duplicates: result.duplicates,
          });
          return;
        }
      } else {
        // File rename
        const result = await onRenameFile(item.key, normalizedName);

        if (!result.success) {
          setError(result.error || "ファイルのリネームに失敗しました");
          return;
        }
      }

      // Success - close dialog
      onClose();
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  }, [newName, item, existingItems, onRenameFile, onRenameFolder, onClose]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // IME 変換中は無視（変換確定の Enter でリネームが実行されるのを防ぐ）
      if (e.nativeEvent.isComposing) return;

      if (e.key === "Escape" && !isProcessing) {
        onClose();
      }
      // Enter キーでのリネーム実行を削除（モバイルファーストのため不要、IME との相性も悪い）
    },
    [isProcessing, onClose],
  );

  const handleClose = useCallback(() => {
    if (!isProcessing) {
      onClose();
    }
  }, [isProcessing, onClose]);

  if (!isOpen) return null;

  const dialogTitle = item.type === "folder" ? "フォルダ名を変更" : "ファイル名を変更";

  return (
    <div className="dialog-overlay">
      <div className="dialog-backdrop" onClick={handleClose} />
      <div
        className="dialog-content"
        role="dialog"
        aria-labelledby="rename-dialog-title"
        onKeyDown={handleKeyDown}
      >
        <Stack gap="md">
          <h2 id="rename-dialog-title" style={{ margin: 0 }}>
            {dialogTitle}
          </h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
          >
            <Stack gap="md">
              <TextInput
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={item.type === "folder" ? "フォルダ名" : "ファイル名"}
                autoFocus
                disabled={isProcessing}
                aria-label={item.type === "folder" ? "フォルダ名" : "ファイル名"}
              />
              {error && (
                <p className="error-message" style={{ margin: 0 }}>
                  {error}
                </p>
              )}
              {folderErrorDetails &&
                (folderErrorDetails.succeeded !== undefined ||
                  folderErrorDetails.failed !== undefined) && (
                  <div className="folder-error-details">
                    <p className="error-summary">
                      成功: {folderErrorDetails.succeeded ?? 0}件 / 失敗:{" "}
                      {folderErrorDetails.failed ?? 0}件
                    </p>
                    {folderErrorDetails.failedFiles &&
                      folderErrorDetails.failedFiles.length > 0 && (
                        <ul className="failed-files-list">
                          {folderErrorDetails.failedFiles.map((file) => (
                            <li key={file}>{file}</li>
                          ))}
                        </ul>
                      )}
                  </div>
                )}
              {folderErrorDetails?.duplicates && folderErrorDetails.duplicates.length > 0 && (
                <ul className="duplicate-files-list">
                  {folderErrorDetails.duplicates.map((file) => (
                    <li key={file}>{file}</li>
                  ))}
                </ul>
              )}
              {progress && (
                <p
                  className="progress-message"
                  style={{ margin: 0 }}
                >{`${progress.current} / ${progress.total} 件処理中...`}</p>
              )}
              <Group justify="flex-end" gap="sm">
                <Button variant="default" onClick={handleClose} disabled={isProcessing}>
                  キャンセル
                </Button>
                <Button type="submit" loading={isProcessing}>
                  変更
                </Button>
              </Group>
            </Stack>
          </form>
        </Stack>
      </div>
    </div>
  );
}
