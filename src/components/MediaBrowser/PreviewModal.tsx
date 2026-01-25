import Lightbox from "yet-another-react-lightbox";
import Video from "yet-another-react-lightbox/plugins/video";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import { Pencil, Trash2, FolderInput } from "lucide-react";
import "yet-another-react-lightbox/styles.css";
import type { StorageItem } from "../../types/storage";
import { useDeleteConfirm } from "../../hooks/ui";
import { usePreviewUrls } from "../../hooks/storage";
import "./PreviewModal.css";

/** Props for single-item mode (legacy) */
interface SingleItemProps {
  isOpen: boolean;
  onClose: () => void;
  item: StorageItem | null;
  items?: never;
  currentIndex?: never;
  onIndexChange?: never;
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
  const { isOpen, onClose, onRename, onMove } = props;
  const { requestDelete } = useDeleteConfirm();

  // Determine mode and derive current item
  const isMulti = isMultiSlideMode(props);
  const items = isMulti ? props.items : props.item ? [props.item] : [];
  const currentIndex = isMulti ? props.currentIndex : 0;
  const onIndexChange = isMulti ? props.onIndexChange : undefined;
  const currentItem = items[currentIndex] ?? null;

  // usePreviewUrls フックで署名付き URL を取得
  // Lightbox 表示時のみ署名付き URL を取得（現スライドの前後1枚を先読み）
  const { data: slides, isLoading: loading } = usePreviewUrls(items, {
    enabled: isOpen,
    currentIndex,
    preload: 1,
  });

  // 削除ボタンクリック時: Jotai atoms を通じて DeleteConfirmDialog を表示させる
  const handleDeleteClick = () => {
    if (currentItem) {
      onClose();
      requestDelete([currentItem]);
    }
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
          // 動画は開いた瞬間に読み込ませない（必要になったタイミングで取得）
          preload: "none",
        }}
        zoom={{
          maxZoomPixelRatio: 3,
          scrollToZoom: true,
        }}
        carousel={{
          finite: true,
          // Lightbox 内のスライド先読み枚数（hooks と合わせる）
          preload: 1,
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
            <button
              key="delete"
              type="button"
              className="yarl__button preview-delete-button"
              onClick={handleDeleteClick}
              aria-label="削除"
            >
              <Trash2 size={20} aria-hidden="true" />
            </button>,
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
    </>
  );
}
