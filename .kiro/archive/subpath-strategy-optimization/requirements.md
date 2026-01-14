# Requirements Document

## Introduction

現在のメディアブラウザでは、フォルダ内のファイル一覧を表示する際に `list({ options: { listAll: true } })` を使用しており、パス配下のすべてのファイル（サブフォルダ内のファイルを含む）を取得している。これは深い階層や多数のファイルがある場合に非効率であり、パフォーマンスとコストの両面で問題がある。

AWS Amplify Storage API の `subpathStrategy: { strategy: 'exclude' }` オプションを使用することで、現在のパス直下のファイルのみを取得し、サブフォルダは `excludedSubpaths` として別途取得できる。これにより API レベルでのフィルタリングが可能になり、効率的なファイル取得が実現できる。

### TanStack Query導入後の技術的コンテキスト

本プロジェクトではTanStack Query v5を導入済みであり、以下の構造でストレージ操作を管理している：

- **useStorageItems**: パス単位でファイル/フォルダ一覧を取得するQuery Hook
- **useFolderList**: MoveDialog用にフォルダ一覧を取得するQuery Hook（useStorageItemsと重複したAPI呼び出し）
- **queryKeys.items / queryKeys.folders**: 別々のキャッシュキー（同じパスで重複キャッシュ）

### 本最適化の方針

1. **subpathStrategy: 'exclude'** を使用してAPIレベルでファイルとフォルダを分離
2. **items と folders のキャッシュを統合**し、queryKeys.items のみを使用
3. MoveDialog は useStorageItems のキャッシュを共有（重複API呼び出しを排除）

### 技術的考慮事項

S3には2種類のフォルダ表現が存在し、設計時に一貫した扱いを考慮する必要がある：

1. **明示的フォルダ**: `photos/` のような0バイトのスラッシュオブジェクト
2. **暗黙的フォルダ**: `photos/image.jpg` のようにサブパス配下にファイルがあるだけ（フォルダオブジェクト自体は存在しない）

フォルダの検出、作成、削除、移動、リネームなど各操作において、両方のケースで正しく動作することを確認すること。

## Requirements

### Requirement 1: サブパス戦略によるAPI最適化

**Objective:** As a ユーザー, I want 現在のフォルダ直下のファイルのみを効率的に取得したい, so that 大量のファイルがある環境でも高速にブラウジングできる

#### Acceptance Criteria

1. When ユーザーがフォルダを表示する, the useStorageItems Hook shall `subpathStrategy: { strategy: 'exclude' }` オプションを使用してAmplify Storage APIを呼び出す
2. When API レスポンスを受信する, the useStorageItems Hook shall `items` から現在パス直下のファイル一覧を取得する
3. When API レスポンスを受信する, the useStorageItems Hook shall `excludedSubpaths` からサブフォルダ一覧を取得する
4. The useStorageItems Hook shall サブフォルダ内のファイルを取得するための再帰的な API 呼び出しを行わない
5. The queryKeys.items() shall 現在のキー構造 `["items", identityId, path]` を維持する

### Requirement 2: キャッシュ統合によるAPI呼び出し削減

**Objective:** As a ユーザー, I want 同じフォルダへのアクセスでAPIが重複呼び出しされない, so that レスポンスが高速化される

#### Acceptance Criteria

1. The useStorageItems Hook shall ファイルとフォルダの両方を含む StorageItem[] を返す
2. The MoveDialog shall useStorageItems のキャッシュを共有し、フォルダのみをフィルタして使用する
3. The queryKeys.folders shall 廃止し、queryKeys.items に統合する
4. When MediaBrowser でパスを訪問済みの場合, the MoveDialog shall API呼び出しなしでキャッシュからフォルダ一覧を取得する
5. The useFolderList Hook shall useStorageItems のデータをフィルタするラッパーとして実装する、または廃止する

### Requirement 3: フォルダ構造の正確な表示

**Objective:** As a ユーザー, I want フォルダとファイルが正しく区別されて表示されてほしい, so that ナビゲーションが直感的に行える

#### Acceptance Criteria

1. When `excludedSubpaths` にサブパスが含まれる, the useStorageItems Hook shall それらをフォルダ型のStorageItemに変換する
2. When `items` にファイルが含まれる, the useStorageItems Hook shall それらをファイル型のStorageItemに変換する
3. The MediaBrowser shall 既存のソート機能（名前順、日付順、サイズ順）を維持する
4. The MediaBrowser shall フォルダを先に、ファイルを後に表示する既存の動作を維持する
5. The StorageItem型 shall `type: 'folder' | 'file'` プロパティを含む

### Requirement 4: 既存機能との互換性

**Objective:** As a ユーザー, I want 既存のファイル操作機能が引き続き正常に動作してほしい, so that 日常のワークフローが中断されない

#### Acceptance Criteria

1. The useDeleteMutation shall フォルダ削除時には引き続き `listAll: true` で全ファイルを取得し、再帰的に削除する
2. The useMoveMutation shall フォルダ移動時には引き続き `listAll: true` で全ファイルを取得し、再帰的に移動する
3. The useRenameMutation shall フォルダリネーム時には引き続き `listAll: true` で全ファイルを取得し、再帰的にリネームする
4. The Mutation Hooks shall 操作後に queryKeys.items を無効化する（queryKeys.folders の無効化は不要になる）
5. The useUploadMutation および useCreateFolderMutation shall 既存動作を維持する

### Requirement 5: パフォーマンス改善

**Objective:** As a ユーザー, I want フォルダ表示が高速化されてほしい, so that ストレスなくブラウジングできる

#### Acceptance Criteria

1. When 多数のサブフォルダとファイルが存在するパスを表示する, the useStorageItems Hook shall 従来より少ないデータ転送量でファイル一覧を取得する
2. The useStorageItems Hook shall 不要なファイルメタデータ（サブフォルダ内のファイル情報）の取得を回避する
3. If `excludedSubpaths` が空配列の場合, the useStorageItems Hook shall フォルダなしとして正常に動作する
4. The TanStack Query shall パス単位のキャッシュを維持し、同じパスへの再訪問時は即座に表示する
5. When MoveDialog を開く, the FolderBrowser shall 訪問済みパスのキャッシュを再利用する

### Requirement 6: エラーハンドリング

**Objective:** As a ユーザー, I want API エラー時に適切なフィードバックを受けたい, so that 問題を認識して対処できる

#### Acceptance Criteria

1. If API 呼び出しが失敗した場合, the useStorageItems Hook shall Query のエラー状態（isError, error）を通じてエラーを伝播する
2. If `subpathStrategy` オプションがサポートされていない環境の場合, the useStorageItems Hook shall 従来の `listAll: true` 方式にフォールバックする
3. The MediaBrowser shall Query のエラー状態を検知し、エラーメッセージを表示する
4. The TanStack Query shall エラー発生時もアプリケーションがクラッシュせず操作可能な状態を維持する

### Requirement 7: テスト要件

**Objective:** As a 開発者, I want 実装変更が既存機能を壊していないことを確認したい, so that 安全にリファクタリングできる

#### Acceptance Criteria

1. The useStorageItems.test.ts shall `subpathStrategy: 'exclude'` を使用したAPI呼び出しをテストする
2. The useStorageItems.test.ts shall `excludedSubpaths` からフォルダ一覧への変換をテストする
3. The useStorageItems.test.ts shall フォールバック動作をテストする
4. The MoveDialog テスト shall キャッシュ共有が正しく動作することをテストする
5. When `npm run check` を実行する, the テストスイート shall 全テストがパスする
6. When `npm run check-all` を実行する, the ビルド shall TypeScriptエラーなしで完了する
