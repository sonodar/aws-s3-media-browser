# AWS S3 Photo Browser

AWS Amplify を活用した写真・動画ブラウザアプリケーション。ユーザーごとに独立したストレージ空間を提供し、メディアファイルの閲覧・管理を可能にします。

## Features

- **認証ベースアクセス制御**: Cognito 認証でユーザーごとに隔離されたストレージを提供
- **メディアブラウジング**: S3 に保存されたファイル/フォルダの階層的なナビゲーション
- **ファイル操作**: アップロード、ダウンロード、削除、フォルダ作成
- **メディアプレビュー**: 画像・動画のインラインプレビュー（Lightbox）
- **サムネイル自動生成**: アップロード時に画像・動画のサムネイルを自動生成

## Tech Stack

| カテゴリ | 技術 |
|----------|------|
| Language | TypeScript 5.x (strict mode) |
| Frontend | React 19 + Vite |
| Backend | AWS Amplify Gen2 |
| Auth | Amazon Cognito |
| Storage | Amazon S3 |
| Testing | Vitest + Testing Library |

## Prerequisites

- Node.js 20+
- npm
- AWS CLI（デプロイ用）
- AWS アカウント

## Lambda Layer Setup (サムネイル生成用)

サムネイル自動生成機能を使用するには、Sharp Lambda Layer をデプロイする必要があります。

### 1. Sharp Lambda Layer のデプロイ

[cbschuld/sharp-aws-lambda-layer](https://github.com/cbschuld/sharp-aws-lambda-layer) から Sharp Layer をデプロイします:

```bash
# Layer zip をダウンロード (ARM64 / Node.js 22 対応)
curl -L -o sharp-layer.zip \
  https://github.com/cbschuld/sharp-aws-lambda-layer/releases/latest/download/release-arm64.zip

# Lambda Layer として発行
aws lambda publish-layer-version \
  --layer-name sharp \
  --description "Sharp image processing library for Lambda (arm64)" \
  --zip-file fileb://sharp-layer.zip \
  --compatible-runtimes nodejs22.x nodejs20.x nodejs18.x \
  --compatible-architectures arm64 \
  --region ap-northeast-1

# クリーンアップ
rm sharp-layer.zip
```

> **Note**: x86_64 アーキテクチャを使用する場合は、`release-x64.zip` をダウンロードし、`--compatible-architectures x86_64` に変更してください。

### 2. Layer ARN の取得

デプロイ完了後、出力された `LayerVersionArn` を使用します。または以下のコマンドで取得できます:

```bash
aws lambda list-layer-versions \
  --layer-name sharp \
  --query 'LayerVersions[0].LayerVersionArn' \
  --output text \
  --region ap-northeast-1
```

### 3. 環境変数の設定

取得した Layer ARN を環境変数に設定します。

**ローカル開発（sandbox）**:

```bash
export SHARP_LAYER_ARN=arn:aws:lambda:ap-northeast-1:123456789012:layer:sharp:1
npx ampx sandbox
```

**Amplify Hosting**:

1. Amplify Console → App settings → Environment variables
2. `SHARP_LAYER_ARN` を追加し、Layer ARN を設定

### 4. FFmpeg Layer のデプロイ（動画サムネイル生成用）

動画サムネイル生成を有効にする場合は、FFmpeg Layer も必要です。

[John Van Sickle の FFmpeg 静的ビルド](https://johnvansickle.com/ffmpeg/) を使用して ARM64 対応の Layer を作成します:

```bash
# 作業ディレクトリを作成
mkdir -p ffmpeg-layer/bin && cd ffmpeg-layer

# FFmpeg 静的バイナリをダウンロード (arm64)
curl -L -o ffmpeg.tar.xz \
  https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-arm64-static.tar.xz

# 展開して必要なバイナリを配置
tar -xf ffmpeg.tar.xz
cp ffmpeg-*-arm64-static/ffmpeg bin/
cp ffmpeg-*-arm64-static/ffprobe bin/
chmod +x bin/*

# Layer 用の zip を作成
zip -r ../ffmpeg-layer.zip bin/

# Lambda Layer として発行
cd ..
aws lambda publish-layer-version \
  --layer-name ffmpeg \
  --description "FFmpeg static binary for Lambda (arm64)" \
  --zip-file fileb://ffmpeg-layer.zip \
  --compatible-runtimes nodejs22.x nodejs20.x nodejs18.x \
  --compatible-architectures arm64 \
  --region ap-northeast-1

# クリーンアップ
rm -rf ffmpeg-layer ffmpeg-layer.zip
```

> **Note**: x86_64 アーキテクチャを使用する場合は、`ffmpeg-release-amd64-static.tar.xz` をダウンロードし、`--compatible-architectures x86_64` に変更してください。

### 5. FFmpeg Layer ARN の設定

```bash
# Layer ARN を取得
aws lambda list-layer-versions \
  --layer-name ffmpeg \
  --query 'LayerVersions[0].LayerVersionArn' \
  --output text \
  --region ap-northeast-1
```

**ローカル開発（sandbox）**:

```bash
export FFMPEG_LAYER_ARN=arn:aws:lambda:ap-northeast-1:123456789012:layer:ffmpeg:1
npx ampx sandbox
```

**Amplify Hosting**:

1. Amplify Console → App settings → Environment variables
2. `FFMPEG_LAYER_ARN` を追加し、Layer ARN を設定

> **Note**: Sharp Layer、FFmpeg Layer、Lambda 関数はすべて同じアーキテクチャ（arm64）を使用します。FFmpeg は `/opt/bin/ffmpeg` にマウントされます。

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Amplify

```bash
npx ampx sandbox
```

### 3. Start development server

```bash
npm run dev
```

## Available Scripts

| コマンド | 説明 |
|----------|------|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | プロダクションビルド |
| `npm run preview` | ビルドプレビュー |
| `npm run test` | テスト実行 |
| `npm run test:watch` | テストウォッチモード |

## Project Structure

```
├── amplify/              # Amplify Gen2 バックエンド定義
│   ├── auth/             # 認証リソース
│   ├── storage/          # ストレージリソース
│   └── backend.ts        # エントリポイント
├── src/
│   ├── components/       # 機能単位のコンポーネント
│   │   └── MediaBrowser/ # メディアブラウザ機能
│   ├── hooks/            # カスタムフック
│   ├── utils/            # ユーティリティ関数
│   └── App.tsx           # アプリケーションルート
└── .kiro/                # 仕様・設計ドキュメント
```

## Architecture

### Authentication

- Amazon Cognito によるユーザー認証
- セルフサインアップ無効化（管理者のみがユーザー作成可能）

### Storage

- S3 バケットにメディアファイルを保存
- Identity ID ベースのアクセス制御でユーザー間のデータを完全分離
- パス構造: `media/{identity_id}/*`

## License

ISC
