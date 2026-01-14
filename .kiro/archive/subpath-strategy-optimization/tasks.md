# Implementation Plan

## Task 1: データ変換モジュールの新規実装

- [x] 1.1 (P) excludedSubpaths をフォルダ情報に変換する機能を実装
  - API レスポンスの excludedSubpaths 配列を StorageItem[] に変換する
  - 各サブパスからフォルダ名を抽出し、type: 'folder' の StorageItem を生成する
  - 既存の parseStorageItems.ts とは独立した新規モジュールとして作成する
  - _Requirements: 1.2, 1.3, 3.1_

- [x] 1.2 (P) 明示的フォルダと暗黙的フォルダを統合する機能を実装
  - items 配列の明示的フォルダと excludedSubpaths の暗黙的フォルダを統合する
  - key ベースで重複を排除し、一意のフォルダ一覧を生成する
  - _Requirements: 3.2, 5.3_

- [x] 1.3 データ変換機能のユニットテストを作成
  - 正常変換、空配列、ネストパスのケースをテストする
  - 重複排除が正しく動作することをテストする
  - _Requirements: 7.1, 7.2_

## Task 2: 新キャッシュキーとフックの実装

- [x] 2.1 新しいキャッシュキー storageItems を追加
  - 既存の items, folders とは独立した新キーを定義する
  - キー構造は `["storageItems", identityId, path]` とする
  - _Requirements: 1.5, 2.3_

- [x] 2.2 subpathStrategy を使用した新フックを実装
  - `subpathStrategy: { strategy: 'exclude' }` で API を呼び出す
  - Task 1 のデータ変換機能を使用してファイルとフォルダを統合する
  - 新しいキャッシュキー storageItems を使用する
  - 再帰的な API 呼び出しは行わず、直下のアイテムのみ取得する
  - _Requirements: 1.1, 1.4, 2.1, 3.3, 5.1, 5.2_

- [x] 2.3 新フックのユニットテストを作成
  - subpathStrategy を使用した API 呼び出しをテストする
  - ファイルとフォルダが正しく統合されることをテストする
  - _Requirements: 7.1, 7.2_

## Task 3: コンポーネント移行

- [x] 3.1 FolderBrowser を新フックに移行
  - useFolderList から新フックに変更する
  - コンポーネント内で type === "folder" でフィルタする
  - Props インターフェースは変更しない
  - _Requirements: 2.2, 2.4, 5.5_

- [x] 3.2 MediaBrowser を新フックに移行
  - useStorageItems から新フックに変更する
  - 既存のソート機能（名前順、日付順、サイズ順）を維持する
  - フォルダを先に、ファイルを後に表示する動作を維持する
  - _Requirements: 2.1, 3.3, 3.4_

- [x] 3.3 (P) Mutation フックに新キャッシュの無効化を追加
  - 各 Mutation フックの onSuccess に storageItems キャッシュの無効化を追加する
  - 移行期間中は旧キー（items, folders）の無効化も維持する
  - フォルダ操作時は引き続き listAll: true で全ファイルを取得する
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 3.4 キャッシュ共有の統合テストを追加
  - MoveDialog と MediaBrowser で同じキャッシュを使用することを確認する
  - 訪問済みパスでキャッシュヒットすることを確認する
  - _Requirements: 7.4, 7.5, 7.6_

## Task 4: クリーンアップ

- [x] 4.1 (P) 旧フックを削除
  - useStorageItems.ts を削除する
  - useFolderList.ts を削除する
  - hooks/storage/index.ts から旧 export を削除する
  - _Requirements: 2.5_

- [x] 4.2 (P) 旧キャッシュキーを削除
  - queryKeys.items を削除する
  - queryKeys.folders を削除する
  - _Requirements: 2.3_

- [x] 4.3 Mutation フックから旧キー無効化を削除
  - queryKeys.items, queryKeys.folders の無効化を削除する
  - queryKeys.storageItems の無効化のみを残す
  - _Requirements: 2.3, 4.4_

- [x] 4.4 (P) 不要なテストを削除・更新
  - useFolderList のテストを削除する
  - 旧 useStorageItems のテストを削除または更新する
  - _Requirements: 7.4_

