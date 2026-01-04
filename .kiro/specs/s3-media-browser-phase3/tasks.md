# Implementation Plan - Phase 3

## Release 1: 画像サムネイル生成 + フロントエンド表示

### Task 1: 共有ユーティリティ

- [x] 1.1 (P) pathUtils ユーティリティ作成
  - `getThumbnailPath`: `media/...` → `thumbnails/.../.thumb.jpg` 変換
  - `getOriginalPath`: 逆変換
  - `isThumbnailTarget`: 対象ファイル判定（jpg, jpeg, png, gif, webp, mp4, webm, mov）
  - バックエンド・フロントエンド双方で使用可能な純粋関数として実装
  - _Requirements: 3.3_

### Task 2: バックエンド（Lambda + S3 トリガー）

- [x] 2.0 README に Lambda Layer セットアップ手順を追記
  - SAR から Sharp Lambda Layer をデプロイする手順
  - Layer ARN を環境変数に設定する手順（ローカル / Amplify Hosting）
  - OSS ユーザー向けのコピペ可能なコマンド例
  - _Requirements: 1.1_

- [x] 2.1 Lambda 関数リソース定義
  - `defineFunction` で Lambda 関数を定義
  - Lambda Layer ARN を環境変数から読み込み
  - 環境変数未設定時は明確なエラーメッセージで例外スロー
  - タイムアウト 30 秒、メモリ 1024MB 設定
  - x86_64 アーキテクチャ指定（SAR の Sharp Layer 対応）
  - _Requirements: 1.1, 1.2_

- [x] 2.2 onUploadHandler 実装（画像サムネイル）
  - S3 ObjectCreated イベントハンドラー作成
  - Sharp による画像リサイズ（400x400、fit: inside でアスペクト比維持）
  - JPEG 形式でサムネイルを `thumbnails/` に保存
  - EXIF 情報をストリップ（プライバシー保護）
  - 動画ファイルはスキップ（Release 2 で対応）
  - _Requirements: 1.1, 1.4_

- [x] 2.3 onDeleteHandler 実装
  - S3 ObjectRemoved イベントハンドラー作成
  - 対応するサムネイルを削除（存在しない場合は冪等にスキップ）
  - _Requirements: 3.1, 3.2_

- [x] 2.4 Storage リソース更新
  - `defineStorage` の `access` に `thumbnails/{entity_id}/*` パスを追加
  - ユーザーは read のみ、Lambda は read/write/delete
  - `triggers` オプションで onUpload/onDelete に Lambda を登録
  - _Requirements: 1.3, 3.1_

- [x] 2.5 backend.ts 統合
  - thumbnailFunction をインポートして `defineBackend` に追加
  - _Requirements: 1.1_

### Task 3: フロントエンド

- [x] 3.1 (P) ThumbnailImage コンポーネント作成
  - `loading="lazy"` による遅延読み込み
  - 固定サイズコンテナ（aspect-ratio: 1/1）+ object-fit: contain でレイアウトシフト防止
  - loading → loaded | error の状態管理
  - `onError` でファイルタイプに応じたデフォルトアイコンにフォールバック
  - `initialDelay` prop でアップロード直後のサムネイル取得遅延対応
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 1.5_

- [x] 3.2 FileList コンポーネント拡張
  - ThumbnailImage を使用したサムネイル表示
  - 画像・動画ファイルにサムネイル適用
  - `recentlyUploadedKeys` に含まれるファイルには 3 秒の遅延を適用
  - 依存: 3.1 完了後
  - _Requirements: 2.1_

- [x] 3.3 useStorage フック拡張
  - `recentlyUploadedKeys` でアップロード直後のファイルを追跡
  - ファイル一覧は即時更新、サムネイルのみ 3 秒遅延で取得
  - 将来的にはイベント駆動に分離可能
  - _Requirements: 2.1_

- [ ] 3.4 タイルレイアウト実装
  - 3 カラムのグリッドレイアウトに変更
  - サムネイル中心のタイル表示に最適化
  - 削除ボタンをプレビューモーダルに移動
  - ファイル名・サイズの表示位置調整
  - _Requirements: 2.1_

### Task 4: テスト

- [x] 4.1 (P) pathUtils 単体テスト
  - パス変換ロジックの正常系・異常系テスト
  - ファイルタイプ判定のテスト
  - _Requirements: 3.3_

- [x] 4.2 ThumbnailImage 単体テスト
  - 状態遷移テスト（loading → loaded | error）
  - フォールバック表示のテスト
  - `initialDelay` prop のテスト追加
  - _Requirements: 2.1, 2.2, 2.3, 1.5_

- [ ] 4.3 E2E テスト
  - 画像アップロード → サムネイル表示確認
  - ファイル削除 → サムネイル削除確認
  - 動画アップロード → フォールバック表示確認（Release 1 では動画サムネイル未対応）
  - 依存: Task 2, Task 3 完了後
  - _Requirements: 1.1, 2.1, 3.1_

---

## Release 2: 動画サムネイル生成（後日実装）

### Task 5: FFmpeg 統合

- [ ] 5.1 FFmpeg Lambda Layer 設定
  - SAR から ffmpeg-lambda-layer をデプロイ
  - Layer ARN を環境変数 `FFMPEG_LAYER_ARN` に設定
  - resource.ts で環境変数バリデーション追加
  - _Requirements: 1.2_

- [ ] 5.2 onUploadHandler 拡張（動画サムネイル）
  - FFmpeg による動画フレーム抽出
  - blackframe フィルターで黒フレームスキップ
  - Sharp でリサイズして JPEG 形式で保存
  - _Requirements: 1.2, 1.4_

- [ ] 5.3 動画サムネイルのテスト
  - mp4, webm, mov ファイルのサムネイル生成確認
  - 黒フレームスキップの動作確認
  - _Requirements: 1.2_
