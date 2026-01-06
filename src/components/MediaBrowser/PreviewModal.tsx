import { useState, useEffect, useRef } from "react";
import Lightbox, { type Slide } from "yet-another-react-lightbox";
import Video from "yet-another-react-lightbox/plugins/video";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import { Pencil, Trash2, FolderInput } from "lucide-react";
import "yet-another-react-lightbox/styles.css";
import type { StorageItem } from "../../types/storage";
import { isImageFile, isVideoFile } from "../../utils/fileTypes";
import "./PreviewModal.css";

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: StorageItem | null;
  getFileUrl: (key: string) => Promise<string>;
  onDelete?: (item: StorageItem) => void;
  onRename?: (item: StorageItem) => void;
  onMove?: (item: StorageItem) => void;
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PreviewModal({
  isOpen,
  onClose,
  item,
  getFileUrl,
  onDelete,
  onRename,
  onMove,
}: PreviewModalProps) {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!item || !isOpen) {
      setSlides([]);
      return;
    }

    const loadUrl = async () => {
      setLoading(true);
      try {
        const url = await getFileUrl(item.key);

        if (isImageFile(item.name)) {
          setSlides([{ src: url }]);
        } else if (isVideoFile(item.name)) {
          setSlides([
            {
              type: "video",
              width: 1280,
              height: 720,
              sources: [{ src: url, type: "video/mp4" }],
            },
          ]);
        }
      } catch (error: unknown) {
        console.error("Failed to load file URL:", error);
      } finally {
        setLoading(false);
      }
    };

    loadUrl();
  }, [item, isOpen, getFileUrl]);

  const handleDeleteClick = () => {
    dialogRef.current?.showModal();
  };

  const handleDeleteConfirm = () => {
    if (item && onDelete) {
      onDelete(item);
      dialogRef.current?.close();
      onClose();
    }
  };

  const handleDeleteCancel = () => {
    dialogRef.current?.close();
  };

  const handleRenameClick = () => {
    if (item && onRename) {
      onClose();
      onRename(item);
    }
  };

  const handleMoveClick = () => {
    if (item && onMove) {
      onClose();
      onMove(item);
    }
  };

  if (!isOpen || !item) return null;

  return (
    <>
      {loading && <div className="preview-loading">読み込み中...</div>}
      <Lightbox
        open={isOpen && slides.length > 0}
        close={onClose}
        slides={slides}
        plugins={[Video, Zoom]}
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
        render={{
          buttonPrev: () => null,
          buttonNext: () => null,
        }}
      />
      {isOpen && slides.length > 0 && (
        <div className="preview-caption">
          <div className="preview-caption-title">{item.name}</div>
          <div className="preview-caption-size">{formatFileSize(item.size)}</div>
        </div>
      )}
      <dialog ref={dialogRef} className="preview-delete-dialog">
        <p>「{item.name}」を削除しますか？</p>
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
