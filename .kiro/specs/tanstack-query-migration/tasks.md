# Implementation Plan

セッション開始時に必ず `.kiro/steering/dev-rules.md` を読み込んでから作業してください。

## Tasks

### Phase 2-1: 基盤 + Auth

- [x] 1. TanStack Query 基盤の構築
- [x] 1.1 パッケージのインストールと QueryClient 設定
  - @tanstack/react-query と @tanstack/react-query-devtools をインストールする
  - デフォルトのキャッシュオプション（staleTime: 5分、gcTime: 30分、retry: 3、refetchOnWindowFocus: false）を定義する
  - 開発環境用の ReactQueryDevtools を設定する（本番ビルドから除外）
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 1.2 QueryProvider の作成と Provider 階層への統合
  - QueryClientProvider をラップする QueryProvider コンポーネントを作成する
  - JotaiProvider の内側に QueryProvider を配置する
  - TanStack Query（サーバー状態）と Jotai（クライアント状態）の責務分離を維持する
  - _Requirements: 1.1, 1.5_

- [x] 1.3 queryKeys ファクトリの作成
  - ドメインごとの queryKey パターンを定義する（identityId, items, folders, previewUrls, passkeys）
  - as const で型安全性を確保する
  - invalidateQueries でプレフィックスマッチが可能な構造にする
  - _Requirements: 2.2, 3.2, 4.2, 5.2, 6.1_

- [x] 2. 認証状態の TanStack Query 化
- [x] 2.1 useIdentityId フックの実装
  - useQuery で Cognito 認証セッションから Identity ID を取得する
  - staleTime: Infinity でセッション中のキャッシュを維持する
  - isLoading / isError で状態を返却する
  - _Requirements: 2.1, 2.2_

- [x] 2.2 既存の useIdentityId を置換
  - 既存の useState + useEffect パターンを useQuery ベースに置換する
  - 既存コードとの互換性のため同じインターフェース（identityId, loading, error）を維持
  - エラー時は isError でエラー状態を検出しエラー UI を表示する
  - _Requirements: 2.3, 2.4_

- [x] 3. パスキー管理の TanStack Query 化
- [x] 3.1 usePasskeyCredentials フックの実装
  - useQuery で WebAuthn クレデンシャル一覧を取得する
  - ページネーション（nextToken）を処理して全件取得する
  - 既存の toWebAuthnCredential 変換関数を再利用する
  - _Requirements: 6.1_

- [x] 3.2 (P) useRegisterPasskey フックの実装
  - useMutation で associateWebAuthnCredential を実行する
  - 成功時に invalidateQueries でクレデンシャル一覧を再取得する
  - isPending / isError で状態を返却する
  - _Requirements: 6.2_

- [x] 3.3 (P) useDeletePasskey フックの実装
  - useMutation で deleteWebAuthnCredential を実行する
  - 成功時に invalidateQueries でクレデンシャル一覧を再取得する
  - credentialId をパラメータとして受け取る
  - _Requirements: 6.3_

- [x] 3.4 既存の usePasskey を完全置換
  - usePasskeyCredentials, useRegisterPasskey, useDeletePasskey を統合するフックを作成する
  - PasskeySettings コンポーネントを新しいフックを使用するよう更新する
  - 既存のパスキー管理機能の動作を維持する
  - _Requirements: 6.4, 7.10_

### Phase 2-2: Storage Read

- [ ] 4. ストレージ一覧取得の TanStack Query 化
- [ ] 4.1 useStorageItems フックの実装
  - useQuery で現在のパスにあるファイル/フォルダ一覧を取得する
  - queryKey に identityId と currentPath を含める
  - enabled: !!identityId で identityId 取得まで待機する
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 4.2 useStorageOperations の Read 部分置換
  - 既存の fetchItems ロジック（useState + useEffect）を useStorageItems に置換する
  - ファイル操作後は invalidateQueries でファイル一覧を再取得する
  - Write 操作（upload, delete, move, rename, createFolder）は既存のまま維持する
  - _Requirements: 3.4, 3.5_

### Phase 2-3: Storage UI

- [ ] 5. フォルダ選択の TanStack Query 化
- [ ] 5.1 (P) useFolderList フックの実装
  - useQuery で指定パスのフォルダ一覧を取得する
  - queryKey に identityId と path を含める
  - フォルダのみをフィルタリングして返す（isFolder: true）
  - _Requirements: 4.1, 4.2, 4.3_

