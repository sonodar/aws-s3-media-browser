# Implementation Plan - Phase 3

## Release 1: 画像サムネイル + 動画フォールバック

### Task 1: 基盤整備

- [ ] 1.1 pathUtils ユーティリティ作成
  - `getThumbnailPath`: `media/...` → `thumbnails/.../.thumb.jpg` 変換
  - `getOriginalPath`: 逆変換
  - `isThumbnailTarget`: 対象ファイル判定（jpg, jpeg, png, gif, webp, mp4, webm, mov）
  - _Requirements: 3.3_

- [ ] 1.2 Storage アクセス設定の更新
  - `thumbnails/{entity_id}/*` への read 権限追加
  - _Requirements: 1.3_

### Task 2: バックエンド（Lambda）

- [ ] 2.1 onUploadHandler 実装（画像サムネイル）
  - S3 ObjectCreated イベントハンドラー作成
  - Sharp による画像リサイズ（400x400、fit: inside）
  - サムネイルを `thumbnails/` に保存
  - 動画ファイルはスキップ（フォールバック対応）
  - _Requirements: 1.1, 1.4_

- [ ] 2.2 onDeleteHandler 実装
  - S3 ObjectRemoved イベントハンドラー作成
  - 対応するサムネイルを削除
  - _Requirements: 3.1, 3.2_

- [ ] 2.3 Storage トリガー設定
  - `defineStorage` の `triggers` オプションで Lambda 登録
  - `media/` プレフィックスのみトリガー
  - _Requirements: 1.1, 3.1_

### Task 3: フロントエンド

- [ ] 3.1 ThumbnailImage コンポーネント作成
  - `loading="lazy"` による遅延読み込み
  - 固定サイズコンテナ（aspect-ratio: 1/1）+ object-fit: contain
  - `onError` でデフォルトアイコンにフォールバック
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 1.5_

- [ ] 3.2 FileList コンポーネント拡張
  - ThumbnailImage を使用したサムネイル表示
  - 画像・動画ファイルにサムネイル適用
  - _Requirements: 2.1_

- [ ] 3.3 useStorage 拡張
  - アップロード完了後 3秒待機してからリスト更新
  - _Requirements: 2.1_

### Task 4: テストとデプロイ

- [ ] 4.1 単体テスト
  - pathUtils のパス変換テスト
  - ファイルタイプ判定テスト
  - _Requirements: 3.3_

- [ ] 4.2 E2E テスト
  - 画像アップロード → サムネイル表示確認
  - ファイル削除 → サムネイル削除確認
  - 動画アップロード → フォールバック表示確認
  - _Requirements: 1.1, 2.1, 3.1_

- [ ] 4.3 デプロイと動作確認
  - sandbox 環境へデプロイ
  - 画像サムネイル生成の動作確認
  - 動画フォールバック表示の確認

- [ ] 4.4 レイテンシ計測（ユーザー作業）
  - CloudWatch Logs で Lambda 実行時間を計測
  - 計測結果に基づいて useStorage の待機秒数（現在3秒）を調整
  - _Note: 実装者は CloudWatch Logs でのログ出力を確実に行うこと_

---

## Release 2: 動画サムネイル生成（後日実装）

### Task 5: FFmpeg Lambda Layer

- [ ] 5.1 FFmpeg Lambda Layer 作成
  - ARM64 用静的ビルドを取得
  - Lambda Layer としてデプロイ
  - _Requirements: 1.2_

- [ ] 5.2 onUploadHandler 拡張（動画サムネイル）
  - FFmpeg による動画フレーム抽出
  - blackframe フィルターで黒フレームスキップ
  - Sharp でリサイズしてサムネイル保存
  - _Requirements: 1.2, 1.4_

- [ ] 5.3 動画サムネイルのテスト
  - mp4, webm, mov ファイルのサムネイル生成確認
  - 黒フレームスキップの動作確認
  - _Requirements: 1.2_
