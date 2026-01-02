# Implementation Plan

## Overview

本タスクリストは、Amplify Gen2 と StorageBrowser コンポーネントを活用した S3 メディアブラウザの実装タスクを定義する。

### Implementation Principles

> **重要**: Amplify CLI（`npm create amplify@latest`、`npx ampx sandbox` 等）を使用して実装する。Amplify 関連ファイルを手動で作成しないこと。

- すべてのバックエンドリソースは Amplify CLI で生成
- フロントエンドは Amplify 提供コンポーネント（Authenticator, StorageBrowser）を使用
- 自前コードは設定とコンポーネント統合のみに限定

---

## Tasks

- [x] 1. プロジェクト初期化とAmplify Gen2 セットアップ

- [x] 1.1 React + TypeScript プロジェクトの作成
  - Vite を使用して React 18 + TypeScript プロジェクトを初期化
  - 必要な依存関係（aws-amplify、@aws-amplify/ui-react、@aws-amplify/ui-react-storage）をインストール
  - プロジェクト構造の確認と動作検証
  - _Requirements: 5.1_

- [x] 1.2 Amplify Gen2 バックエンドの初期化
  - `npm create amplify@latest` コマンドでAmplify バックエンドを初期化
  - amplify/ ディレクトリ構造が正しく生成されたことを確認
  - Amplify CLI が生成した設定ファイルの内容を確認
  - _Requirements: 1.1, 1.3_

- [x] 2. 認証機能のセットアップ

- [x] 2.1 Cognito 認証リソースの設定
  - Amplify CLI が生成した `amplify/auth/resource.ts` で Email ベース認証を有効化
  - User Pool の設定を確認（サインイン方法、パスワードポリシー等）
  - **セルフサインアップ無効化**: `cfnUserPool.adminCreateUserConfig.allowAdminCreateUserOnly = true` を設定
  - `npx ampx sandbox` でサンドボックス環境にデプロイして動作確認
  - _Requirements: 1.1, 1.4, 1.6, 1.7_

- [x] 2.2 Authenticator コンポーネントの統合
  - Amplify 設定を `amplify_outputs.json` から読み込み `Amplify.configure()` で初期化
  - Authenticator コンポーネントでアプリケーションをラップ
  - **hideSignUp prop**: サインアップフォームを非表示に設定
  - **ヘッダーにサインアウトボタンを配置**: `signOut` コールバックを使用
  - サインイン/サインアウト機能の動作確認
  - 未認証時のアクセスブロック動作を確認
  - 認証エラー時のメッセージ表示を確認
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.8_

- [x] 3. ストレージ機能のセットアップ

- [x] 3.1 S3 ストレージリソースの設定
  - Amplify CLI が生成した `amplify/storage/resource.ts` でストレージを設定
  - **ユーザー分離ストレージ**: `media/{entity_id}/*` パスに `allow.entity('identity')` で権限を設定
  - 各ユーザーは自分の `entity_id` ディレクトリのみアクセス可能
  - `npx ampx sandbox` でサンドボックス環境にデプロイ
  - S3 バケットが正しく作成されたことを確認
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 3.2 (P) バックエンド統合の完成
  - `amplify/backend.ts` で auth と storage を統合
  - バックエンド全体の動作確認
  - amplify_outputs.json が正しく生成されていることを確認
  - _Requirements: 1.1, 2.1_

- [x] 4. StorageBrowser コンポーネントの統合

- [x] 4.1 StorageBrowser の初期設定
  - `createAmplifyAuthAdapter` と `createStorageBrowser` を使用して StorageBrowser を構築
  - StorageBrowser スタイルシートのインポート
  - 認証済み状態で StorageBrowser が表示されることを確認
  - _Requirements: 2.1, 2.6, 5.1, 5.2_

- [x] 4.2 ファイルブラウジング機能の確認
  - ルートディレクトリの一覧表示を確認
  - フォルダナビゲーション（階層移動）の動作確認
  - パンくずリストによる親フォルダへの戻り機能を確認
  - ローディングインジケータの表示を確認
  - エラー発生時のメッセージ表示を確認
  - _Requirements: 2.1, 2.2, 2.3, 2.6, 2.7, 5.3, 5.4, 5.5_

- [x] 4.3 ファイルアップロード機能の確認
  - ファイル選択ダイアログからのアップロードを確認
  - ドラッグ＆ドロップによるアップロードを確認
  - 複数ファイルの並列アップロードを確認
  - アップロード進捗表示を確認
  - アップロード完了後の一覧自動更新を確認
  - アップロードエラー時のメッセージ表示を確認
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 4.4 (P) ファイル管理機能の確認
  - ファイル削除機能の動作確認
  - フォルダ作成機能の動作確認
  - 削除/作成後の一覧自動更新を確認
  - 削除/作成エラー時のメッセージ表示を確認
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 5. アプリケーション統合とUI調整

