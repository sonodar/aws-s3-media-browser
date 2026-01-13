# Technical Design: サブパス戦略最適化

## 概要

AWS Amplify Storage API の `subpathStrategy: { strategy: 'exclude' }` オプションを導入し、フォルダ一覧取得を最適化する。新しいキャッシュキーとフックを既存実装と並行して構築し、段階的に移行することで安全に抜本的改善を実現する。

## 設計原則

- **Strangler Fig パターン**: 既存実装を残したまま新実装を並行構築し、最後に切り替え
- **ゼロベース設計**: 既存実装に引きずられず、理想的なデータ構造から設計
- **段階的移行**: 新キャッシュキー → 新フック → コンポーネント移行 → 旧実装削除
- **型安全**: TypeScript の型システムを活用

## アーキテクチャ

### Before（現状）

```
┌─────────────────┐           ┌─────────────────┐
│  MediaBrowser   │           │   MoveDialog    │
└────────┬────────┘           └────────┬────────┘
         │                              │
         ▼                              ▼
┌─────────────────┐           ┌─────────────────┐
│ useStorageItems │           │  useFolderList  │
│  queryKeys.items│           │ queryKeys.folders│
└────────┬────────┘           └────────┬────────┘
         │ listAll:true                 │ listAll:true
         ▼                              ▼
┌─────────────────────────────────────────────────┐
│                  Amplify Storage API            │
│             （重複API呼び出し！）                │
└─────────────────────────────────────────────────┘
```

### During（移行期間）

```
┌─────────────────┐           ┌─────────────────┐
│  MediaBrowser   │           │   MoveDialog    │
└────────┬────────┘           └────────┬────────┘
         │                              │
         ▼                              ▼
┌─────────────────┐           ┌─────────────────┐
│useStorageItemsV2│           │useStorageItemsV2│
│queryKeys.       │           │queryKeys.       │
│  storageItems   │           │  storageItems   │
└────────┬────────┘           └────────┬────────┘
         │ strategy:'exclude'           │ キャッシュ共有
         ▼                              │
┌─────────────────────────────────────────────────┐
│                  Amplify Storage API            │
│       items[] + excludedSubpaths[] を返却       │
└─────────────────────────────────────────────────┘

旧実装（useStorageItems, useFolderList）は並行して存在
→ 動作確認後に削除
```

### After（最適化完了）

```
┌─────────────────┐           ┌─────────────────┐
│  MediaBrowser   │           │   MoveDialog    │
└────────┬────────┘           └────────┬────────┘
         │                              │
         ▼                              │
┌─────────────────┐                     │
│ useStorageItems │ ◀───────────────────┘
│queryKeys.       │     キャッシュ共有
│  storageItems   │
└────────┬────────┘
         │ strategy:'exclude'
         ▼
┌─────────────────────────────────────────────────┐
│                  Amplify Storage API            │
│       items[] + excludedSubpaths[] を返却       │
└─────────────────────────────────────────────────┘

旧実装（queryKeys.items, queryKeys.folders, useFolderList）は削除済み
```

## コンポーネント設計

### 1. データ変換モジュール（新規）

**ファイル**: `src/hooks/storage/storageItemParser.ts`

#### 責務

既存の parseStorageItems.ts とは独立した新規モジュールとして実装。

| 関数名                       | 責務                                         |
| ---------------------------- | -------------------------------------------- |
| `parseExcludedSubpaths`      | excludedSubpaths 配列を StorageItem[] に変換 |
| `mergeAndDeduplicateFolders` | 明示的/暗黙的フォルダを統合・重複排除        |

#### S3 フォルダ表現の扱い

| 種類           | 例                                    | 検出元                  |
| -------------- | ------------------------------------- | ----------------------- |
| 明示的フォルダ | `photos/`（0バイトオブジェクト）      | `items` 配列            |
| 暗黙的フォルダ | `photos/image.jpg` 存在時の `photos/` | `excludedSubpaths` 配列 |

統合時に key ベースで重複排除を行う。

### 2. queryKeys（段階的移行）

**ファイル**: `src/stores/queryKeys.ts`

#### 移行期間

| キー           | 状態     | 用途                    |
| -------------- | -------- | ----------------------- |
| `items`        | 既存     | 旧 useStorageItems 用   |
| `folders`      | 既存     | 旧 useFolderList 用     |
| `storageItems` | **新規** | 新 useStorageItemsV2 用 |

#### 最終状態

| キー           | 状態               |
| -------------- | ------------------ |
| `items`        | **削除**           |
| `folders`      | **削除**           |
| `storageItems` | 維持（リネーム可） |

### 3. useStorageItemsV2 フック（新規）

**ファイル**: `src/hooks/storage/useStorageItemsV2.ts`

#### 責務

- Amplify Storage API を `subpathStrategy: { strategy: 'exclude' }` で呼び出す
- storageItemParser のデータ変換関数を使用
- `queryKeys.storageItems` をキャッシュキーとして使用

#### インターフェース

- 旧 useStorageItems と同じ戻り値型（StorageItem[]）
- 移行完了後、useStorageItems にリネーム

### 4. 旧フック（移行後削除）

| フック          | 移行期間の状態 | 最終状態 |
| --------------- | -------------- | -------- |
| useStorageItems | 並行稼働       | 削除     |
| useFolderList   | 並行稼働       | 削除     |

### 5. FolderBrowser コンポーネント

**ファイル**: `src/components/MediaBrowser/FolderBrowser.tsx`

#### 変更内容

- `useFolderList` → `useStorageItemsV2` に変更
- コンポーネント内で `type === "folder"` でフィルタ
- Props インターフェースは変更なし

### 6. Mutation フック群

**対象ファイル**:

