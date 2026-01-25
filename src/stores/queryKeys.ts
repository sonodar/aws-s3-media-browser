/**
 * TanStack Query の queryKey ファクトリ
 *
 * - ドメインごとの queryKey パターンを定義
 * - as const で型安全性を確保
 * - invalidateQueries でプレフィックスマッチが可能な構造
 */
export const queryKeys = {
  /**
   * 認証 ID の queryKey
   * @example queryKeys.identityId() // ["identityId"]
   */
  identityId: () => ["identityId"] as const,

  /**
   * プレビュー URL の queryKey（単一）
   * @example queryKeys.previewUrl("photo1.jpg") // ["previewUrl", "photo1.jpg"]
   */
  previewUrl: (itemKey: string) => ["previewUrl", itemKey] as const,

  /**
   * プレビュー URL の queryKey
   * @example queryKeys.previewUrls(["photo1.jpg", "photo2.jpg"]) // ["previewUrls", "photo1.jpg", "photo2.jpg"]
   */
  previewUrls: (itemKeys: string[]) => ["previewUrls", ...itemKeys] as const,

  /**
   * パスキー一覧の queryKey
   * @example queryKeys.passkeys() // ["passkeys"]
   */
  passkeys: () => ["passkeys"] as const,

  /**
   * サムネイル URL の queryKey
   * @example queryKeys.thumbnail("media/user-123/photos/image.jpg") // ["thumbnail", "media/user-123/photos/image.jpg"]
   */
  thumbnail: (originalKey: string) => ["thumbnail", originalKey] as const,

  /**
   * ストレージアイテム一覧の queryKey（subpathStrategy: 'exclude' 使用）
   * - ファイルとフォルダを統合して返す
   * @example queryKeys.storageItems("user-123", "/photos") // ["storageItems", "user-123", "/photos"]
   */
  storageItems: (identityId: string, path: string) => ["storageItems", identityId, path] as const,
} as const;