- [x] 4.5 新フックを useStorageItems にリネーム
  - useStorageItemsV2 → useStorageItems にリネームする
  - インポート元を更新する
  - _Requirements: 2.1_

## Task 5: Bug Fix - Mutation フックのキャッシュ無効化

フォルダ操作時に配下パスのキャッシュが無効化されず、stale なデータが表示されるバグを修正。

**影響を受ける Mutation:**

- useDeleteMutation - フォルダ削除時に配下キャッシュが残る
- useMoveMutation - 移動したフォルダ配下のキャッシュが残る
- useRenameMutation - 旧パス配下のキャッシュが無効なまま残る

- [x] 5.1 (P) invalidationUtils.ts を新規作成
  - prefix-based invalidation ユーティリティを src/hooks/storaget/mutations 配下に実装
  - 指定パスとその配下すべてのキャッシュを無効化する関数
  - TanStack Query の `predicate` を使用

- [x] 5.2 useDeleteMutation を修正
  - フォルダ削除時に配下キャッシュも無効化
  - invalidateStorageItemsWithDescendants を使用

- [x] 5.3 useMoveMutation を修正
  - 移動元・移動先フォルダの配下キャッシュも無効化
  - invalidateStorageItemsWithDescendants を使用

- [x] 5.4 useRenameMutation を修正
  - リネーム前パスの配下キャッシュを無効化
  - invalidateStorageItemsWithDescendants を使用

- [x] 5.5 テストを追加・更新
  - 各 mutation で配下キャッシュ無効化を検証

---

## Requirements Coverage

| 要件ID | サブタスク    | 備考                                  |
| ------ | ------------- | ------------------------------------- |
| 1.1    | 2.2           | subpathStrategy API 呼び出し          |
| 1.2    | 1.1           | excludedSubpaths からファイル一覧取得 |
| 1.3    | 1.1           | excludedSubpaths からフォルダ一覧取得 |
| 1.4    | 2.2           | 再帰的 API 呼び出しを行わない         |
| 1.5    | 2.1           | 新キー構造の定義                      |
| 2.1    | 2.2, 3.2, 4.5 | ファイルとフォルダを返す              |
| 2.2    | 3.1           | MoveDialog がキャッシュ共有           |
| 2.3    | 2.1, 4.2, 4.3 | queryKeys.folders 廃止                |
| 2.4    | 3.1           | 訪問済みパスでキャッシュ使用          |
| 2.5    | 4.1           | useFolderList 廃止                    |
| 3.1    | 1.1           | excludedSubpaths → フォルダ変換       |
| 3.2    | 1.2           | items → ファイル変換                  |
| 3.3    | 2.2, 3.2      | ソート機能維持                        |
| 3.4    | 3.2           | フォルダ優先表示維持                  |
| 3.5    | -             | 既存維持（StorageItem 型）            |
| 4.1    | 3.3           | useDeleteMutation 互換性              |
| 4.2    | 3.3           | useMoveMutation 互換性                |
| 4.3    | 3.3           | useRenameMutation 互換性              |
| 4.4    | 3.3, 4.3      | Mutation 無効化                       |
| 4.5    | 3.3           | useUploadMutation 互換性              |
| 5.1    | 2.2           | データ転送量削減                      |
| 5.2    | 2.2           | 不要メタデータ回避                    |
| 5.3    | 1.2           | 空配列時の動作                        |
| 5.4    | -             | 既存維持（TanStack Query キャッシュ） |
| 5.5    | 3.1           | MoveDialog キャッシュ再利用           |
| 6.1    | -             | 既存維持（TanStack Query エラー伝播） |
| 6.2    | -             | 対象外（フォールバック削除）          |
| 6.3    | -             | 既存維持（MediaBrowser エラー表示）   |
| 6.4    | -             | 既存維持（TanStack Query エラー耐性） |
| 7.1    | 1.3, 2.3      | subpathStrategy テスト                |
| 7.2    | 1.3, 2.3      | excludedSubpaths 変換テスト           |
| 7.3    | -             | 対象外（フォールバック削除）          |
| 7.4    | 3.4, 4.4      | キャッシュ共有テスト                  |
| 7.5    | 3.4           | npm run check パス                    |
| 7.6    | 3.4           | npm run check-all パス                |
