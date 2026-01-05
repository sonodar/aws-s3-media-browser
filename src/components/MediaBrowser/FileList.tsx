import type { StorageItem } from '../../types/storage';
import { isImageFile, isVideoFile } from '../../utils/fileTypes';
import { ThumbnailImage } from './ThumbnailImage';
import './FileList.css';

/** Delay in ms before fetching thumbnails for newly uploaded files */
const THUMBNAIL_FETCH_DELAY = 3000;

interface FileListProps {
  items: StorageItem[];
  onFolderClick: (folderName: string) => void;
  onFileClick: (item: StorageItem) => void;
  /** Keys of recently uploaded files (for delayed thumbnail fetch) */
  recentlyUploadedKeys?: string[];
}


function getFileIcon(item: StorageItem): string {
  if (item.type === 'folder') return '📁';
  if (isImageFile(item.name)) return '🖼️';
  if (isVideoFile(item.name)) return '🎬';
  return '📄';
}

function getFileType(item: StorageItem): 'image' | 'video' | null {
  if (isImageFile(item.name)) return 'image';
  if (isVideoFile(item.name)) return 'video';
  return null;
}

function shouldShowThumbnail(item: StorageItem): boolean {
  return item.type === 'file' && getFileType(item) !== null;
}

export function FileList({ items, onFolderClick, onFileClick, recentlyUploadedKeys = [] }: FileListProps) {
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
          {shouldShowThumbnail(item) ? (
            <ThumbnailImage
              originalKey={item.key}
              fileName={item.name}
              fileType={getFileType(item)!}
              initialDelay={recentlyUploadedKeys.includes(item.key) ? THUMBNAIL_FETCH_DELAY : undefined}
            />
          ) : (
            <span className="file-icon">{getFileIcon(item)}</span>
          )}
          <span className="file-name">{item.name}</span>
        </li>
      ))}
    </ul>
  );
}
