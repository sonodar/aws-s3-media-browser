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

AWS Serverless Application Repository (SAR) から Sharp Layer をデプロイします:

```bash
# ap-northeast-1 にデプロイする場合
aws serverlessrepo create-cloud-formation-change-set \
  --application-id arn:aws:serverlessrepo:us-east-1:987481058235:applications/nodejs-sharp-lambda-layer \
  --stack-name sharp-layer \
  --semantic-version 0.34.1 \
  --region ap-northeast-1

# ChangeSet を実行（出力された ChangeSetId を使用）
aws cloudformation execute-change-set \
  --change-set-name <ChangeSetId> \
  --region ap-northeast-1
```

### 2. Layer ARN の取得

デプロイ完了後、Layer ARN を取得します:

```bash
aws cloudformation describe-stacks \
  --stack-name serverlessrepo-sharp-layer \
  --query 'Stacks[0].Outputs[?OutputKey==`LayerVersion`].OutputValue' \
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

### 4. (オプション) FFmpeg Layer のデプロイ

動画サムネイル生成を有効にする場合は、FFmpeg Layer も必要です:

```bash
# FFmpeg Layer をデプロイ
aws serverlessrepo create-cloud-formation-change-set \
  --application-id arn:aws:serverlessrepo:us-east-1:145266761615:applications/ffmpeg-lambda-layer \
  --stack-name ffmpeg-layer \
  --region ap-northeast-1

# ChangeSet を実行
aws cloudformation execute-change-set \
  --change-set-name <ChangeSetId> \
  --region ap-northeast-1

# Layer ARN を取得
aws cloudformation describe-stacks \
  --stack-name serverlessrepo-ffmpeg-layer \
  --query 'Stacks[0].Outputs[?OutputKey==`LayerVersion`].OutputValue' \
  --output text \
  --region ap-northeast-1

# 環境変数に設定
export FFMPEG_LAYER_ARN=arn:aws:lambda:ap-northeast-1:123456789012:layer:ffmpeg:1
```

> **Note**: Sharp Layer は x86_64 アーキテクチャ用です。Lambda 関数もデフォルトで x86_64 を使用します。

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
