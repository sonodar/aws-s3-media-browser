# Implementation Plan

## Task 1: validateItemName.ts の作成

validateRename.ts から共通バリデーションロジックを抽出し、validateItemName.ts にリネーム。

- [ ] 1.1 validateRename.ts を validateItemName.ts にリネーム
  - `src/utils/validateRename.ts` → `src/utils/validateItemName.ts`
  - `src/utils/validateRename.test.ts` → `src/utils/validateItemName.test.ts`
  - git mv コマンドで履歴を保持
  - リネームのみでコミット（内容変更前にコミットしないと履歴が消える）
  - _Requirements: 3.1_

- [ ] 1.2 validateItemName 関数の実装
  - 基本バリデーション（空文字、スラッシュ、長さ）のみを残す
  - validateRename 関数と ValidateRenameOptions は削除
  - ValidationResult インターフェースは維持
  - _Requirements: 1.1, 2.3, 3.1_

- [ ] 1.3 validateItemName.test.ts の更新
  - 基本バリデーションのテストのみを残す
  - validateRename 固有のテスト（同一名チェック、重複チェック）は削除
  - _Requirements: 3.1_

## Task 2: RenameDialog のリファクタリング

validateRename ロジックを RenameDialog 内に移動。

- [ ] 2.1 RenameDialog に validateRename 関数を追加
  - コンポーネント内にローカル関数として実装
  - validateItemName をインポートして基本チェックに使用
  - 同一名チェック、重複チェックのロジックを追加
  - インポートパスを `validateItemName` に変更
  - _Requirements: -_

- [ ] 2.2 RenameDialog.test.tsx の更新（存在する場合）
  - validateRename のテストがある場合はコンポーネントテストに統合
  - _Requirements: -_

## Task 3: CreateFolderDialog の機能追加

CreateFolderDialog に重複チェック機能を実装。

- [ ] 3.1 CreateFolderDialog の props 拡張
  - `existingItems: StorageItem[]` props を追加
  - StorageItem 型をインポート
  - _Requirements: 2.2_

- [ ] 3.2 validateNewFolderName 関数の実装
  - コンポーネント内にローカル関数として実装
  - validateItemName をインポートして基本チェックに使用
  - フォルダタイプのみを対象に重複チェックを実装
  - エラーメッセージ: 「同じ名前のフォルダが既に存在します」
  - _Requirements: 1.1, 1.2, 2.1, 2.3, 3.2_

- [ ] 3.3 handleSubmit のバリデーション更新
  - 既存の validateFolderName を validateNewFolderName に置き換え
  - existingItems を引数に渡す
  - _Requirements: 1.3, 1.4_

- [ ] 3.4 CreateFolderDialog.test.tsx の更新
  - existingItems props を渡すようにテストを修正
  - 重複フォルダ名検出のテストを追加
  - ファイル名との重複を許可するテストを追加
  - 大文字・小文字区別のテストを追加
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.3_

## Task 4: MediaBrowser の統合

MediaBrowser から CreateFolderDialog に existingItems を渡す。

- [ ] 4.1 MediaBrowser の CreateFolderDialog 呼び出し箇所を特定
  - Grep で CreateFolderDialog の使用箇所を確認
  - _Requirements: 2.2_

- [ ] 4.2 existingItems props の追加
  - useStorageItems から取得した items を CreateFolderDialog に渡す
  - _Requirements: 2.2_

- [ ] 4.3 最終検証
  - `npm run check-all` で全体検証
  - _Requirements: -_