- `useMoveMutation.ts`
- `useDeleteMutation.ts`
- `useRenameMutation.ts`
- `useUploadMutation.ts`
- `useCreateFolderMutation.ts`

#### 移行期間

- `queryKeys.storageItems` の無効化を追加
- 既存の `queryKeys.items`, `queryKeys.folders` の無効化も維持

#### 最終状態

- `queryKeys.storageItems` の無効化のみ
- 旧キーの無効化を削除

#### フォルダ操作時の動作

フォルダの移動・削除・リネーム時は引き続き `listAll: true` を使用。

## データフロー

```
list({ subpathStrategy: 'exclude' })
         │
         ▼
┌─────────────────────────────┐
│ Response                    │
│ - items: S3ListItem[]       │
│ - excludedSubpaths: string[]│
└─────────────────────────────┘
         │
         ├─── items ──────────► parseStorageItems() ──► files: StorageItem[]
         │
         └─── excludedSubpaths ► parseExcludedSubpaths() ──► folders: StorageItem[]
                                                                    │
                                                                    ▼
                                                    mergeAndDeduplicateFolders()
                                                                    │
                                                                    ▼
                                                        StorageItem[] (統合済み)
```

## テスト戦略

### ユニットテスト

| 対象                         | テストケース                 |
| ---------------------------- | ---------------------------- |
| `parseExcludedSubpaths`      | 正常変換、空配列、ネストパス |
| `mergeAndDeduplicateFolders` | 重複排除、明示的/暗黙的統合  |
| `useStorageItemsV2`          | subpathStrategy 正常系       |

### 統合テスト

| 対象          | テストケース                     |
| ------------- | -------------------------------- |
| FolderBrowser | キャッシュ共有、フォルダフィルタ |
| MoveDialog    | 訪問済みパスでのキャッシュヒット |

## パフォーマンス期待値

| 指標                       | Before                   | After    |
| -------------------------- | ------------------------ | -------- |
| 同一パスでの API 呼び出し  | 2回                      | 1回      |
| 深いフォルダでのデータ転送 | サブフォルダ内全ファイル | 直下のみ |
| キャッシュヒット率         | 低                       | 高       |

## リスクと緩和策

| リスク                       | 緩和策                             |
| ---------------------------- | ---------------------------------- |
| 明示的/暗黙的フォルダの重複  | 重複排除ロジック                   |
| Mutation 無効化漏れ          | 移行期間は新旧両方のキーを無効化   |
| 移行期間中のキャッシュ不整合 | 新旧実装が独立したキーを使用       |
| ロールバック必要時           | 旧実装を削除せず並行稼働で動作確認 |

## 依存関係

- AWS Amplify v6.x（subpathStrategy サポート）
- TanStack Query v5.x

## 実装フェーズ

### Phase 1: 新規実装（既存と並行）

1. storageItemParser.ts を新規作成
   - parseExcludedSubpaths 関数
   - mergeAndDeduplicateFolders 関数
   - ユニットテスト
2. queryKeys.storageItems を追加
3. useStorageItemsV2.ts を新規作成
   - subpathStrategy: 'exclude' を使用
   - ユニットテスト

### Phase 2: コンポーネント移行

1. FolderBrowser を useStorageItemsV2 に移行
2. MediaBrowser を useStorageItemsV2 に移行
3. Mutation フックに queryKeys.storageItems 無効化を追加
4. 統合テスト

### Phase 3: クリーンアップ

1. 旧フック削除（useStorageItems, useFolderList）
2. 旧キー削除（queryKeys.items, queryKeys.folders）
3. Mutation フックから旧キー無効化を削除
4. useStorageItemsV2 を useStorageItems にリネーム
5. 不要なテスト削除

## ユーザー向けテスト手順

実装完了後、以下の手順で動作確認を行う。

### 基本動作確認

1. **フォルダ表示**
   - ルートフォルダを開く → ファイルとフォルダが表示される
   - サブフォルダをクリック → そのフォルダ直下のアイテムが表示される
   - 戻るボタン → 親フォルダに戻る

2. **キャッシュ動作**
   - フォルダ A → フォルダ B → フォルダ A と移動
   - 2回目のフォルダ A 表示時にローディングが表示されない（キャッシュヒット）

3. **MoveDialog キャッシュ共有**
   - MediaBrowser でフォルダ A を表示
   - ファイルを選択 → 移動ダイアログを開く
   - フォルダ A を展開 → ローディングなしで即座に表示（キャッシュ共有）

### DevTools による確認

4. **重複 API 呼び出しがないことの確認**
   - DevTools のネットワークタブを開く
   - フォルダ A を表示 → API 呼び出しが 1 回のみであることを確認
   - フォルダ B に移動 → 新たに 1 回の API 呼び出しのみ
   - フォルダ A に戻る → API 呼び出しが発生しない（キャッシュ使用）
   - MoveDialog を開く → 訪問済みパスで追加の API 呼び出しが発生しない

### Mutation 後のキャッシュ無効化

5. **ファイルアップロード**
   - ファイルをアップロード → 一覧に即座に反映される

6. **フォルダ作成**
   - 新規フォルダを作成 → 一覧に即座に反映される

7. **ファイル/フォルダ削除**
   - アイテムを削除 → 一覧から即座に消える

8. **ファイル/フォルダ移動**
   - アイテムを別フォルダに移動 → 元フォルダから消え、移動先に表示される

9. **リネーム**
   - アイテムをリネーム → 一覧に新しい名前で表示される

### エッジケース

10. **空フォルダ**
    - ファイルのないフォルダを表示 → 「ファイルがありません」と表示

11. **深い階層**
    - 3階層以上のフォルダを移動 → 各階層で正しく表示される
