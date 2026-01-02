/**
 * Supported image file extensions
 */
export const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'] as const;

/**
 * Supported video file extensions
 */
export const VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov'] as const;

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
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
export function getFileType(filename: string): 'image' | 'video' | 'other' {
  if (isImageFile(filename)) return 'image';
  if (isVideoFile(filename)) return 'video';
  return 'other';
}
