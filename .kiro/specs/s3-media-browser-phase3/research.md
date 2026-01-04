# Research & Design Decisions - Phase 3

## Summary
- **Feature**: `s3-media-browser-phase3`
- **Discovery Scope**: Extension（既存システムへの機能追加）
- **Key Findings**:
  - **Lambda Layer 統一方式を採用**: 動画サムネイル生成に FFmpeg Layer が必須のため、画像・動画ともに Lambda Layer 方式で統一
  - `defineFunction` の `layers` オプションで Lambda Layer を参照（esbuild が自動で external 化）
  - `defineStorage.triggers` で S3 イベントトリガーを設定（Docker bundling 不要）
  - **OSS 配布対応**: Layer ARN を環境変数でパラメータ化し、ユーザーが各自のアカウントにデプロイした Layer を使用可能
  - 画像処理には Sharp Lambda Layer、動画処理には FFmpeg Lambda Layer を使用

## Research Log

### Amplify Gen2 での S3 Lambda トリガー設定（更新: 2026-01-04）
- **Context**: Phase 3 でファイルアップロード時にサムネイルを自動生成するためのトリガー機構が必要
- **Sources Consulted**:
  - [Amplify Gen2 Lambda Triggers Documentation](https://docs.amplify.aws/react/build-a-backend/storage/lambda-triggers/)
  - [Amplify Gen2 Lambda Layers Documentation](https://docs.amplify.aws/react/build-a-backend/functions/add-lambda-layers/)
  - [Amplify Gen2 Environment Variables](https://docs.amplify.aws/react/build-a-backend/functions/environment-variables-and-secrets/)
- **Findings**:
  - `defineFunction` の `layers` オプションで Lambda Layer を参照可能
  - `layers` のキーにモジュール名（例: `sharp`）を指定すると esbuild が自動で external 化
  - `defineStorage.triggers` で S3 イベントトリガーを設定（`onUpload`, `onDelete`）
  - **Docker bundling 不要**: Lambda Layer を使用すればネイティブモジュールのバンドリング問題が解消
- **Implications**:
  - `defineFunction` + `defineStorage.triggers` で完結（CDK の直接操作不要）
  - Layer ARN を環境変数で設定することで OSS 配布に対応
  - x86_64 アーキテクチャを使用（SAR の Sharp Layer が x86_64 のみ対応）

### Lambda Layer による画像・動画処理（更新: 2026-01-04）
- **Context**: Sharp + FFmpeg をどのように Lambda に提供するか
- **Sources Consulted**:
  - [SAR nodejs-sharp-lambda-layer](https://serverlessrepo.aws.amazon.com/applications/us-east-1/987481058235/nodejs-sharp-lambda-layer)
  - [SAR ffmpeg-lambda-layer](https://serverlessrepo.aws.amazon.com/applications/us-east-1/145266761615/ffmpeg-lambda-layer)
- **Findings**:
  - **Sharp Layer**: SAR から v0.34.1 (x86_64) をデプロイ可能
  - **FFmpeg Layer**: SAR からデプロイ可能、`/opt/bin/ffmpeg` にマウント
  - どちらもクロスアカウント公開 ARN はなし → 各ユーザーが自分のアカウントにデプロイ必要
  - `defineFunction` の `layers` でモジュール名をキーにすると自動 external 化
- **Implications**:
  - 動画サムネイル生成に FFmpeg Layer が必須のため、画像・動画ともに Lambda Layer 方式で統一
  - Layer ARN を環境変数でパラメータ化（`SHARP_LAYER_ARN`, `FFMPEG_LAYER_ARN`）
  - OSS ユーザーは SAR から Layer をデプロイし、環境変数に ARN を設定

### 環境変数の設定方法（更新: 2026-01-04）
- **Context**: Lambda Layer ARN をどのように設定するか
- **Sources Consulted**:
  - [Amplify Gen2 Environment Variables](https://docs.amplify.aws/react/build-a-backend/functions/environment-variables-and-secrets/)
- **Findings**:
  - **ローカル開発（sandbox）**: `export SHARP_LAYER_ARN=...` で設定後 `npx ampx sandbox` で起動
  - **Amplify Hosting**: Console → App settings → Environment variables で設定
  - `resource.ts` で環境変数の存在チェックを行い、未設定時は明確なエラーメッセージで例外スロー
- **Implications**:
  - シンプルな環境変数設定（dotenvx などのツール不要）
  - README に SAR デプロイ手順と環境変数設定手順を記載

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
| defineFunction + Layer | S3 → Lambda (Layer) → S3 | シンプル、Amplify Gen2 ネイティブ、Docker 不要 | Layer ARN の設定が必要 | **採用** |
| NodejsFunction + Docker | S3 → Lambda (Docker bundling) → S3 | ネイティブモジュールのバンドルが可能 | Docker 必須、ビルド時間増加 | 不採用 |
| Jimp (純粋 JS) | S3 → Lambda (JS のみ) → S3 | 設定不要、Docker 不要 | 動画処理非対応 | 不採用 |
| Step Functions | S3 → EventBridge → Step Functions | 複雑なワークフロー対応 | オーバーエンジニアリング | 不採用 |

## Design Decisions

### Decision: Lambda Layer + defineFunction による統一アプローチ
- **Context**: 画像・動画サムネイル生成のアーキテクチャを選定
- **Alternatives Considered**:
  1. `defineFunction` + Lambda Layer（Sharp/FFmpeg）
  2. CDK `NodejsFunction` + Docker bundling（Sharp）+ FFmpeg Layer
  3. Jimp（純粋 JS）+ FFmpeg Layer
  4. Python + Pillow + FFmpeg Layer
- **Selected Approach**: `defineFunction` + Lambda Layer（Sharp/FFmpeg）
- **Rationale**:
  - **動画サムネイルに FFmpeg Layer が必須** → Layer 方式が避けられない
  - Layer を使えば Docker bundling 不要（`layers` のキーにモジュール名を指定すると esbuild が自動 external 化）
  - `defineStorage.triggers` で S3 イベントトリガーを設定（CDK 直接操作不要）
  - OSS 配布対応: Layer ARN を環境変数でパラメータ化
- **Trade-offs**:
  - メリット: Docker 不要、Amplify Gen2 ネイティブパターン、シンプル
  - デメリット: OSS ユーザーは各自で SAR から Layer をデプロイ必要
- **Follow-up**: README に SAR デプロイ手順と環境変数設定手順を記載

### Decision: 環境変数による Layer ARN パラメータ化（OSS 配布対応）
- **Context**: OSS として配布する際に Layer ARN をどう扱うか
- **Alternatives Considered**:
  1. 環境変数で Layer ARN を設定
  2. 固定 ARN（公開 Layer を使用）
  3. CDK で Layer を動的にデプロイ
- **Selected Approach**: 環境変数で Layer ARN を設定
- **Rationale**:
  - SAR の Sharp/FFmpeg Layer はクロスアカウント公開 ARN がない
  - 各ユーザーが自分のアカウントにデプロイする必要がある
  - 環境変数なら `.env.local`（ローカル）と Amplify Console（Hosting）で設定可能
- **Trade-offs**:
  - メリット: OSS ユーザーが柔軟に Layer を選択可能
  - デメリット: 初期設定の手順が増える（SAR デプロイ + 環境変数設定）

### Decision: Sharp + FFmpeg による画像/動画処理
- **Context**: サムネイル生成に使用するライブラリを選定
- **Alternatives Considered**:
  1. Sharp（画像）+ FFmpeg（動画）
  2. ImageMagick（画像・動画）
  3. AWS MediaConvert（動画）
  4. Jimp（画像のみ、純粋 JS）
- **Selected Approach**: Sharp + FFmpeg（Lambda Layer 経由）
- **Rationale**:
  - Sharp は高速かつ Lambda 対応が良好（ImageMagick より 4-5 倍高速）
  - FFmpeg は動画処理のデファクトスタンダード
  - SAR で両方とも Layer として利用可能
- **Trade-offs**:
  - メリット: コスト効率が良い、低遅延、実績あり
  - デメリット: Layer デプロイが必要

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
- **Risk 3**: OSS ユーザーの Layer セットアップ負担
  - Mitigation: README に SAR デプロイ手順を詳細に記載、コピペ可能なコマンドを提供
- **Risk 4**: Layer ARN 未設定時のエラー
  - Mitigation: 環境変数が未設定の場合は明確なエラーメッセージを出力

## References
- [Amplify Gen2 Lambda Triggers](https://docs.amplify.aws/react/build-a-backend/storage/lambda-triggers/) - S3 トリガー設定方法（defineStorage.triggers）
- [Amplify Gen2 Lambda Layers](https://docs.amplify.aws/react/build-a-backend/functions/add-lambda-layers/) - Lambda Layer の設定方法
- [Amplify Gen2 Environment Variables](https://docs.amplify.aws/react/build-a-backend/functions/environment-variables-and-secrets/) - 環境変数の設定方法
- [SAR nodejs-sharp-lambda-layer](https://serverlessrepo.aws.amazon.com/applications/us-east-1/987481058235/nodejs-sharp-lambda-layer) - Sharp Lambda Layer（v0.34.1, x86_64）
- [SAR ffmpeg-lambda-layer](https://serverlessrepo.aws.amazon.com/applications/us-east-1/145266761615/ffmpeg-lambda-layer) - FFmpeg Lambda Layer
- [Sharp Documentation](https://sharp.pixelplumbing.com/) - 画像処理 API リファレンス
