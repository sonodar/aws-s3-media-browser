/**
 * TanStack Query キャッシュ無効化ユーティリティ
 *
 * フォルダ操作時に配下パスのキャッシュも無効化するための prefix-based invalidation を提供
 */
import type { QueryClient } from "@tanstack/react-query";

/**
 * 指定パスとその配下すべてのストレージアイテムキャッシュを無効化する
 *
 * @param queryClient - TanStack Query クライアント
 * @param identityId - ユーザー ID
 * @param pathPrefix - 無効化するパスのプレフィックス
 *
 * @example
 * // "photos" とその配下 ("photos/vacation", "photos/vacation/beach" など) を無効化
 * await invalidateWithDescendants(queryClient, identityId, "photos");
 */
export async function invalidateWithDescendants(
  queryClient: QueryClient,
  identityId: string,
  pathPrefix: string,
): Promise<void> {
  await queryClient.invalidateQueries({
    predicate: (query) => {
      const queryKey = query.queryKey;

      // queryKey の形式: ["storageItems", identityId, path]
      if (queryKey.length !== 3) return false;
      if (queryKey[0] !== "storageItems") return false;
      if (queryKey[1] !== identityId) return false;

      const path = queryKey[2] as string;

      // 空のプレフィックスの場合、すべてのパスを無効化
      if (pathPrefix === "") {
        return true;
      }

      // 完全一致 または パスが prefix/ で始まる場合に無効化
      return path === pathPrefix || path.startsWith(pathPrefix + "/");
    },
  });
}
