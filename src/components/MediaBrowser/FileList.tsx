import type { StorageItem } from '../../hooks/useStorage';
import { isImageFile, isVideoFile } from '../../utils/fileTypes';
import './FileList.css';

interface FileListProps {
  items: StorageItem[];
  onFolderClick: (folderName: string) => void;
  onFileClick: (item: StorageItem) => void;
  onDelete: (item: StorageItem) => void;
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(item: StorageItem): string {
  if (item.type === 'folder') return '📁';
  if (isImageFile(item.name)) return '🖼️';
  if (isVideoFile(item.name)) return '🎬';
  return '📄';
}

export function FileList({ items, onFolderClick, onFileClick, onDelete }: FileListProps) {
  if (items.length === 0) {
    return (
      <div className="file-list-empty">
        <p>ファイルがありません</p>
      </div>
    );
  }

  const handleItemClick = (item: StorageItem) => {
    if (item.type === 'folder') {
      onFolderClick(item.name);
    } else {
      onFileClick(item);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, item: StorageItem) => {
    e.stopPropagation();
    onDelete(item);
  };

  return (
    <ul className="file-list" role="list">
      {items.map((item) => (
        <li
          key={item.key}
          className="file-list-item"
          data-type={item.type}
          onClick={() => handleItemClick(item)}
          role="listitem"
        >
          <span className="file-icon">{getFileIcon(item)}</span>
          <span className="file-name">{item.name}</span>
          {item.type === 'file' && (
            <span className="file-size">{formatFileSize(item.size)}</span>
          )}
          {item.type === 'folder' && (
            <span className="folder-arrow">›</span>
          )}
          <button
            className="delete-button"
            onClick={(e) => handleDeleteClick(e, item)}
            aria-label={`${item.name}を削除`}
          >
            🗑️
          </button>
        </li>
      ))}
    </ul>
  );
}