- [ ] 5.2 FolderBrowser コンポーネントの置換
  - 既存の useEffect + useState を useFolderList に置換する
  - MoveDialog が開いているときのみ enabled: true にする
  - ローディング中は isLoading でローディング UI を表示する
  - _Requirements: 4.4_

- [ ] 6. プレビュー URL の TanStack Query 化
- [ ] 6.1 (P) usePreviewUrls フックの実装
  - useQuery でプレビュー対象アイテムの署名付き URL を並列取得する
  - queryKey にアイテムキーを含める
  - Lightbox 用の Slide 配列を返す（画像/動画の type 変換含む）
  - staleTime: 10分（署名付き URL の有効期限を考慮）
  - _Requirements: 5.1, 5.2, 5.3_

- [ ] 6.2 PreviewModal コンポーネントの置換
  - 既存の useEffect + useState を usePreviewUrls に置換する
  - プレビューモーダルが開いているときのみ enabled: true にする
  - ローディング中は isLoading でローディング UI を表示する
  - _Requirements: 5.4_

### Phase 2-4: 互換性確認

- [ ] 7. 既存機能の互換性確認とテスト
- [ ] 7.1 コア機能の動作確認
  - ファイル/フォルダの一覧表示が正常に動作することを確認する
  - ファイルのアップロード（重複チェック含む）が正常に動作することを確認する
  - アップロード後に invalidateQueries でファイル一覧が更新されることを確認する
  - _Requirements: 7.1, 7.2_

- [ ] 7.2 (P) 選択・削除機能の動作確認
  - ファイルの選択・複数選択が正常に動作することを確認する
  - 一括削除が正常に動作することを確認する
  - 削除後に invalidateQueries でファイル一覧が更新されることを確認する
  - _Requirements: 7.3_

- [ ] 7.3 (P) 移動・リネーム・ダウンロード機能の動作確認
  - ファイルの移動が正常に動作することを確認する
  - ファイルのリネームが正常に動作することを確認する
  - ファイルのダウンロードが正常に動作することを確認する
  - 操作後に invalidateQueries でファイル一覧が更新されることを確認する
  - _Requirements: 7.4_

- [ ] 7.4 (P) プレビュー・ナビゲーション機能の動作確認
  - サムネイル表示が正常に動作することを確認する
  - Lightbox によるメディアプレビューが正常に動作することを確認する
  - URL 同期によるフォルダナビゲーション（リロード・戻る/進む）が正常に動作することを確認する
  - _Requirements: 7.5, 7.6, 7.7_

- [ ] 7.5 (P) ソート・ジェスチャー・パスキー機能の動作確認
  - ソート機能（設定永続化含む）が正常に動作することを確認する
  - ジェスチャー操作（長押し、スワイプ）が正常に動作することを確認する
  - パスキー管理機能が正常に動作することを確認する
  - _Requirements: 7.8, 7.9, 7.10_

- [ ]\* 7.6 (P) 単体テストの作成
  - useIdentityId の単体テストを作成する（認証セッション取得のモック、エラー時の動作）
  - useStorageItems の単体テストを作成する（依存クエリの動作、リスト変換ロジック）
  - usePasskeyCredentials の単体テストを作成する（ページネーション処理、データ変換）
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10_

## Requirements Coverage

| Requirement | Tasks    |
| ----------- | -------- |
| 1.1         | 1.1, 1.2 |
| 1.2         | 1.1      |
| 1.3         | 1.1      |
| 1.4         | 1.1      |
| 1.5         | 1.2      |
| 2.1         | 2.1      |
| 2.2         | 1.3, 2.1 |
| 2.3         | 2.2      |
| 2.4         | 2.2      |
| 3.1         | 4.1      |
| 3.2         | 1.3, 4.1 |
| 3.3         | 4.1      |
| 3.4         | 4.2      |
| 3.5         | 4.2      |
| 4.1         | 5.1      |
| 4.2         | 1.3, 5.1 |
| 4.3         | 5.1      |
| 4.4         | 5.2      |
| 5.1         | 6.1      |
| 5.2         | 1.3, 6.1 |
| 5.3         | 6.1      |
| 5.4         | 6.2      |
| 6.1         | 1.3, 3.1 |
| 6.2         | 3.2      |
| 6.3         | 3.3      |
| 6.4         | 3.4      |
| 7.1         | 7.1      |
| 7.2         | 7.1      |
| 7.3         | 7.2      |
| 7.4         | 7.3      |
| 7.5         | 7.4      |
| 7.6         | 7.4      |
| 7.7         | 7.4      |
| 7.8         | 7.5      |
| 7.9         | 7.5      |
| 7.10        | 3.4, 7.5 |
