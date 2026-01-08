import { useState, useEffect, useRef } from "react";
import Lightbox, { type Slide } from "yet-another-react-lightbox";
import Video from "yet-another-react-lightbox/plugins/video";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import { Pencil, Trash2, FolderInput } from "lucide-react";
import "yet-another-react-lightbox/styles.css";
import type { StorageItem } from "../../types/storage";
import { isImageFile, isVideoFile } from "../../utils/fileTypes";
import "./PreviewModal.css";

/** Props for single-item mode (legacy) */
interface SingleItemProps {
  isOpen: boolean;
  onClose: () => void;
  item: StorageItem | null;
  items?: never;
  currentIndex?: never;
  onIndexChange?: never;
  getFileUrl: (key: string) => Promise<string>;
  onDelete?: (item: StorageItem) => void;
  onRename?: (item: StorageItem) => void;
  onMove?: (item: StorageItem) => void;
}

/** Props for multi-slide mode */
interface MultiSlideProps {
  isOpen: boolean;
  onClose: () => void;
  item?: never;
  items: StorageItem[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  getFileUrl: (key: string) => Promise<string>;
  onDelete?: (item: StorageItem) => void;
  onRename?: (item: StorageItem) => void;
  onMove?: (item: StorageItem) => void;
}

type PreviewModalProps = SingleItemProps | MultiSlideProps;

function formatFileSize(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Helper to determine if props are multi-slide mode */
function isMultiSlideMode(props: PreviewModalProps): props is MultiSlideProps {
  return "items" in props && Array.isArray(props.items);
}

export function PreviewModal(props: PreviewModalProps) {
  const { isOpen, onClose, getFileUrl, onDelete, onRename, onMove } = props;

  // Determine mode and derive current item
  const isMulti = isMultiSlideMode(props);
  const items = isMulti ? props.items : props.item ? [props.item] : [];
  const currentIndex = isMulti ? props.currentIndex : 0;
  const onIndexChange = isMulti ? props.onIndexChange : undefined;
  const currentItem = items[currentIndex] ?? null;

  const [slides, setSlides] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (items.length === 0 || !isOpen) {
      setSlides([]);
      return;
    }

    const loadUrls = async () => {
      setLoading(true);
      try {
        const slidePromises = items.map(async (storageItem) => {
          const url = await getFileUrl(storageItem.key);

          if (isImageFile(storageItem.name)) {
            return { src: url } as Slide;
          } else if (isVideoFile(storageItem.name)) {
            return {
              type: "video" as const,
              width: 1280,
              height: 720,
              sources: [{ src: url, type: "video/mp4" }],
            } as Slide;
          }
          return null;
        });

        const loadedSlides = (await Promise.all(slidePromises)).filter(
          (slide): slide is Slide => slide !== null,
        );
        setSlides(loadedSlides);
      } catch (error: unknown) {
        console.error("Failed to load file URLs:", error);
      } finally {
        setLoading(false);
      }
    };

    loadUrls();
  }, [items, isOpen, getFileUrl]);

  const handleDeleteClick = () => {
    dialogRef.current?.showModal();
  };

  const handleDeleteConfirm = () => {
    if (currentItem && onDelete) {
      onDelete(currentItem);
      dialogRef.current?.close();
      onClose();
    }
  };

  const handleDeleteCancel = () => {
    dialogRef.current?.close();
  };

  const handleRenameClick = () => {
    if (currentItem && onRename) {
      onClose();
      onRename(currentItem);
    }
  };

  const handleMoveClick = () => {
    if (currentItem && onMove) {
      onClose();
      onMove(currentItem);
    }
  };

  const handleViewChange = ({ index }: { index: number }) => {
    onIndexChange?.(index);
  };

  if (!isOpen || !currentItem) return null;

  return (
    <>
      {loading && <div className="preview-loading">読み込み中...</div>}
      <Lightbox
        open={isOpen && slides.length > 0}
        close={onClose}
        slides={slides}
        index={currentIndex}
        plugins={[Video, Zoom]}
        on={{
          view: handleViewChange,
        }}
        controller={{
          closeOnPullDown: true,
        }}
        video={{
          autoPlay: true,
          controls: true,
          playsInline: true,
        }}
        zoom={{
          maxZoomPixelRatio: 3,
          scrollToZoom: true,
        }}
        carousel={{
          finite: true,
        }}
        styles={{
          container: {
            backgroundColor: "rgba(0, 0, 0, 0.95)",
          },
        }}
        toolbar={{
          buttons: [
            onRename && (
              <button
                key="rename"
                type="button"
                className="yarl__button preview-rename-button"
                onClick={handleRenameClick}
                aria-label="リネーム"
              >
                <Pencil size={20} aria-hidden="true" />
              </button>
            ),
            onMove && (
              <button
                key="move"
                type="button"
                className="yarl__button preview-move-button"
                onClick={handleMoveClick}
                aria-label="移動"
              >
                <FolderInput size={20} aria-hidden="true" />
              </button>
            ),
            onDelete && (
              <button
                key="delete"
                type="button"
                className="yarl__button preview-delete-button"
                onClick={handleDeleteClick}
                aria-label="削除"
              >
                <Trash2 size={20} aria-hidden="true" />
              </button>
            ),
            "close",
          ].filter(Boolean),
        }}
      />
      {isOpen && slides.length > 0 && currentItem && (
        <div className="preview-caption">
          <div className="preview-caption-title">{currentItem.name}</div>
          <div className="preview-caption-size">{formatFileSize(currentItem.size)}</div>
        </div>
      )}
      <dialog ref={dialogRef} className="preview-delete-dialog">
        <p>「{currentItem?.name}」を削除しますか？</p>
        <div className="preview-delete-dialog-actions">
          <button className="preview-delete-dialog-cancel" onClick={handleDeleteCancel}>
            キャンセル
          </button>
          <button className="preview-delete-dialog-delete" onClick={handleDeleteConfirm}>
            削除
          </button>
        </div>
      </dialog>
    </>
  );
}
