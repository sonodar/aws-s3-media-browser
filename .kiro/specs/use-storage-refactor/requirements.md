# Requirements Document

## Introduction
本仕様は `useStorage` フックの責務分離リファクタリングに関する要件を定義する。現在の `useStorage` フックは以下の複数の責務を持ち、単一責任の原則（SRP）に違反している：

1. 認証セッションからの Identity ID 取得・保持
2. パス状態管理と URL 同期
3. S3 ストレージ操作（list, upload, remove, getUrl）
4. S3 レスポンスから StorageItem への変換・ソート・重複排除
5. アップロード追跡（recentlyUploadedKeys）

このリファクタリングにより、各責務を独立したフックまたはユーティリティに分離し、テスト容易性・再利用性・保守性を向上させる。

## Requirements

### Requirement 1: Identity ID 管理の分離
**Objective:** As a 開発者, I want 認証関連のロジックを独立したフックに分離したい, so that 認証ロジックの変更が他の機能に影響を与えないようにするため

#### Acceptance Criteria
1. When MediaBrowser コンポーネントが初期化される, the useIdentityId フック shall Cognito セッションから Identity ID を取得する
2. If 認証セッションの取得に失敗した場合, then the useIdentityId フック shall エラー状態を返却する
3. While 認証セッションを取得中, the useIdentityId フック shall ローディング状態を返却する
4. The useIdentityId フック shall Identity ID、ローディング状態、エラー状態を返却する

### Requirement 2: パス管理の分離
**Objective:** As a 開発者, I want パス状態管理と URL 同期を独立したフックに分離したい, so that ナビゲーションロジックを再利用可能にするため

#### Acceptance Criteria
1. When パスが変更される, the useStoragePath フック shall URL クエリパラメータと同期する
2. When ブラウザの戻る/進むボタンが押される, the useStoragePath フック shall popstate イベントからパスを復元する
3. When navigate 関数が呼び出される, the useStoragePath フック shall 現在のパスに指定されたフォルダ名を追加する
4. When goBack 関数が呼び出される, the useStoragePath フック shall 現在のパスから最後のセグメントを削除する
5. The useStoragePath フック shall currentPath, navigate, goBack 関数を返却する

### Requirement 3: ストレージ操作の分離
**Objective:** As a 開発者, I want S3 操作を独立したフックに分離したい, so that ストレージ操作のテストとモックが容易になるため

#### Acceptance Criteria
1. When アイテム一覧が要求される, the useStorageOperations フック shall 指定されたパスの S3 オブジェクトを取得する
2. When ファイルがアップロードされる, the useStorageOperations フック shall 指定されたパスにファイルをアップロードする
3. When アイテムが削除される, the useStorageOperations フック shall 指定されたキーの S3 オブジェクトを削除する
4. When フォルダが作成される, the useStorageOperations フック shall 空のオブジェクトをフォルダマーカーとしてアップロードする
5. When ファイル URL が要求される, the useStorageOperations フック shall 署名付き URL を返却する
6. The useStorageOperations フック shall 各操作のローディング状態とエラー状態を管理する

### Requirement 4: アイテム変換ロジックの分離
**Objective:** As a 開発者, I want S3 レスポンスから StorageItem への変換ロジックを純粋関数として分離したい, so that ユニットテストが容易になるため

#### Acceptance Criteria
1. The parseStorageItems ユーティリティ関数 shall S3 ListOutput から StorageItem 配列を生成する
2. When S3 レスポンスを変換する, the parseStorageItems ユーティリティ関数 shall 現在のフォルダマーカーを除外する
3. When S3 レスポンスを変換する, the parseStorageItems ユーティリティ関数 shall 直接の子要素のみを抽出する
4. When 同名のフォルダが複数存在する, the parseStorageItems ユーティリティ関数 shall 重複を排除する
5. The parseStorageItems ユーティリティ関数 shall フォルダを先に、その後ファイルを名前順でソートする

### Requirement 5: アップロード追跡の分離
**Objective:** As a 開発者, I want アップロード追跡ロジックを独立したフックに分離したい, so that サムネイル遅延取得の責務を明確にするため

