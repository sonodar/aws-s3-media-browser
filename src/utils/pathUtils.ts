import { isImageFile, isVideoFile } from './fileTypes';

/**
 * Thumbnail file suffix
 */
const THUMBNAIL_SUFFIX = '.thumb.jpg';

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

/**
 * Convert thumbnail path back to original media path
 * @example
 * getOriginalPath('thumbnails/abc123/photos/image.jpg.thumb.jpg')
 * // => 'media/abc123/photos/image.jpg'
 */
export function getOriginalPath(thumbnailPath: string): string {
  if (!thumbnailPath.startsWith('thumbnails/')) {
    throw new Error('Path must start with "thumbnails/"');
  }

  if (!thumbnailPath.endsWith(THUMBNAIL_SUFFIX)) {
    throw new Error('Path must end with ".thumb.jpg"');
  }

  const withoutSuffix = thumbnailPath.slice(0, -THUMBNAIL_SUFFIX.length);
  return withoutSuffix.replace(/^thumbnails\//, 'media/');
}

/**
 * Check if file is a thumbnail target (image or video)
 */
export function isThumbnailTarget(filename: string): boolean {
  return isImageFile(filename) || isVideoFile(filename);
}
