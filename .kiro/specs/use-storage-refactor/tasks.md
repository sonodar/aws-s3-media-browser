# Implementation Plan

## Task 1: リファクタリング前の振る舞いテスト整備

- [x] 1.1 MediaBrowser 振る舞いテストの基盤作成
  - テストファイル `MediaBrowser.test.tsx` を作成する
  - Amplify Auth（fetchAuthSession）のモック設定を行う
  - Amplify Storage（list, uploadData, remove, getUrl）のモック設定を行う
  - テスト用フィクスチャ（モック S3 アイテム一覧、認証セッション）を定義する
  - _Requirements: 8.1_

- [x] 1.2 初期表示フローの振る舞いテスト作成
  - ローディング表示からアイテム一覧表示への遷移を検証するテストを作成する
  - 認証セッション取得成功後に S3 アイテムが表示されることを確認する
  - _Requirements: 8.2_

- [x] 1.3 ナビゲーションフローの振る舞いテスト作成
  - フォルダをクリックするとパスが変更され新しいアイテム一覧が表示されることを検証する
  - 戻るボタンをクリックすると親フォルダへ遷移することを検証する
  - _Requirements: 8.3, 8.4_

- [x] 1.4 アップロード・削除フローの振る舞いテスト作成
  - ファイルドロップ後にアップロードが実行され一覧が更新されることを検証する
  - 削除ボタン → 確認 → 削除実行 → 一覧更新のフローを検証する
  - _Requirements: 8.5, 8.6_

## Task 2: 振る舞いテストによるベースライン確立

- [x] 2. 既存コードで振る舞いテストがパスすることを確認
  - Task 1 で作成した全振る舞いテストを実行する
  - 全テストがパスすることを確認し、リファクタリング前のベースラインを確立する
  - `MediaBrowser.test.tsx` だけを実行し useStorage.ts のカバレッジを確認、振る舞いテストが全機能を網羅しているか検証する
    - % だけを見るのではなく、各機能要件に対応するコードパスがテストされているかを確認する
  - カバレッジが不足している場合は Task 1 に戻ってテストを追加する
  - _Requirements: 8.1_

## Task 3: 共有型定義の抽出

- [x] 3. StorageItem 型を専用ファイルに分離
  - 複数コンポーネント・フックで共有される StorageItem 型を types ディレクトリに移動する
  - 既存の useStorage.ts からの型エクスポートを維持し、循環参照を防止する
  - _Requirements: 4.1_

## Task 4: 個別フック・ユーティリティの実装

- [x] 4.1 (P) useIdentityId フックの実装
  - Cognito 認証セッションから Identity ID を取得する独立フックを実装する
  - ローディング状態、エラー状態、identityId をオブジェクト形式で返却する
  - マウント時に一度のみ認証セッションを取得する
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 4.2 (P) useStoragePath フックの実装
  - 現在のパス状態を管理し URL クエリパラメータと同期する独立フックを実装する
  - 既存の urlSync ユーティリティを活用してパス変更を URL に反映する
  - popstate イベントでブラウザの戻る/進む操作に対応する
  - navigate 関数と goBack 関数を提供する
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 4.3 (P) useUploadTracker フックの実装
  - アップロードされたファイルのキーを追跡する独立フックを実装する
  - 指定された遅延時間（デフォルト 3 秒）後に追跡キーを自動クリアする
  - アンマウント時にタイマーをクリーンアップしてメモリリークを防止する
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 4.4 (P) parseStorageItems ユーティリティ関数の実装
  - S3 ListOutput から StorageItem 配列への変換ロジックを純粋関数として実装する
  - 現在のフォルダマーカーを除外し、直接の子要素のみを抽出する
  - フォルダの重複を排除し、フォルダ優先・名前順でソートする
  - _Requirements: 4.2, 4.3, 4.4, 4.5_

- [x] 4.5 useStorageOperations フックの実装
  - S3 ストレージ操作（list, upload, remove, createFolder, getUrl）を独立フックとして実装する
  - identityId と currentPath を引数として受け取り、基底パスを構築する
  - parseStorageItems を使用して S3 レスポンスを変換する
  - uploadFiles は並列アップロード後にアップロードしたキーを返却する
  - Task 4.4 の完了後に実施
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

## Task 5: MediaBrowser コンポーネントの統合

- [x] 5. MediaBrowser で個別フックを直接使用するよう変更
  - 既存の useStorage 呼び出しを、個別フックの直接呼び出しに置き換える
  - useIdentityId、useStoragePath、useUploadTracker、useStorageOperations を使用する
  - useStorageOperations に identityId と currentPath を引数として渡す
  - uploadFiles と trackUpload を組み合わせてアップロード処理を実装する
  - 複数フックの loading/error 状態を集約する
  - _Requirements: 6.1, 6.2, 6.3_

## Task 6: 振る舞いテストによるリグレッション検証

- [x] 6. リファクタリング後の振る舞いテスト実行
  - Task 1 で作成した全振る舞いテストを実行する
  - 全テストがパスすることでリファクタリングによるリグレッションがないことを保証する
  - テストが失敗する場合は、リファクタリング後の実装を修正する
  - _Requirements: 8.7_

## Task 7: クリーンアップと最終検証

- [x] 7.1 旧 useStorage.ts の削除
  - 既存の useStorage.ts ファイルを削除する
  - StorageItem 型の import パスを新しい types/storage.ts に更新する
  - _Requirements: 6.4_

- [x] 7.2* 個別フックのユニットテスト作成
  - useIdentityId: 認証成功/失敗/ローディング状態のテスト
  - useStoragePath: パス変更、URL 同期、popstate のテスト
  - useUploadTracker: 追跡/クリア、タイマー動作のテスト
  - useStorageOperations: 各操作のモック検証テスト
  - parseStorageItems: 変換ロジック、ソート、重複排除、境界値のテスト
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 7.3 ビルドと全テストの最終確認
  - npm run build でビルドエラーがないことを確認する
  - npm run test で全テストがパスすることを確認する
  - TypeScript 型チェックでエラーがないことを確認する
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
