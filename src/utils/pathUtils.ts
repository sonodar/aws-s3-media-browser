import { isImageFile, isVideoFile } from "./fileTypes";

/**
 * Encode path for S3 CopySource header
 *
 * Amplify Storage の copy API は x-amz-copy-source ヘッダーにソースパスを
 * URL エンコードせずに設定するため、日本語などの非ASCII文字を含むパスで
 * エラーが発生する。この関数でパスを事前にエンコードすることで回避する。
 *
 * @see https://github.com/axios/axios/issues/4556
 * @example
 * encodePathForCopy('media/abc/日本語.jpg')
 * // => 'media/abc/%E6%97%A5%E6%9C%AC%E8%AA%9E.jpg'
 */
export function encodePathForCopy(path: string): string {
  return path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

/**
 * Thumbnail file suffix
 */
const THUMBNAIL_SUFFIX = ".thumb.jpg";

/**
 * Convert original media path to thumbnail path
 * @example
 * getThumbnailPath('media/abc123/photos/image.jpg')
 * // => 'thumbnails/abc123/photos/image.jpg.thumb.jpg'
 */
export function getThumbnailPath(originalPath: string): string {
  if (!originalPath.startsWith("media/")) {
    throw new Error('Path must start with "media/"');
  }

  const thumbnailPath = originalPath.replace(/^media\//, "thumbnails/");
  return `${thumbnailPath}${THUMBNAIL_SUFFIX}`;
}

/**
 * Convert thumbnail path back to original media path
 * @example
 * getOriginalPath('thumbnails/abc123/photos/image.jpg.thumb.jpg')
 * // => 'media/abc123/photos/image.jpg'
 */
export function getOriginalPath(thumbnailPath: string): string {
  if (!thumbnailPath.startsWith("thumbnails/")) {
    throw new Error('Path must start with "thumbnails/"');
  }

  if (!thumbnailPath.endsWith(THUMBNAIL_SUFFIX)) {
    throw new Error('Path must end with ".thumb.jpg"');
  }

  const withoutSuffix = thumbnailPath.slice(0, -THUMBNAIL_SUFFIX.length);
  return withoutSuffix.replace(/^thumbnails\//, "media/");
}

/**
 * Check if file is a thumbnail target (image or video)
 */
export function isThumbnailTarget(filename: string): boolean {
  return isImageFile(filename) || isVideoFile(filename);
}

/**
 * パスから指定されたプレフィックスを除去して相対パスを取得する
 * プレフィックスが一致しない場合はそのまま返す
 * @param path 変換対象のパス
 * @param prefix 除去するプレフィックス
 * @returns プレフィックスを除去した相対パス（末尾スラッシュも除去）
 * @example
 * toRelativePath('media/user-123/photos/', 'media/user-123/') // => 'photos'
 * toRelativePath('photos/', 'media/user-123/') // => 'photos/' (不一致時はそのまま)
 */
export function toRelativePath(path: string, prefix: string): string {
  if (!path.startsWith(prefix)) {
    return path;
  }
  let relativePath = path.slice(prefix.length);
  if (relativePath.endsWith("/")) {
    relativePath = relativePath.slice(0, -1);
  }
  return relativePath;
}

/**
 * Get parent directory path from a key or path
 * @example
 * getParentPath('photos/2024/image.jpg') // => 'photos/2024/'
 * getParentPath('image.jpg') // => ''
 * getParentPath('photos/') // => ''
 */
export function getParentPath(key: string): string {
  // Remove trailing slash for folder paths
  const normalizedKey = key.endsWith("/") ? key.slice(0, -1) : key;

  const lastSlashIndex = normalizedKey.lastIndexOf("/");
  if (lastSlashIndex === -1) {
    return "";
  }

  return normalizedKey.substring(0, lastSlashIndex + 1);
}

/**
 * Build a new key for a renamed file
 * @param currentKey The current S3 object key
 * @param newName The new file name (without path)
 * @example
 * buildRenamedKey('photos/old.jpg', 'new.jpg') // => 'photos/new.jpg'
 */
export function buildRenamedKey(currentKey: string, newName: string): string {
  const parentPath = getParentPath(currentKey);
  return `${parentPath}${newName}`;
}

/**
 * Build a new prefix for a renamed folder
 * @param currentPrefix The current folder prefix (with trailing slash)
 * @param newName The new folder name (without trailing slash)
 * @example
 * buildRenamedPrefix('photos/old/', 'new') // => 'photos/new/'
 */
export function buildRenamedPrefix(currentPrefix: string, newName: string): string {
  const parentPath = getParentPath(currentPrefix);
  // Remove trailing slash from new name if present
  const normalizedNewName = newName.endsWith("/") ? newName.slice(0, -1) : newName;
  return `${parentPath}${normalizedNewName}/`;
}
