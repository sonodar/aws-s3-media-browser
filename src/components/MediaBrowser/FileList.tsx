import { Folder, Image, Film, File } from "lucide-react";
import type { StorageItem } from "../../types/storage";
import { getFileCategory } from "../../utils/fileTypes";
import { ThumbnailImage } from "./ThumbnailImage";
import { FileActionMenu } from "./FileActionMenu";
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
  /** 削除コールバック */
  onDelete?: (item: StorageItem) => void;
}

function FileIcon({ item }: { item: StorageItem }) {
  const category = getFileCategory(item);
  switch (category) {
    case "folder":
      return <Folder aria-hidden="true" />;
    case "image":
      return <Image aria-hidden="true" />;
    case "video":
      return <Film aria-hidden="true" />;
    default:
      return <File aria-hidden="true" />;
  }
}

function getFileType(item: StorageItem): "image" | "video" | null {
  const category = getFileCategory(item);
  if (category === "image") return "image";
  if (category === "video") return "video";
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
  onDelete,
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
              <span className="file-icon">
                <FileIcon item={item} />
              </span>
            )}
            <span className="file-name">{item.name}</span>
            {!isSelectionMode && (onRename || onDelete) && (
              <FileActionMenu
                itemName={item.name}
                onRename={() => onRename?.(item)}
                onDelete={() => onDelete?.(item)}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}
