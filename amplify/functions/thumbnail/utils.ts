/**
 * Supported image file extensions
 */
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'] as const;

/**
 * Supported video file extensions
 */
const VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov'] as const;

/**
 * Thumbnail file suffix
 */
const THUMBNAIL_SUFFIX = '.thumb.jpg';

/**
 * Get file extension from filename (lowercase)
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
 * Check if file is a thumbnail target (image or video)
 */
export function isThumbnailTarget(filename: string): boolean {
  return isImageFile(filename) || isVideoFile(filename);
}

/**
 * Convert original media path to thumbnail path
 * @example
 * getThumbnailPath('media/abc123/photos/image.jpg')
 * // => 'thumbnails/abc123/photos/image.jpg.thumb.jpg'
 */
export function getThumbnailPath(originalPath: string): string {
  if (!originalPath.startsWith('media/')) {
    throw new Error('Path must start with "media/"');
  }

  const thumbnailPath = originalPath.replace(/^media\//, 'thumbnails/');
  return `${thumbnailPath}${THUMBNAIL_SUFFIX}`;
}
