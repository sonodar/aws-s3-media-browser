import { useState } from 'react';
import type { StorageItem } from '../../hooks/useStorage';
import './CreateFolderDialog.css'; // Reuse dialog styles

interface DeleteConfirmDialogProps {
  item: StorageItem | null;
  onClose: () => void;
  onConfirm: (key: string) => Promise<void>;
}

export function DeleteConfirmDialog({ item, onClose, onConfirm }: DeleteConfirmDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!item) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onConfirm(item.key);
      onClose();
    } catch {
      // Error handling is done in parent
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="dialog-overlay">
      <div className="dialog-backdrop" onClick={onClose} />
      <div className="dialog-content" role="alertdialog" aria-labelledby="delete-dialog-title">
        <h2 id="delete-dialog-title">削除の確認</h2>
        <p>
          「{item.name}」を削除しますか？
          {item.type === 'folder' && <><br /><strong>フォルダ内のすべてのファイルも削除されます。</strong></>}
        </p>
        <div className="dialog-actions">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="cancel-button"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="submit-button"
            style={{ backgroundColor: '#d32f2f' }}
          >
            {isDeleting ? '削除中...' : '削除'}
          </button>
        </div>
      </div>
    </div>
  );
}