- [x] 5.1 アプリケーション全体の統合
  - App.tsx で Authenticator と StorageBrowser を統合
  - main.tsx で Amplify 設定と React アプリケーションを初期化
  - 認証 → ファイルブラウザ表示の一連のフローを確認
  - _Requirements: 1.1, 1.3, 2.1, 5.1_

- [x] 5.2 (P) レスポンシブデザインの確認
  - デスクトップ表示での動作確認
  - モバイル表示での動作確認
  - Amplify UI テーマが適用されていることを確認
  - _Requirements: 5.1, 5.2_

- [x] 6. E2E テストと最終検証

- [x] 6.1 認証フローのE2Eテスト
  - 新規ユーザー登録フローのテスト
  - サインイン/サインアウトフローのテスト
  - セッション維持（トークンリフレッシュ）のテスト
  - 認証エラーハンドリングのテスト
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 6.2 ファイル操作のE2Eテスト
  - ファイルアップロード → 一覧表示 → 削除の一連のフロー
  - フォルダ作成 → ファイルアップロード → 階層移動のフロー
  - 複数ファイルの並列操作テスト
  - エラーケースのテスト（ネットワークエラー等）
  - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 4.1, 4.2_

---

## Phase 1 完了

Phase 1 のすべてのタスクが完了しました（2026-01-02）。

Phase 2 では以下の機能を実装予定：
- 画像プレビュー機能
- 動画プレビュー機能
- サムネイル表示
- UI カスタマイズ（Amplify UI テーマ）

---

## Requirements Coverage Matrix

| Requirement | Tasks |
|-------------|-------|
| 1.1 サインイン実行 | 1.2, 2.1, 2.2, 5.1, 6.1 |
| 1.2 サインアウト | 2.2, 6.1 |
| 1.3 未認証時ブロック | 1.2, 2.2, 5.1, 6.1 |
| 1.4 セッション維持 | 2.1, 2.2, 6.1 |
| 1.5 認証エラー表示 | 2.2, 6.1 |
| 1.6 認証UI提供 | 2.1, 2.2 |
| 1.7 セルフサインアップ無効化 | 2.1 |
| 1.8 サインアップフォーム非表示 | 2.2 |
| 2.1 ルート一覧表示 | 4.1, 4.2, 5.1, 6.2 |
| 2.2 フォルダ内表示 | 4.2, 6.2 |
| 2.3 親フォルダ戻る | 4.2, 6.2 |
| 2.4 画像プレビュー | - (Phase 2) |
| 2.5 動画プレビュー | - (Phase 2) |
| 2.6 ローディング表示 | 4.1, 4.2 |
| 2.7 エラー表示 | 4.2 |
| 2.8 サムネイル表示 | - (Phase 2) |
| 3.1 ファイル選択アップロード | 4.3, 6.2 |
| 3.2 ドラッグ＆ドロップ | 4.3, 6.2 |
| 3.3 複数ファイル並列 | 4.3, 6.2 |
| 3.4 進捗表示 | 4.3 |
| 3.5 一覧自動更新 | 4.3 |
| 3.6 アップロードエラー | 4.3 |
| 3.7 サイズ制限 | 3.1 (Storage設定) |
| 4.1 ファイル削除 | 4.4, 6.2 |
| 4.2 フォルダ作成 | 4.4, 6.2 |
| 4.3 削除後更新 | 4.4 |
| 4.4 削除エラー | 4.4 |
| 4.5 作成エラー | 4.4 |
| 5.1 Amplify UI使用 | 1.1, 4.1, 5.1, 5.2 |
| 5.2 レスポンシブ | 4.1, 5.2 |
| 5.3 パンくずリスト | 4.2 |
| 5.4 ローディング状態 | 4.2 |
| 5.5 エラーメッセージ | 4.2 |
| 5.6 表示切替 | - (StorageBrowser標準表示のみ) |
| 6.1 ユーザー専用パス保存 | 3.1 |
| 6.2 自分のファイルのみ表示 | 3.1 |
| 6.3 Cognito Identity ID 使用 | 3.1 |

## Deferred Requirements (Phase 2)

以下の要件は Phase 2 で対応予定のため、本タスクリストには含まれない：

- 2.4 画像プレビュー
- 2.5 動画プレビュー
- 2.8 サムネイル表示
- 5.6 表示切替（グリッド/リスト）

## Notes

- すべての Amplify リソースは CLI コマンド（`npm create amplify@latest`、`npx ampx sandbox`）で生成・管理する
- 手動でのファイル作成は最小限（App.tsx、StorageBrowser.tsx、main.tsx のみ）
- StorageBrowser が提供する機能はそのまま利用し、カスタマイズは行わない
