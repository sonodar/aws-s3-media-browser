# AWS S3 Photo Browser

AWS Amplify を活用した写真・動画ブラウザアプリケーション。ユーザーごとに独立したストレージ空間を提供し、メディアファイルの閲覧・管理を可能にします。

## Features

- **認証ベースアクセス制御**: Cognito 認証でユーザーごとに隔離されたストレージを提供
- **メディアブラウジング**: S3 に保存されたファイル/フォルダの階層的なナビゲーション
- **ファイル操作**: アップロード、ダウンロード、削除、フォルダ作成
- **メディアプレビュー**: 画像・動画のインラインプレビュー（Lightbox）

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
