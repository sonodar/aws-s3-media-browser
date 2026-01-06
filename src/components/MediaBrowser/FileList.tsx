import type { StorageItem } from "../../types/storage";
import { isImageFile, isVideoFile } from "../../utils/fileTypes";
import { ThumbnailImage } from "./ThumbnailImage";
import "./FileList.css";

/** Delay in ms before fetching thumbnails for newly uploaded files */
const THUMBNAIL_FETCH_DELAY = 3000;

interface FileListProps {
  items: StorageItem[];
  onFolderClick: (folderName: string) => void;
  onFileClick: (item: StorageItem) => void;
  /** Keys of recently uploaded files (for delayed thumbnail fetch) */
  recentlyUploadedKeys?: string[];
  /** 選択モードが有効か */
  isSelectionMode?: boolean;
  /** 選択中のキー */
  selectedKeys?: ReadonlySet<string>;
  /** 選択トグル */
  onToggleSelection?: (key: string) => void;
  /** リネームコールバック */
  onRename?: (item: StorageItem) => void;
}

function getFileIcon(item: StorageItem): string {
  if (item.type === "folder") return "📁";
  if (isImageFile(item.name)) return "🖼️";
  if (isVideoFile(item.name)) return "🎬";
  return "📄";
}

function getFileType(item: StorageItem): "image" | "video" | null {
  if (isImageFile(item.name)) return "image";
  if (isVideoFile(item.name)) return "video";
  return null;
}

function shouldShowThumbnail(item: StorageItem): boolean {
  return item.type === "file" && getFileType(item) !== null;
}

export function FileList({
  items,
  onFolderClick,
  onFileClick,
  recentlyUploadedKeys = [],
  isSelectionMode = false,
  selectedKeys = new Set(),
  onToggleSelection,
  onRename,
}: FileListProps) {
  if (items.length === 0) {
    return (
      <div className="file-list-empty">
        <p>ファイルがありません</p>
      </div>
    );
  }

  const handleItemClick = (item: StorageItem) => {
    if (isSelectionMode && onToggleSelection) {
      onToggleSelection(item.key);
    } else if (item.type === "folder") {
      onFolderClick(item.name);
    } else {
      onFileClick(item);
    }
  };

  const handleCheckboxClick = (e: React.MouseEvent, key: string) => {
    e.stopPropagation();
    onToggleSelection?.(key);
  };

  const handleRenameClick = (e: React.MouseEvent, item: StorageItem) => {
    e.stopPropagation();
    onRename?.(item);
  };

  return (
    <ul className="file-list" role="list">
      {items.map((item) => {
        const isSelected = selectedKeys.has(item.key);
        return (
          <li
            key={item.key}
            className={`file-list-item${isSelected ? " file-list-item--selected" : ""}`}
            data-type={item.type}
            onClick={() => handleItemClick(item)}
            role="listitem"
          >
            {isSelectionMode && (
              <input
                type="checkbox"
                className="file-list-checkbox"
                checked={isSelected}
                onChange={() => {}}
                onClick={(e) => handleCheckboxClick(e, item.key)}
                aria-label={`${item.name} を選択`}
              />
            )}
            {shouldShowThumbnail(item) ? (
              <ThumbnailImage
                originalKey={item.key}
                fileName={item.name}
                fileType={getFileType(item)!}
                initialDelay={
                  recentlyUploadedKeys.includes(item.key) ? THUMBNAIL_FETCH_DELAY : undefined
                }
              />
            ) : (
              <span className="file-icon">{getFileIcon(item)}</span>
            )}
            <span className="file-name">{item.name}</span>
            {!isSelectionMode && onRename && (
              <button
                className="rename-button"
                onClick={(e) => handleRenameClick(e, item)}
                aria-label={`${item.name} の名前を変更`}
                title="名前を変更"
              >
                ✏️
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
