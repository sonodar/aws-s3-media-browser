# Technical Design: サブパス戦略最適化

## 概要

AWS Amplify Storage API の `subpathStrategy: { strategy: 'exclude' }` オプションを導入し、フォルダ一覧取得を最適化する。同時に `queryKeys.items` と `queryKeys.folders` を統合し、MoveDialog と MediaBrowser 間でキャッシュを共有することで API 呼び出しを削減する。

## 設計原則

- **最小変更**: 既存の動作とインターフェースを可能な限り維持
- **後方互換**: フォールバック機構で旧環境をサポート
- **単一責任**: キャッシュキーの統合により責務を明確化
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

### After（最適化後）

```
┌─────────────────┐           ┌─────────────────┐
│  MediaBrowser   │           │   MoveDialog    │
└────────┬────────┘           └────────┬────────┘
         │                              │
         ▼                              │
┌─────────────────┐                     │
│ useStorageItems │ ◀───────────────────┘
│  queryKeys.items│     キャッシュ共有
│  subpathStrategy│
└────────┬────────┘
         │ strategy:'exclude'
         ▼
┌─────────────────────────────────────────────────┐
│                  Amplify Storage API            │
│       items[] + excludedSubpaths[] を返却       │
└─────────────────────────────────────────────────┘
```

## コンポーネント設計

### 1. useStorageItems フック

**ファイル**: `src/hooks/storage/useStorageItems.ts`

#### 責務

- Amplify Storage API を `subpathStrategy: { strategy: 'exclude' }` で呼び出す
- `items` からファイル一覧を取得
- `excludedSubpaths` からフォルダ一覧を構築
- 両者を統合して StorageItem[] として返却
- 旧環境向けのフォールバック機構を提供

#### インターフェース変更

- 戻り値の型は変更なし（StorageItem[]）
- 内部実装のみ変更

### 2. parseStorageItems モジュール

**ファイル**: `src/hooks/storage/parseStorageItems.ts`

#### 追加関数

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

### 3. queryKeys

**ファイル**: `src/stores/queryKeys.ts`

#### 変更内容

| キー      | Before | After            |
| --------- | ------ | ---------------- |
| `items`   | 維持   | 維持（変更なし） |
| `folders` | 存在   | **廃止**         |

### 4. useFolderList フック

**ファイル**: `src/hooks/storage/useFolderList.ts`

#### 方針

**廃止**して FolderBrowser で直接 useStorageItems を使用する。

理由：

- キャッシュ統合により存在意義がなくなる
- シンプルなフィルタ処理はコンポーネント側で行う方が明確

### 5. FolderBrowser コンポーネント

**ファイル**: `src/components/MediaBrowser/FolderBrowser.tsx`

#### 変更内容

- `useFolderList` → `useStorageItems` に変更
- コンポーネント内で `type === "folder"` でフィルタ
- インターフェース（Props）は変更なし

### 6. Mutation フック群

**対象ファイル**:

- `useMoveMutation.ts`
- `useDeleteMutation.ts`
- `useRenameMutation.ts`
- `useUploadMutation.ts`
- `useCreateFolderMutation.ts`

#### 変更内容

- `onSuccess` から `queryKeys.folders` の無効化を削除
- `queryKeys.items` の無効化のみ残す

#### フォルダ操作時の動作

フォルダの移動・削除・リネーム時は引き続き `listAll: true` を使用。

理由：

- フォルダ配下の全ファイルに対して操作が必要
- 操作頻度は低く、パフォーマンス影響は限定的

## エラーハンドリング

### フォールバック戦略

1. `subpathStrategy: { strategy: 'exclude' }` で API 呼び出し
2. サポートされていない場合はエラーをキャッチ
3. `listAll: true` で再試行
4. 既存の parseStorageItems ロジックでフォルダを推測

### 判定条件

エラーメッセージに `subpathStrategy` または `not supported` が含まれる場合にフォールバック。

## データフロー

### 正常系

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

### フォールバック系

```
list({ subpathStrategy: 'exclude' })
         │
         ▼ Error
         │
         ▼
list({ listAll: true })
         │
         ▼
parseStorageItems() ──► StorageItem[] (従来ロジック)
```

## テスト戦略

### ユニットテスト

| 対象                         | テストケース                           |
| ---------------------------- | -------------------------------------- |
| `parseExcludedSubpaths`      | 正常変換、空配列、ネストパス           |
| `mergeAndDeduplicateFolders` | 重複排除、明示的/暗黙的統合            |
| `useStorageItems`            | subpathStrategy 正常系、フォールバック |

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

| リスク                         | 緩和策                     |
| ------------------------------ | -------------------------- |
| subpathStrategy 未サポート環境 | フォールバック機構         |
| 明示的/暗黙的フォルダの重複    | 重複排除ロジック           |
| Mutation 無効化漏れ            | 全 Mutation の確認・テスト |

## 依存関係

- AWS Amplify v6.x（subpathStrategy サポート）
- TanStack Query v5.x

## 実装フェーズ

### Phase 1: useStorageItems 拡張

1. parseExcludedSubpaths 関数追加
2. mergeAndDeduplicateFolders 関数追加
3. useStorageItems の queryFn 更新
4. フォールバック機構追加

### Phase 2: キャッシュ統合

1. FolderBrowser を useStorageItems に移行
2. Mutation フックの無効化ロジック更新
3. queryKeys.folders 廃止

### Phase 3: クリーンアップ

1. useFolderList 削除
2. テスト更新
