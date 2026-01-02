# Research & Design Decisions - Phase 3

## Summary
- **Feature**: `s3-media-browser-phase3`
- **Discovery Scope**: Extension（既存システムへの機能追加）
- **Key Findings**:
  - Amplify Gen2 では `defineStorage` の `triggers` オプションで S3 イベントトリガーを設定可能
  - 画像処理には Sharp ライブラリが最適（ImageMagick より 4-5 倍高速）
  - 動画サムネイル生成には FFmpeg Lambda Layer（ARM64 対応）が必要

## Research Log

### Amplify Gen2 での S3 Lambda トリガー設定
- **Context**: Phase 3 でファイルアップロード時にサムネイルを自動生成するためのトリガー機構が必要
- **Sources Consulted**:
  - [Amplify Gen2 Lambda Triggers Documentation](https://docs.amplify.aws/react/build-a-backend/storage/lambda-triggers/)
- **Findings**:
  - `defineStorage` の `triggers` オプションで `onUpload`/`onDelete` ハンドラーを定義可能
  - ハンドラーは `@types/aws-lambda` の `S3Handler` 型を使用
  - より高度なフィルタリング（prefix/suffix）は `backend.ts` で `addEventNotification` を使用
- **Implications**:
  - `media/` プレフィックスにマッチするファイルのみトリガー
  - `thumbnails/` への書き込みはトリガー対象外にする必要あり

### 画像処理ライブラリ選定
- **Context**: 画像サムネイル生成に最適なライブラリを選定
- **Sources Consulted**:
  - [Sharp npm package](https://www.npmjs.com/package/sharp)
  - [Sharp Documentation](https://sharp.pixelplumbing.com/)
- **Findings**:
  - Sharp は libvips を使用し、ImageMagick より 4-5 倍高速
  - JPEG, PNG, WebP, GIF, AVIF, TIFF をサポート
  - Lambda 環境ではネイティブバイナリの互換性に注意が必要
  - ARM64 Lambda では Sharp のプリビルドバイナリが利用可能
- **Implications**:
  - Lambda を ARM64（Graviton2）で実行することでコスト削減とパフォーマンス向上
  - Sharp はプロジェクトの依存関係として追加

### FFmpeg Lambda Layer（動画サムネイル）
- **Context**: 動画ファイルから先頭フレームを抽出してサムネイル生成
- **Sources Consulted**:
  - [serverlesspub/ffmpeg-aws-lambda-layer](https://github.com/serverlesspub/ffmpeg-aws-lambda-layer)
  - [Processing UGC with Lambda and FFmpeg](https://aws.amazon.com/blogs/media/processing-user-generated-content-using-aws-lambda-and-ffmpeg/)
- **Findings**:
  - John Van Sickle の静的ビルドが ARM64 対応
  - Lambda Layer として `/opt/bin/ffmpeg` にマウント
  - fluent-ffmpeg npm パッケージで Node.js から操作可能
  - Node.js 20/22 では Amazon Linux 2023 対応のビルドが必要
- **Implications**:
  - FFmpeg Layer を別途作成・管理する必要あり
  - 動画処理は画像処理より時間がかかるため、Lambda タイムアウトを 30 秒に設定

### サムネイル削除の連動
- **Context**: オリジナルファイル削除時にサムネイルも削除
- **Sources Consulted**: 既存の useStorage.ts 実装
- **Findings**:
  - 現在の `remove` 関数は単一ファイルのみ削除
  - サムネイル削除は Lambda トリガー（onDelete）で対応可能
  - フロントエンドでの追加実装は不要
- **Implications**:
  - `onDelete` Lambda で対応するサムネイルを削除
  - パス変換ロジック: `media/{id}/path/file.jpg` → `thumbnails/{id}/path/file.jpg.thumb.jpg`

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| S3 Event Trigger | S3 → Lambda → S3 | シンプル、Amplify Gen2 ネイティブサポート | 大量アップロード時の Lambda 同時実行数制限 | 採用 |
| Step Functions | S3 → EventBridge → Step Functions | 複雑なワークフロー対応、リトライ制御 | オーバーエンジニアリング | 不採用 |
| SQS + Lambda | S3 → SQS → Lambda | バッファリング、スケーラビリティ | 設定複雑化 | 将来的に検討 |

## Design Decisions

### Decision: S3 Event Trigger による直接 Lambda 呼び出し
- **Context**: サムネイル生成のトリガー機構を選定
- **Alternatives Considered**:
  1. S3 Event → Lambda（直接）
  2. S3 Event → EventBridge → Step Functions
  3. S3 Event → SQS → Lambda
- **Selected Approach**: S3 Event → Lambda（直接）
- **Rationale**:
  - Amplify Gen2 の `defineStorage` でネイティブサポート
  - シンプルな構成で十分な要件を満たす
  - 個人利用のため大量同時アップロードは想定外
- **Trade-offs**:
  - メリット: 設定が簡単、遅延が少ない
  - デメリット: 大量アップロード時のスケーラビリティに制限
- **Follow-up**: 将来的にアップロード量が増えた場合は SQS バッファリングを検討

### Decision: Sharp + FFmpeg による画像/動画処理
- **Context**: サムネイル生成に使用するライブラリを選定
- **Alternatives Considered**:
  1. Sharp（画像）+ FFmpeg（動画）
  2. ImageMagick（画像・動画）
  3. AWS MediaConvert（動画）
- **Selected Approach**: Sharp + FFmpeg
- **Rationale**:
  - Sharp は高速かつ Lambda 対応が良好
  - FFmpeg は動画処理のデファクトスタンダード
  - Lambda 内で完結し、追加サービス不要
- **Trade-offs**:
  - メリット: コスト効率が良い、低遅延
  - デメリット: Lambda Layer の管理が必要

### Decision: サムネイルパス構造
- **Context**: サムネイルの保存先パスを設計
- **Selected Approach**: `thumbnails/{entity_id}/.../{filename}.thumb.jpg`
- **Rationale**:
  - オリジナルファイルとの対応関係が明確
  - ユーザー分離が維持される
  - フロントエンドでのパス変換が容易

## Risks & Mitigations
- **Risk 1**: Lambda 同時実行数制限による処理遅延
  - Mitigation: 予約同時実行数の設定、将来的に SQS バッファリング
- **Risk 2**: 大きな動画ファイルでのタイムアウト
  - Mitigation: Lambda タイムアウトを 30 秒に設定、メモリを 1024MB に増加
- **Risk 3**: FFmpeg Layer のバージョン互換性
  - Mitigation: ARM64 用の最新静的ビルドを使用、Lambda Node.js 20 で動作確認

## References
- [Amplify Gen2 Lambda Triggers](https://docs.amplify.aws/react/build-a-backend/storage/lambda-triggers/) - S3 トリガー設定方法
- [Sharp Documentation](https://sharp.pixelplumbing.com/) - 画像処理 API リファレンス
- [FFmpeg Lambda Layer](https://github.com/serverlesspub/ffmpeg-aws-lambda-layer) - FFmpeg Lambda Layer プロジェクト
- [Processing UGC with Lambda and FFmpeg](https://aws.amazon.com/blogs/media/processing-user-generated-content-using-aws-lambda-and-ffmpeg/) - AWS 公式ブログ
