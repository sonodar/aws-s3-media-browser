# Implementation Plan

セッション開始時に必ず `.kiro/steering/dev-rules.md` を読み込んでから作業してください。

## Task 1: 非推奨マーク

- [ ] 1. 削除予定コンポーネントへの @deprecated マーク付与
  - `useUploadTracker` フックに `@deprecated` JSDoc コメントを追加し、Phase 3 完了後に削除予定であることを明記
  - `ThumbnailImage` コンポーネントに `@deprecated` JSDoc コメントを追加し、新規 `Thumbnail` コンポーネントに置き換え予定であることを明記
  - 置き換え先のコンポーネント・フック名を `@see` タグで参照できるよう記載
  - _Requirements: 3.5_

## Task 2: Storage Write 操作の useMutation 実装

- [ ] 2.1 queryKeys にサムネイルキーを追加
  - `queryKeys.thumbnail(originalKey)` を追加し、サムネイル URL クエリの一意識別を可能にする
  - 既存の queryKeys パターン（型安全・as const）を踏襲
  - _Requirements: 2.2_

- [ ] 2.2 (P) アップロード用 useMutation フックの実装
  - ファイルアップロードを実行する `useUploadMutation` フックを新規作成
  - `mutationKey: ["storage", "upload"]` で一意識別
  - `isPending` で処理中状態を提供
  - `onSuccess` で `invalidateQueries` を呼び出しファイル一覧を再取得
  - `isError` と `error` オブジェクトで失敗状態を提供
  - _Requirements: 1.1, 1.2, 1.7_

- [ ] 2.3 (P) 削除用 useMutation フックの実装
  - ファイル/フォルダ削除を実行する `useDeleteMutation` フックを新規作成
  - `mutationKey: ["storage", "delete"]` で一意識別
  - `isPending` で処理中状態を提供
  - 複数アイテム削除と部分失敗の結果を返却
  - `onSuccess` で `invalidateQueries` を呼び出しファイル一覧を再取得
  - `isError` と `error` オブジェクトで失敗状態を提供
  - _Requirements: 1.3, 1.7_

- [ ] 2.4 (P) 移動用 useMutation フックの実装
  - ファイル/フォルダ移動を実行する `useMoveMutation` フックを新規作成
  - `mutationKey: ["storage", "move"]` で一意識別
  - `isPending` で処理中状態を提供
  - 進捗コールバックをサポート
  - `onSuccess` で移動元・移動先両方のクエリを無効化
  - `isError` と `error` オブジェクトで失敗状態を提供
  - _Requirements: 1.4, 1.7_

- [ ] 2.5 (P) リネーム用 useMutation フックの実装
  - ファイル/フォルダリネームを実行する `useRenameMutation` フックを新規作成
  - `mutationKey: ["storage", "rename"]` で一意識別
  - `isPending` で処理中状態を提供
  - フォルダ内コンテンツの再帰的リネームに対応
  - `onSuccess` で `invalidateQueries` を呼び出しファイル一覧を再取得
  - `isError` と `error` オブジェクトで失敗状態を提供
  - _Requirements: 1.5, 1.7_

- [ ] 2.6 (P) フォルダ作成用 useMutation フックの実装
  - フォルダ作成を実行する `useCreateFolderMutation` フックを新規作成
  - `mutationKey: ["storage", "createFolder"]` で一意識別
  - `isPending` で処理中状態を提供
  - `onSuccess` で `invalidateQueries` を呼び出しファイル一覧を再取得
  - `isError` と `error` オブジェクトで失敗状態を提供
  - _Requirements: 1.6, 1.7_

## Task 3: サムネイル URL 取得の useQuery 実装

- [ ] 3.1 サムネイル URL 取得用 useQuery フックの実装
  - サムネイル URL を取得する `useThumbnailUrl` フックを新規作成
  - `queryKey: ["thumbnail", originalKey]` で一意識別
  - `isLoading` でローディング状態を提供
  - `isError` で失敗状態を提供
  - `retry: 4` で最大 4 回のリトライを設定
  - `retryDelay` を指数バックオフ（1秒, 2秒, 4秒, 8秒）で設定
  - `staleTime: 5 * 60 * 1000` で 5 分間のキャッシュを設定
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [ ] 3.2 サムネイル表示用 Thumbnail コンポーネントの新規作成
  - `useThumbnailUrl` を使用してサムネイル URL を取得
  - ローディング中はスケルトン UI を表示
  - エラー時（リトライ超過）はフォールバックアイコンを表示
  - 成功時はサムネイル画像を表示
  - _Requirements: 2.3, 2.4_

## Task 4: 既存コンポーネントへの統合

- [ ] 4.1 useStorageOperations の useMutation フック統合
  - 既存の `useStorageOperations` 内の各操作を対応する useMutation フックで置き換え
  - 手動の `useState` フラグ管理（`isDeleting` 等）を `isPending` に置き換え
  - 操作成功後の手動キャッシュ更新を `onSuccess` での `invalidateQueries` に置き換え
  - 既存の API インターフェースとの互換性を維持
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

- [ ] 4.2 ThumbnailImage から Thumbnail への置き換え
  - `ThumbnailImage` を使用している箇所を新規 `Thumbnail` コンポーネントに置き換え
  - 既存のサムネイル表示機能が正しく動作することを確認
  - _Requirements: 3.5_

## Task 5: 互換性確認と最終検証

- [ ] 5.1 既存機能の動作確認
  - ファイルアップロード機能（重複チェック含む）の動作確認
  - ファイル選択・複数選択・一括削除機能の動作確認
  - ファイル移動・リネーム・ダウンロード機能の動作確認
  - フォルダ作成・削除・リネーム機能の動作確認
  - アップロード中の進捗表示・キャンセル機能の動作確認
  - 操作中のローディング表示の動作確認
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.6, 3.7_

- [ ] 5.2 サムネイルバグ解決の確認
  - アップロード直後のサムネイルがリトライにより自動表示されることを確認
  - サムネイル取得失敗時にフォールバックアイコンが表示されることを確認
  - 既存ファイルのサムネイルがキャッシュから即座に表示されることを確認
  - _Requirements: 2.3, 2.4, 2.5, 2.6, 3.5_

---

## Requirements Coverage

| Requirement | Task Coverage                |
| ----------- | ---------------------------- |
| 1.1         | 2.2, 4.1                     |
| 1.2         | 2.2, 4.1                     |
| 1.3         | 2.3, 4.1                     |
| 1.4         | 2.4, 4.1                     |
| 1.5         | 2.5, 4.1                     |
| 1.6         | 2.6, 4.1                     |
| 1.7         | 2.2, 2.3, 2.4, 2.5, 2.6, 4.1 |
| 2.1         | 3.1                          |
| 2.2         | 2.1, 3.1                     |
| 2.3         | 3.1, 3.2, 5.2                |
| 2.4         | 3.1, 3.2, 5.2                |
| 2.5         | 3.1, 5.2                     |
| 2.6         | 3.1, 5.2                     |
| 3.1         | 5.1                          |
| 3.2         | 5.1                          |
| 3.3         | 5.1                          |
| 3.4         | 5.1                          |
| 3.5         | 1, 4.2, 5.2                  |
| 3.6         | 5.1                          |
| 3.7         | 5.1                          |
