# Technology Stack

## Architecture

フロントエンド SPA + AWS Amplify マネージドバックエンド構成。
Amplify Gen2 (TypeScript CDK) でバックエンドリソース（Auth, Storage）を定義。

## Core Technologies

- **Language**: TypeScript 5.x (strict mode)
- **Framework**: React 19 + Vite
- **Backend**: AWS Amplify Gen2
- **Runtime**: Node.js 20+

## Key Libraries

- **@aws-amplify/ui-react**: 認証 UI コンポーネント
- **@aws-amplify/ui-react-storage**: ストレージ統合
- **yet-another-react-lightbox**: 画像/動画プレビュー
- **react-player**: 動画再生

## Development Standards

### Type Safety
- TypeScript strict mode 有効
- `noUnusedLocals`, `noUnusedParameters` で未使用コード検出
- `any` 型の使用禁止

### Code Quality
- Vite によるビルド検証
- コンポーネント単位のテスト（Vitest + Testing Library）

### Testing
- **Vitest**: テストランナー
- **@testing-library/react**: コンポーネントテスト
- **happy-dom**: ブラウザ環境シミュレーション

## Development Environment

### Required Tools
- Node.js 20+
- npm
- AWS CLI（デプロイ用）

### Common Commands
```bash
# Dev: npm run dev
# Build: npm run build
# Test: npm run test
```

## Key Technical Decisions

| 決定 | 理由 |
|------|------|
| Amplify Gen2 採用 | TypeScript ベースの IaC で型安全なバックエンド定義 |
| セルフサインアップ無効化 | 管理者のみがユーザー作成可能なクローズド環境 |
| Identity ID ベースストレージ | ユーザー間の完全なデータ分離 |
| Vite + React 19 | 高速な開発サーバーと最新の React 機能 |

---
_Document standards and patterns, not every dependency_
