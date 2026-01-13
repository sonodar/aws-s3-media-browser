# Discovery Research: thumbnail-delay-fix

## 調査日時

2026-01-13

## 調査目的

Phase 3 設計に向けた既存実装パターンの調査とゼロベース設計のための知見収集

---

## 1. TanStack Query 基盤パターン

### 1.1 queryKeys 定義パターン (`src/stores/queryKeys.ts`)

```typescript
export const queryKeys = {
  identityId: () => ["identityId"] as const,
  items: (identityId: string, path: string) => ["items", identityId, path] as const,
  folders: (identityId: string, path: string) => ["folders", identityId, path] as const,
  previewUrls: (itemKeys: string[]) => ["previewUrls", ...itemKeys] as const,
  passkeys: () => ["passkeys"] as const,
} as const;
```

**パターン特性:**

- 型安全な `as const` アサーション
- 階層的なキー構造（ドメイン → 識別子）
- 関数形式で動的パラメータを受け取り

**Phase 3 への適用:**

- `thumbnail: (originalKey: string) => ["thumbnail", originalKey] as const` を追加
- `storage.upload`, `storage.delete` 等の mutation 用キーは不要（TanStack Query v5 では mutationKey はオプション）

### 1.2 queryClient 設定 (`src/stores/queryClient.ts`)

```typescript
export const queryClientOptions: DefaultOptions = {
  queries: {
    staleTime: 5 * 60 * 1000, // 5分
    gcTime: 30 * 60 * 1000, // 30分
    retry: 3,
    refetchOnWindowFocus: false,
    networkMode: "always",
  },
};
```

**Phase 3 への適用:**

- サムネイル URL クエリはデフォルトを継承しつつ、`retry: 4` と `retryDelay` をオーバーライド

---

## 2. 既存ストレージ操作パターン

### 2.1 useStorageOperations の現状 (`src/hooks/storage/useStorageOperations.ts`)

**現在の実装:**

- `useState` で処理中フラグを手動管理（`isDeleting`, `isRenaming`, `isMoving`）
- 操作関数は `useCallback` で定義
- 操作成功後に `invalidateQueries` でキャッシュ無効化

```typescript
const [isDeleting, setIsDeleting] = useState(false);
const [isRenaming, setIsRenaming] = useState(false);
const [isMoving, setIsMoving] = useState(false);

const uploadFiles = useCallback(
  async (files: File[]): Promise<string[]> => {
    // ... 操作実行
    await invalidateItems();
    return uploadedKeys;
  },
  [getBasePath, invalidateItems],
);
```

**問題点:**

- `useState` による手動フラグ管理が冗長
- `try/finally` パターンの重複
- 成功/失敗状態を呼び出し側で解釈する必要あり

**Phase 3 への適用:**

- `useMutation` で `isPending`, `isError` を自動提供
- `onSuccess` で `invalidateQueries` を宣言的に実行
- 個別操作を独立した mutation フックに分割

### 2.2 invalidateQueries パターン

```typescript
const invalidateItems = useCallback(async () => {
  if (!identityId) return;
  await queryClient.invalidateQueries({
    queryKey: queryKeys.items(identityId, currentPath),
  });
}, [queryClient, identityId, currentPath]);
```

**Phase 3 への適用:**

- mutation の `onSuccess` 内で同様のパターンを使用

---

## 3. サムネイル表示の現状

### 3.1 ThumbnailImage コンポーネント (`src/components/MediaBrowser/ThumbnailImage.tsx`)

**現在の実装:**

- `useState` + `useEffect` で URL 取得と状態管理
- `initialDelay` prop で初期遅延を制御
- リトライ機能なし（1回失敗で error 状態に固定）

```typescript
type ThumbnailState = "loading" | "loaded" | "error";

const [state, setState] = useState<ThumbnailState>(initialDelay ? "error" : "loading");
const [url, setUrl] = useState<string | null>(null);
const [delayComplete, setDelayComplete] = useState(!initialDelay);
```

**問題点:**

- 3つの `useState` による状態管理の複雑さ
- リトライなしで Lambda 生成完了を待機できない
- DevTools での追跡が困難

### 3.2 useUploadTracker フック (`src/hooks/storage/useUploadTracker.ts`)

**現在の実装:**

- アップロードキーを追跡し、一定時間後に自動クリア
- `setTimeout` によるタイマー管理

```typescript
const trackUpload = useCallback(
  (keys: string[]) => {
    setRecentlyUploadedKeys((prev) => [...prev, ...keys]);
    keys.forEach((key) => {
      const timer = setTimeout(() => {
        // 自動クリア
      }, clearDelay);
    });
  },
  [clearDelay],
);
```

**Phase 3 での位置づけ:**

- 初期遅延を排除したため、このフックは不要となる
- TanStack Query のリトライで Lambda 生成完了を待機

---

## 4. Phase 3 設計への示唆

### 4.1 useMutation 設計

| 操作         | mutationFn          | onSuccess                           |
| ------------ | ------------------- | ----------------------------------- |
| upload       | `uploadData()`      | `invalidateQueries(items)`          |
| delete       | `remove()`          | `invalidateQueries(items)`          |
| move         | `copy() + remove()` | `invalidateQueries(items)`          |
| rename       | `copy() + remove()` | `invalidateQueries(items)`          |
| createFolder | `uploadData()`      | `invalidateQueries(items, folders)` |

### 4.2 サムネイル URL useQuery 設計

```typescript
useQuery({
  queryKey: queryKeys.thumbnail(originalKey),
  queryFn: async () => {
    const thumbnailPath = getThumbnailPath(originalKey);
    const result = await getUrl({ path: thumbnailPath });
    return result.url.toString();
  },
  retry: 4,
  retryDelay: (attemptIndex) => Math.pow(2, attemptIndex) * 1000, // 1s, 2s, 4s, 8s
  staleTime: 5 * 60 * 1000, // 5分
});
```

### 4.3 削除対象

Phase 3 完了後に削除可能なコード:

- `useUploadTracker` フック全体
- `ThumbnailImage` の `initialDelay` prop と関連ロジック
- `useStorageOperations` の手動フラグ管理（`useState` の `isDeleting` 等）

---

## 5. 結論

1. **TanStack Query 基盤は Phase 2 で確立済み** - queryKeys, queryClient パターンをそのまま拡張
2. **useMutation 導入で状態管理を大幅簡素化** - 手動の `useState` フラグを `isPending` で置換
3. **サムネイル URL は useQuery + retry で解決** - 初期遅延とタイマー管理を排除
4. **useUploadTracker は不要** - リトライ機構で代替
