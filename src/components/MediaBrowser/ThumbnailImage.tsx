import { useState, useEffect } from "react";
import { getUrl } from "aws-amplify/storage";
import { getThumbnailPath } from "../../utils/pathUtils";
import "./ThumbnailImage.css";

export interface ThumbnailImageProps {
  /** Original file key (media/...) */
  originalKey: string;
  /** File name for alt text */
  fileName: string;
  /** File type for fallback icon */
  fileType: "image" | "video";
  /** Delay in ms before fetching thumbnail (for newly uploaded files) */
  initialDelay?: number;
}

type ThumbnailState = "loading" | "loaded" | "error";

const FALLBACK_ICONS = {
  image: "🖼️",
  video: "🎬",
} as const;

export function ThumbnailImage({
  originalKey,
  fileName,
  fileType,
  initialDelay,
}: ThumbnailImageProps) {
  const [state, setState] = useState<ThumbnailState>(initialDelay ? "error" : "loading");
  const [url, setUrl] = useState<string | null>(null);
  const [delayComplete, setDelayComplete] = useState(!initialDelay);

  // Handle initial delay
  useEffect(() => {
    if (!initialDelay) return;

    const timer = setTimeout(() => {
      setDelayComplete(true);
      setState("loading");
    }, initialDelay);

    return () => clearTimeout(timer);
  }, [initialDelay]);

  // Fetch thumbnail URL after delay (or immediately if no delay)
  useEffect(() => {
    if (!delayComplete) return;

    let isMounted = true;

    const fetchThumbnailUrl = async () => {
      try {
        const thumbnailPath = getThumbnailPath(originalKey);
        const result = await getUrl({ path: thumbnailPath });
        if (isMounted) {
          setUrl(result.url.toString());
        }
      } catch (err: unknown) {
        console.error("Failed to fetch thumbnail url:", err);
        if (isMounted) {
          setState("error");
        }
      }
    };

    fetchThumbnailUrl();

    return () => {
      isMounted = false;
    };
  }, [originalKey, delayComplete]);

  const handleLoad = () => {
    setState("loaded");
  };

  const handleError = () => {
    setState("error");
  };

  if (state === "error") {
    return (
      <div className="thumbnail-container thumbnail-fallback">
        <span>{FALLBACK_ICONS[fileType]}</span>
      </div>
    );
  }

  return (
    <div className="thumbnail-container">
      <img
        src={url ?? undefined}
        alt={fileName}
        loading="lazy"
        onLoad={handleLoad}
        onError={handleError}
        className={state === "loading" ? "thumbnail-loading" : "thumbnail-loaded"}
      />
    </div>
  );
}
