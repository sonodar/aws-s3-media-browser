# AWS S3 Media Browser

AWS Amplify Gen2 を活用した写真・動画ブラウザアプリケーション。ユーザーごとに独立したストレージ空間を提供し、メディアファイルの閲覧・管理を可能にします。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/node-%3E%3D20-green.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)

## Motivation

Google Photo や iCloud のようなクラウドストレージは便利ですが、容量制限や料金プランを気にする必要があります。S3 なら従量課金で容量を気にせず使えますが、そのままでは UI が使いづらく、日常的なメディア管理には向いていません。

サーバーレスアーキテクチャで実現可能な OSS のメディアブラウザが見当たらなかったため、AWS Amplify Gen2 を使って独自開発しました。

## Features

- **認証ベースアクセス制御**: Cognito 認証でユーザーごとに隔離されたストレージを提供
- **パスキー（WebAuthn）認証**: パスワードレス認証によるセキュアで便利なログイン体験
- **メディアブラウジング**: S3 に保存されたファイル/フォルダの階層的なナビゲーション
- **ファイル操作**: アップロード、ダウンロード、削除（複数選択・一括対応）、フォルダ作成
- **メディアプレビュー**: 画像・動画のインラインプレビュー（Lightbox）
- **サムネイル自動生成**: アップロード時に画像・動画のサムネイルを自動生成
- **URL 同期**: ブラウザ履歴と連携したフォルダナビゲーション

## Tech Stack

| Category  | Technology                        |
| --------- | --------------------------------- |
| Language  | TypeScript 5.x (strict mode)      |
| Frontend  | React 19 + Vite                   |
| Backend   | AWS Amplify Gen2                  |
| Auth      | Amazon Cognito (Email + WebAuthn) |
| Storage   | Amazon S3                         |
| Functions | AWS Lambda (サムネイル生成)       |
| Testing   | Vitest + Testing Library          |

## Prerequisites

- Node.js 20+
- npm
- AWS CLI（デプロイ・Layer 作成用）
- AWS アカウント

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/sonodar/aws-s3-media-browser.git
cd aws-s3-media-browser
```

### 2. Install dependencies

```bash
npm install
```

### 3. Deploy Lambda Layers

サムネイル生成のため、Sharp と FFmpeg の Lambda Layer をデプロイする必要があります。

<details>
<summary>Sharp Lambda Layer のデプロイ</summary>

[cbschuld/sharp-aws-lambda-layer](https://github.com/cbschuld/sharp-aws-lambda-layer) を使用:

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

</details>

<details>
<summary>FFmpeg Lambda Layer のデプロイ（動画サムネイル用）</summary>

[John Van Sickle の FFmpeg 静的ビルド](https://johnvansickle.com/ffmpeg/) を使用:

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

</details>

### 4. Set environment variables

```bash
# Layer ARN を取得
aws lambda list-layer-versions --layer-name sharp --query 'LayerVersions[0].LayerVersionArn' --output text
aws lambda list-layer-versions --layer-name ffmpeg --query 'LayerVersions[0].LayerVersionArn' --output text

# 環境変数を設定
export SHARP_LAYER_ARN=arn:aws:lambda:ap-northeast-1:YOUR_ACCOUNT:layer:sharp:1
export FFMPEG_LAYER_ARN=arn:aws:lambda:ap-northeast-1:YOUR_ACCOUNT:layer:ffmpeg:1
```

### 5. Start Amplify sandbox

```bash
npx ampx sandbox
```

### 6. Start development server

```bash
npm run dev
```

アプリケーションは http://localhost:5173 で起動します。

## Available Scripts

| Command              | Description          |
| -------------------- | -------------------- |
| `npm run dev`        | 開発サーバー起動     |
| `npm run build`      | プロダクションビルド |
| `npm run preview`    | ビルドプレビュー     |
| `npm run test`       | テスト実行           |
| `npm run test:watch` | テストウォッチモード |

## Project Structure

```
├── amplify/              # Amplify Gen2 バックエンド定義
│   ├── auth/             # 認証リソース (Cognito)
│   ├── storage/          # ストレージリソース (S3)
│   ├── functions/        # Lambda 関数
│   │   └── thumbnail/    # サムネイル生成関数
│   └── backend.ts        # エントリポイント
├── src/
│   ├── components/       # 機能単位のコンポーネント
│   │   ├── MediaBrowser/ # メディアブラウザ機能
│   │   ├── PasskeyManagement/   # パスキー管理
│   │   ├── PasskeySettingsModal/
│   │   └── PasskeySignIn/
│   ├── hooks/            # カスタムフック
│   ├── utils/            # ユーティリティ関数
│   ├── types/            # 型定義
│   └── App.tsx           # アプリケーションルート
└── .kiro/                # 仕様・設計ドキュメント
```

## Architecture

### Authentication

- Amazon Cognito によるユーザー認証
- WebAuthn（パスキー）によるパスワードレス認証をサポート
- セルフサインアップ無効化（管理者のみがユーザー作成可能）

### Storage

- S3 バケットにメディアファイルを保存
- Identity ID ベースのアクセス制御でユーザー間のデータを完全分離
- パス構造:
  - `media/{identity_id}/*` - ユーザーのメディアファイル
  - `thumbnails/{identity_id}/*` - 自動生成されたサムネイル

### Thumbnail Generation

- S3 アップロードトリガーで Lambda 関数を起動
- Sharp ライブラリで画像サムネイルを生成
- FFmpeg で動画の最初のフレームからサムネイルを生成

## Deployment

### Amplify Hosting

1. Amplify Console でアプリを作成
2. リポジトリを接続
3. Environment variables を設定:
   - `SHARP_LAYER_ARN`: Sharp Lambda Layer の ARN
   - `FFMPEG_LAYER_ARN`: FFmpeg Lambda Layer の ARN
   - `WEBAUTHN_RELYING_PARTY_ID`: (オプション) カスタムドメイン用

### Manual Deployment

```bash
npx ampx pipeline-deploy --branch main --app-id YOUR_APP_ID
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Development Notes

- TypeScript strict mode を使用
- React 19 の新機能を活用
- Vitest でユニットテストを実装
- Amplify Gen2 の IaC パターンに従う

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [AWS Amplify](https://docs.amplify.aws/) - Backend as a Service
- [cbschuld/sharp-aws-lambda-layer](https://github.com/cbschuld/sharp-aws-lambda-layer) - Sharp Lambda Layer
- [John Van Sickle's FFmpeg](https://johnvansickle.com/ffmpeg/) - FFmpeg static builds
- [yet-another-react-lightbox](https://github.com/igordanchenko/yet-another-react-lightbox) - Lightbox component
