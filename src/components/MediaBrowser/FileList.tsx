import { useRef, useCallback } from "react";
import { Folder, Image, Film, File } from "lucide-react";
import { useLongPress } from "@mantine/hooks";
import type { StorageItem } from "../../types/storage";
import { getFileCategory } from "../../utils/fileTypes";
import { ThumbnailImage } from "./ThumbnailImage";
import "./FileList.css";

/** Delay in ms before fetching thumbnails for newly uploaded files */
const THUMBNAIL_FETCH_DELAY = 3000;

/** アクションメニュー表示用のデータ */
export interface ActionMenuData {
  item: StorageItem;
  position: { x: number; y: number };
}

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
  /** 長押し時のアクションメニュー表示コールバック */
  onShowActionMenu?: (data: ActionMenuData) => void;
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

/** イベントから座標を取得（TouchEvent と MouseEvent の両方に対応） */
function getEventPosition(
  event: React.MouseEvent | React.TouchEvent,
): { x: number; y: number } | null {
  if ("touches" in event && event.touches.length > 0) {
    return { x: event.touches[0].clientX, y: event.touches[0].clientY };
  }
  if ("clientX" in event) {
    return { x: event.clientX, y: event.clientY };
  }
  return null;
}

/** 個別アイテムのコンポーネント（長押しフック使用のため分離） */
function FileListItem({
  item,
  isSelected,
  isSelectionMode,
  recentlyUploadedKeys,
  onItemClick,
  onCheckboxClick,
  onShowActionMenu,
}: {
  item: StorageItem;
  isSelected: boolean;
  isSelectionMode: boolean;
  recentlyUploadedKeys: string[];
  onItemClick: (item: StorageItem) => void;
  onCheckboxClick: (e: React.MouseEvent, key: string) => void;
  onShowActionMenu?: (data: ActionMenuData) => void;
}) {
  const longPressPositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const suppressClickRef = useRef(false);
  const isRightClickRef = useRef(false);
  const itemRef = useRef(item);
  itemRef.current = item;

  // 選択モード時や onShowActionMenu がない場合は長押しを無効化
  const shouldEnableLongPress = !isSelectionMode && !!onShowActionMenu;

  const handleLongPressFinish = useCallback(
    (event: React.MouseEvent | React.TouchEvent) => {
      if (!onShowActionMenu) return;
      // 右クリックの場合はデフォルト動作を許可
      if (isRightClickRef.current) return;

      // 長押し完了後のクリックを抑制
      suppressClickRef.current = true;

      // イベントから座標を取得、取得できない場合は保存された位置を使用
      const position = getEventPosition(event) ?? longPressPositionRef.current;

      onShowActionMenu({
        item: itemRef.current,
        position,
      });
    },
    [onShowActionMenu],
  );

  const handleLongPressStart = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    // 右クリック（button === 2）を検出
    isRightClickRef.current = "button" in event && event.button === 2;
    const position = getEventPosition(event);
    if (position) {
      longPressPositionRef.current = position;
    }
    suppressClickRef.current = false;
  }, []);

  // Mantine useLongPress フック
  const longPressHandlers = useLongPress(handleLongPressFinish, {
    threshold: 400,
    onStart: handleLongPressStart,
  });

  const handleClick = useCallback(() => {
    // 長押し完了後はクリックを抑制
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    onItemClick(item);
  }, [item, onItemClick]);

  // 長押しが有効な場合のみハンドラを適用
  const eventHandlers = shouldEnableLongPress ? longPressHandlers : {};

  return (
    <li
      key={item.key}
      className={`file-list-item${isSelected ? " file-list-item--selected" : ""}`}
      data-type={item.type}
      onClick={handleClick}
      role="listitem"
      {...eventHandlers}
    >
      {isSelectionMode && (
        <input
          type="checkbox"
          className="file-list-checkbox"
          checked={isSelected}
          onChange={() => {}}
          onClick={(e) => onCheckboxClick(e, item.key)}
          aria-label={`${item.name} を選択`}
        />
      )}
      {shouldShowThumbnail(item) ? (
        <ThumbnailImage
          originalKey={item.key}
          fileName={item.name}
          fileType={getFileType(item)!}
          initialDelay={recentlyUploadedKeys.includes(item.key) ? THUMBNAIL_FETCH_DELAY : undefined}
        />
      ) : (
        <span className="file-icon">
          <FileIcon item={item} />
        </span>
      )}
      <span className="file-name">{item.name}</span>
    </li>
  );
}

export function FileList({
  items,
  onFolderClick,
  onFileClick,
  recentlyUploadedKeys = [],
  isSelectionMode = false,
  selectedKeys = new Set(),
  onToggleSelection,
  onShowActionMenu,
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
          <FileListItem
            key={item.key}
            item={item}
            isSelected={isSelected}
            isSelectionMode={isSelectionMode}
            recentlyUploadedKeys={recentlyUploadedKeys}
            onItemClick={handleItemClick}
            onCheckboxClick={handleCheckboxClick}
            onShowActionMenu={onShowActionMenu}
          />
        );
      })}
    </ul>
  );
}
