# Requirements Document - Phase 2

## Introduction

本ドキュメントは、S3 メディアブラウザ Phase 2 の要件を定義する。Phase 1 で使用した StorageBrowser コンポーネントはレスポンシブ対応が不十分なため、カスタムファイルブラウザを実装する。また、サムネイル自動生成機能を追加する。

## Known Issues from Phase 1

- iPhone Safari（縦ビュー）で StorageBrowser の三点リーダメニューが開かない
- StorageBrowser のレスポンシブ対応が不十分

## Requirements

### Requirement 1: カスタムファイルブラウザ

**Objective:** As a ユーザー, I want モバイルに最適化されたファイルブラウザを使いたい, so that スマートフォンで快適にメディアを管理できる

#### Acceptance Criteria

1. When ユーザーがファイル一覧を表示した場合, the メディアブラウザ shall Amplify Storage API を使用してファイル一覧を取得・表示する
2. When ユーザーがフォルダをクリックした場合, the メディアブラウザ shall フォルダ内のファイルを表示する
3. When ユーザーがファイルをアップロードした場合, the メディアブラウザ shall ファイルを S3 にアップロードし、一覧を更新する
4. When ユーザーがファイルを削除した場合, the メディアブラウザ shall ファイルを S3 から削除し、一覧を更新する
5. When ユーザーがフォルダを作成した場合, the メディアブラウザ shall フォルダを作成し、一覧を更新する
6. The メディアブラウザ shall モバイルファーストで設計し、スマートフォンで扱いやすい UI を提供する

### Requirement 2: 画像・動画プレビュー機能

**Objective:** As a ユーザー, I want 画像や動画をプレビュー表示したい, so that ダウンロードせずに内容を確認できる

#### Acceptance Criteria

1. When ユーザーが画像ファイル（jpg, png, gif, webp）をクリックした場合, the メディアブラウザ shall モーダルダイアログで画像を表示する
2. When ユーザーが動画ファイル（mp4, webm, mov）をクリックした場合, the メディアブラウザ shall モーダルダイアログで動画プレーヤーを表示する
3. When プレビューモーダルが表示されている場合, the メディアブラウザ shall 閉じるボタンまたはモーダル外クリックで閉じられるようにする
4. When 動画プレーヤーが表示されている場合, the メディアブラウザ shall 再生/一時停止、シーク、音量調整のコントロールを提供する

## Out of Scope

以下の機能は本フェーズの対象外とする：

- 画像編集機能（トリミング、回転等）
- 動画編集機能
- ファイル共有機能
- ファイル検索機能
- オフラインサポート
- UI テーマカスタマイズ（ダークモード、ブランドカラー等）
- サムネイル自動生成（Phase 3 で対応予定）
