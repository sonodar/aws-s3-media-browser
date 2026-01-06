/**
 * Supported image file extensions
 */
export const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp"] as const;

/**
 * Supported video file extensions
 */
export const VIDEO_EXTENSIONS = ["mp4", "webm", "mov"] as const;

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
}

/**
 * Check if file is an image
 */
export function isImageFile(filename: string): boolean {
  const ext = getFileExtension(filename);
  return (IMAGE_EXTENSIONS as readonly string[]).includes(ext);
}

/**
 * Check if file is a video
 */
export function isVideoFile(filename: string): boolean {
  const ext = getFileExtension(filename);
  return (VIDEO_EXTENSIONS as readonly string[]).includes(ext);
}

/**
 * Check if file is previewable (image or video)
 */
export function isPreviewable(filename: string): boolean {
  return isImageFile(filename) || isVideoFile(filename);
}

/**
 * Get file type category
 */
export function getFileType(filename: string): "image" | "video" | "other" {
  if (isImageFile(filename)) return "image";
  if (isVideoFile(filename)) return "video";
  return "other";
}

/**
 * Check if content type is an image MIME type
 */
export function isImageContentType(contentType?: string): boolean {
  if (!contentType) return false;
  return contentType.startsWith("image/");
}

/**
 * Check if content type is a video MIME type
 */
export function isVideoContentType(contentType?: string): boolean {
  if (!contentType) return false;
  return contentType.startsWith("video/");
}

/**
 * StorageItem に基づいてファイルカテゴリを判定
 * contentType を優先し、未設定または判定不能な場合は拡張子にフォールバック
 */
export function getFileCategory(item: {
  name: string;
  type: "file" | "folder";
  contentType?: string;
}): "folder" | "image" | "video" | "file" {
  if (item.type === "folder") return "folder";

  // contentType を優先
  if (isImageContentType(item.contentType)) return "image";
  if (isVideoContentType(item.contentType)) return "video";

  // 拡張子にフォールバック
  if (isImageFile(item.name)) return "image";
  if (isVideoFile(item.name)) return "video";

  return "file";
}
