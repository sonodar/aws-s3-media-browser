import { useState } from "react";
import "./CreateFolderDialog.css";

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

  if (!isOpen) return null;

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
    setFolderName("");
    setError(null);
    onClose();
  };

  return (
    <div className="dialog-overlay">
      <div className="dialog-backdrop" onClick={handleClose} />
      <div className="dialog-content" role="dialog" aria-labelledby="dialog-title">
        <h2 id="dialog-title">新しいフォルダを作成</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="フォルダ名"
            autoFocus
            disabled={isCreating}
            aria-label="フォルダ名"
          />
          {error && <p className="error-message">{error}</p>}
          <div className="dialog-actions">
            <button
              type="button"
              onClick={handleClose}
              disabled={isCreating}
              className="cancel-button"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isCreating || !folderName.trim()}
              className="submit-button"
            >
              {isCreating ? "作成中..." : "作成"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
