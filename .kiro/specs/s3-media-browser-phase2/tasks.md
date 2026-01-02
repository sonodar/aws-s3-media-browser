# Implementation Plan - Phase 2

## Overview

StorageBrowser を置き換えるカスタムファイルブラウザを実装する。モバイルファーストで設計し、スマートフォンでの操作性を最優先とする。

## Implementation Principles

- Amplify UI コンポーネントを可能な限り活用
- **モバイルファースト設計**（スマートフォンでの操作性を最優先）
- Amplify Storage API を使用

---

## Tasks

### 1. 基盤整備

- [x] 1.1 プロジェクト構造の整備
  - `src/components/MediaBrowser/` ディレクトリ作成
  - `src/hooks/` ディレクトリ作成
  - `src/utils/` ディレクトリ作成
  - _Requirements: 1.1_

### 2. カスタムファイルブラウザ - コア機能

- [x] 2.1 useStorage hook の実装
  - Amplify Storage API（list, getUrl）をラップ
  - ファイル一覧取得とキャッシュ
  - パス移動ナビゲーション
  - ローディング/エラー状態管理
  - _Requirements: 1.1, 1.2_

- [x] 2.2 FileList コンポーネントの実装
  - ファイル/フォルダ一覧表示（リスト形式）
  - モバイル最適化レイアウト（タップしやすい 44px 以上のターゲット）
  - フォルダタップでナビゲーション
  - 長押しまたはスワイプでコンテキストメニュー
  - _Requirements: 1.1, 1.2, 1.6_

- [x] 2.3 Header コンポーネントの実装
  - 戻るボタン（ルートまたは1つ上の階層へ）
  - アプリケーション名表示
  - サインアウトボタン
  - _Requirements: 1.1, 1.2_

### 3. カスタムファイルブラウザ - ファイル操作

- [x] 3.1 ファイルアップロード機能
  - Amplify UI FileUploader コンポーネントを使用
  - ドラッグ＆ドロップ対応（標準機能）
  - 複数ファイル選択（標準機能）
  - アップロード進捗表示（標準機能）
  - _Requirements: 1.3_

- [x] 3.2 フォルダ作成機能
  - CreateFolderDialog コンポーネント
  - フォルダ名バリデーション
  - 作成後の一覧更新
  - _Requirements: 1.5_

- [x] 3.3 ファイル削除機能
  - 削除確認ダイアログ
  - 削除後の一覧更新
  - _Requirements: 1.4_

### 4. プレビュー機能

- [x] 4.1 PreviewModal コンポーネントの実装
  - モーダルダイアログ基盤（yet-another-react-lightbox 使用）
  - 閉じるボタン
  - モーダル外タップで閉じる
  - _Requirements: 2.3_

- [x] 4.2 画像プレビュー機能
  - 画像ファイルタップでプレビュー表示
  - yet-another-react-lightbox の Zoom プラグイン使用
  - ピンチズーム対応
  - _Requirements: 2.1_

- [x] 4.3 動画プレビュー機能
  - 動画ファイルタップでプレビュー表示
  - yet-another-react-lightbox の Video プラグイン使用
  - 再生/一時停止、シーク、音量コントロール
  - _Requirements: 2.2, 2.4_

### 5. 統合とテスト

- [x] 5.1 MediaBrowser 統合
  - 全コンポーネントの統合
  - App.tsx の更新（StorageBrowser → MediaBrowser）
  - _Requirements: 1.1_

- [x] 5.2 モバイル UI テスト
  - モバイルビューポート（375x812）でのレイアウト確認
  - タップターゲットサイズ 44px 以上確認済み
  - _Requirements: 1.6_

- [x] 5.3 E2E テスト
  - 認証 → ファイル操作フロー
  - アップロード → 一覧表示確認
  - プレビュー機能確認（動画の type 属性問題を修正）

---

## Requirements Coverage Matrix

| Requirement | Tasks |
|-------------|-------|
| 1.1 ファイル一覧表示 | 2.1, 2.2, 5.1 |
| 1.2 フォルダナビゲーション | 2.1, 2.2, 2.3 |
| 1.3 ファイルアップロード | 3.1 |
| 1.4 ファイル削除 | 3.3 |
| 1.5 フォルダ作成 | 3.2 |
| 1.6 モバイルファースト | 2.2, 5.2 |
| 2.1 画像プレビュー | 4.2 |
| 2.2 動画プレビュー | 4.3 |
| 2.3 モーダル閉じる | 4.1 |
| 2.4 動画コントロール | 4.3 |

## Notes

- サムネイル機能は Phase 3 で実装予定
