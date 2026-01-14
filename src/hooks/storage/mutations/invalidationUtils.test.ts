/**
 * invalidationUtils のテスト
 *
 * prefix-based invalidation ユーティリティのテスト
 */
import { describe, it, expect, beforeEach } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../../stores/queryKeys";
import { invalidateWithDescendants } from "./invalidationUtils";

describe("invalidateWithDescendants", () => {
  let queryClient: QueryClient;
  const identityId = "test-identity-id";

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  it("should invalidate exact path match", async () => {
    // キャッシュにデータを設定
    queryClient.setQueryData(queryKeys.storageItems(identityId, "photos"), [
      { key: "photos/image.jpg", name: "image.jpg", type: "file" },
    ]);

    // 無効化を実行
    await invalidateWithDescendants(queryClient, identityId, "photos");

    // キャッシュが無効化されたことを確認
    const state = queryClient.getQueryState(queryKeys.storageItems(identityId, "photos"));
    expect(state?.isInvalidated).toBe(true);
  });

  it("should invalidate descendant paths", async () => {
    // 親パスと子パスにキャッシュを設定
    queryClient.setQueryData(queryKeys.storageItems(identityId, "photos"), []);
    queryClient.setQueryData(queryKeys.storageItems(identityId, "photos/vacation"), []);
    queryClient.setQueryData(queryKeys.storageItems(identityId, "photos/vacation/beach"), []);

    // 親パスで無効化を実行
    await invalidateWithDescendants(queryClient, identityId, "photos");

    // すべてのキャッシュが無効化されたことを確認
    expect(
      queryClient.getQueryState(queryKeys.storageItems(identityId, "photos"))?.isInvalidated,
    ).toBe(true);
    expect(
      queryClient.getQueryState(queryKeys.storageItems(identityId, "photos/vacation"))
        ?.isInvalidated,
    ).toBe(true);
    expect(
      queryClient.getQueryState(queryKeys.storageItems(identityId, "photos/vacation/beach"))
        ?.isInvalidated,
    ).toBe(true);
  });

  it("should not invalidate unrelated paths", async () => {
    // 関係ないパスにキャッシュを設定
    queryClient.setQueryData(queryKeys.storageItems(identityId, "photos"), []);
    queryClient.setQueryData(queryKeys.storageItems(identityId, "documents"), []);
    queryClient.setQueryData(queryKeys.storageItems(identityId, "photos-backup"), []); // 類似名だが別パス

    // photos パスで無効化を実行
    await invalidateWithDescendants(queryClient, identityId, "photos");

    // photos のみ無効化、他は影響なし
    expect(
      queryClient.getQueryState(queryKeys.storageItems(identityId, "photos"))?.isInvalidated,
    ).toBe(true);
    expect(
      queryClient.getQueryState(queryKeys.storageItems(identityId, "documents"))?.isInvalidated,
    ).toBeFalsy();
    expect(
      queryClient.getQueryState(queryKeys.storageItems(identityId, "photos-backup"))?.isInvalidated,
    ).toBeFalsy();
  });

  it("should not invalidate caches of different identityId", async () => {
    const otherIdentityId = "other-identity-id";

    // 異なる identityId でキャッシュを設定
    queryClient.setQueryData(queryKeys.storageItems(identityId, "photos"), []);
    queryClient.setQueryData(queryKeys.storageItems(otherIdentityId, "photos"), []);

    // 無効化を実行
    await invalidateWithDescendants(queryClient, identityId, "photos");

    // 同一 identityId のみ無効化
    expect(
      queryClient.getQueryState(queryKeys.storageItems(identityId, "photos"))?.isInvalidated,
    ).toBe(true);
    expect(
      queryClient.getQueryState(queryKeys.storageItems(otherIdentityId, "photos"))?.isInvalidated,
    ).toBeFalsy();
  });

  it("should handle empty cache gracefully", async () => {
    // キャッシュが空の状態で実行してもエラーにならない
    await expect(
      invalidateWithDescendants(queryClient, identityId, "photos"),
    ).resolves.not.toThrow();
  });

  it("should invalidate root path and all descendants", async () => {
    // ルートパスと複数の子パスにキャッシュを設定
    queryClient.setQueryData(queryKeys.storageItems(identityId, ""), []);
    queryClient.setQueryData(queryKeys.storageItems(identityId, "photos"), []);
    queryClient.setQueryData(queryKeys.storageItems(identityId, "documents"), []);

    // ルートパスで無効化を実行
    await invalidateWithDescendants(queryClient, identityId, "");

    // すべてのキャッシュが無効化されたことを確認
    expect(queryClient.getQueryState(queryKeys.storageItems(identityId, ""))?.isInvalidated).toBe(
      true,
    );
    expect(
      queryClient.getQueryState(queryKeys.storageItems(identityId, "photos"))?.isInvalidated,
    ).toBe(true);
    expect(
      queryClient.getQueryState(queryKeys.storageItems(identityId, "documents"))?.isInvalidated,
    ).toBe(true);
  });
});
