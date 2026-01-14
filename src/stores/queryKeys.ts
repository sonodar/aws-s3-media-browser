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
   * ファイル/フォルダ一覧の queryKey（パス依存）
   * @example queryKeys.items("user-123", "/photos") // ["items", "user-123", "/photos"]
   */
  items: (identityId: string, path: string) => ["items", identityId, path] as const,

  /**
   * フォルダ一覧の queryKey（移動先選択用）
   * @example queryKeys.folders("user-123", "/photos") // ["folders", "user-123", "/photos"]
   */
  folders: (identityId: string, path: string) => ["folders", identityId, path] as const,

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
   * 新しいストレージアイテム一覧の queryKey（subpathStrategy: 'exclude' 用）
   * - ファイルとフォルダを統合して返す新実装用
   * - 移行完了後は items, folders を置き換え予定
   * @example queryKeys.storageItems("user-123", "/photos") // ["storageItems", "user-123", "/photos"]
   */
  storageItems: (identityId: string, path: string) => ["storageItems", identityId, path] as const,
} as const;