#### Acceptance Criteria
1. When ファイルがアップロードされる, the useUploadTracker フック shall アップロードされたファイルのキーを追跡する
2. When 指定された遅延時間が経過する, the useUploadTracker フック shall 追跡中のキーをクリアする
3. The useUploadTracker フック shall 現在追跡中のキー一覧を返却する
4. When trackUpload 関数が呼び出される, the useUploadTracker フック shall 新しいキーを追跡リストに追加する

### Requirement 6: コンポーネントでのフック統合
**Objective:** As a 開発者, I want 各フックを MediaBrowser コンポーネントで直接使用したい, so that 依存関係が明示的で疎結合な設計を実現するため

#### Acceptance Criteria
1. The MediaBrowser コンポーネント shall 各独立フックを直接使用する
2. The useStorageOperations フック shall identityId と currentPath を引数として受け取る
3. The MediaBrowser コンポーネント shall uploadFiles と trackUpload を組み合わせてアップロード処理を実装する
4. The 既存の useStorage.ts ファイル shall 削除される

### Requirement 7: テスト容易性の確保
**Objective:** As a 開発者, I want 分離された各フック・ユーティリティが独立してテスト可能であることを保証したい, so that 高いテストカバレッジを達成するため

#### Acceptance Criteria
1. The useIdentityId フック shall Cognito 認証をモックしてテスト可能である
2. The useStoragePath フック shall URL 同期ロジックを独立してテスト可能である
3. The useStorageOperations フック shall Amplify Storage API をモックしてテスト可能である
4. The parseStorageItems ユーティリティ関数 shall 純粋関数としてユニットテスト可能である
5. The useUploadTracker フック shall タイマーをモックしてテスト可能である

### Requirement 8: リファクタリング前の振る舞いテスト整備
**Objective:** As a 開発者, I want リファクタリング前に MediaBrowser の振る舞いテストを整備したい, so that リファクタリング後もユーザー視点での機能が正しく動作することを検証できるため

#### Why: 振る舞いテストを採用する理由
本リファクタリングでは `useStorage` フックの内部構造を大幅に変更する（単一フック → 4つの独立フック + 1ユーティリティ）。この際、以下の理由から **フックの内部実装ではなく、外部から観測可能な振る舞い** をテスト対象とする:

1. **内部実装の変更に対する耐性**: フックの分離・統合方法が変わっても、振る舞いテストは書き換え不要
2. **リファクタリングの安全網**: 同じテストがリファクタリング前後でパスすれば、外部から見た動作が維持されていることを保証
3. **テスト対象の明確化**: 今回変更するフック群（useIdentityId, useStoragePath, useStorageOperations, useUploadTracker）が連携して実現する振る舞いを検証
4. **個別コンポーネントとの責務分離**: Header, FileList, ThumbnailImage は既存の単体テストでカバー済み。振る舞いテストはフック連携に起因するフローを検証

#### Acceptance Criteria
1. Before リファクタリングを開始する, the MediaBrowser コンポーネント shall 振る舞いテストが整備されている
2. The MediaBrowser 振る舞いテスト shall 初期表示時にローディング→アイテム一覧表示の遷移を検証する（useIdentityId + useStorageOperations 連携）
3. The MediaBrowser 振る舞いテスト shall フォルダクリック→パス変更→新しいアイテム一覧表示のフローを検証する（useStoragePath + useStorageOperations 連携）
4. The MediaBrowser 振る舞いテスト shall 戻るボタン→親フォルダへの遷移を検証する（useStoragePath 連携）
5. The MediaBrowser 振る舞いテスト shall ファイルドロップ→アップロード→一覧更新のフローを検証する（useStorageOperations + useUploadTracker 連携）
6. The MediaBrowser 振る舞いテスト shall 削除ボタン→確認→削除→一覧更新のフローを検証する（useStorageOperations 連携）
7. After リファクタリングが完了した, the MediaBrowser 振る舞いテスト shall 全テストがパスする
