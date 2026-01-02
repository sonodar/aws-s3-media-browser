import { useState, useEffect } from 'react';
import Lightbox, { type Slide } from 'yet-another-react-lightbox';
import Video from 'yet-another-react-lightbox/plugins/video';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import 'yet-another-react-lightbox/styles.css';
import type { StorageItem } from '../../hooks/useStorage';
import { isImageFile, isVideoFile } from '../../utils/fileTypes';

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: StorageItem | null;
  getFileUrl: (key: string) => Promise<string>;
}

export function PreviewModal({ isOpen, onClose, item, getFileUrl }: PreviewModalProps) {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(false);

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
          // type を指定しない（ブラウザに自動判定させる）
          // video/quicktime を明示すると Chrome 等でサポート外と判定されスキップされる
          setSlides([{
            type: 'video',
            width: 1280,
            height: 720,
            sources: [{ src: url }],
          } as Slide]);
        }
      } catch (error) {
        console.error('Failed to load file URL:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUrl();
  }, [item, isOpen, getFileUrl]);

  if (!isOpen || !item) return null;

  return (
    <>
      {loading && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          zIndex: 1000,
          color: 'white',
        }}>
          読み込み中...
        </div>
      )}
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
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
          },
        }}
      />
    </>
  );
}

