/**
 * サムネイル画像表示コンポーネント
 *
 * useThumbnailUrl フックを使用してサムネイル URL を取得し、
 * ローディング中はスケルトン、エラー時はフォールバックアイコンを表示する。
 */
import { Image as MantineImage, Skeleton, Center, Box } from "@mantine/core";
import { Image as ImageIcon, Film } from "lucide-react";
import { useThumbnailUrl } from "../../hooks/storage";
import "./Thumbnail.css";

export interface ThumbnailProps {
  /** Original file key (media/...) */
  originalKey: string;
  /** File name for alt text */
  fileName: string;
  /** File type for fallback icon */
  fileType: "image" | "video";
  /** Retry count (default: 4) - テスト時に false を指定可能 */
  retry?: number | false;
}

function FallbackIcon({ fileType }: { fileType: "image" | "video" }) {
  const Icon = fileType === "video" ? Film : ImageIcon;
  return <Icon aria-hidden="true" />;
}

/**
 * サムネイル画像を表示するコンポーネント
 *
 * TanStack Query の useQuery によるリトライ機構を持つ useThumbnailUrl フックを使用し、
 * Lambda によるサムネイル生成完了を待機する。
 */
export function Thumbnail({ originalKey, fileName, fileType, retry }: ThumbnailProps) {
  const { url, isLoading, isError } = useThumbnailUrl(originalKey, { retry });

  if (isError) {
    return (
      <Box className="thumbnail-container thumbnail-fallback">
        <Center h="100%">
          <FallbackIcon fileType={fileType} />
        </Center>
      </Box>
    );
  }

  const showSkeleton = isLoading || !url;

  return (
    <Box className="thumbnail-container">
      <Skeleton visible={showSkeleton} radius={8} h="100%" w="100%">
        {url && (
          <MantineImage src={url} alt={fileName} loading="lazy" fit="cover" h="100%" w="100%" />
        )}
      </Skeleton>
    </Box>
  );
}
