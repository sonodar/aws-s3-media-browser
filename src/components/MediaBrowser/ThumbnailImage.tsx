import { useState, useEffect } from "react";
import { getUrl } from "aws-amplify/storage";
import { Image as MantineImage, Skeleton, Center, Box } from "@mantine/core";
import { useTimeout } from "@mantine/hooks";
import { Image as ImageIcon, Film } from "lucide-react";
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

function FallbackIcon({ fileType }: { fileType: "image" | "video" }) {
  if (fileType === "video") {
    return <Film aria-hidden="true" />;
  }
  return <ImageIcon aria-hidden="true" />;
}

export function ThumbnailImage({
  originalKey,
  fileName,
  fileType,
  initialDelay,
}: ThumbnailImageProps) {
  const [state, setState] = useState<ThumbnailState>(initialDelay ? "error" : "loading");
  const [url, setUrl] = useState<string | null>(null);
  const [delayComplete, setDelayComplete] = useState(!initialDelay);

  // Handle initial delay using Mantine useTimeout hook
  const { start: startDelay } = useTimeout(() => {
    setDelayComplete(true);
    setState("loading");
  }, initialDelay ?? 0);

  // Start delay timer when initialDelay is set
  useEffect(() => {
    if (initialDelay) {
      startDelay();
    }
  }, [initialDelay, startDelay]);

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
      <Box className="thumbnail-container thumbnail-fallback">
        <Center h="100%">
          <FallbackIcon fileType={fileType} />
        </Center>
      </Box>
    );
  }

  return (
    <Box className="thumbnail-container">
      <Skeleton visible={state === "loading"} radius={8} h="100%" w="100%">
        <MantineImage
          src={url ?? undefined}
          alt={fileName}
          loading="lazy"
          onLoad={handleLoad}
          onError={handleError}
          fit="cover"
          h="100%"
          w="100%"
        />
      </Skeleton>
    </Box>
  );
}
