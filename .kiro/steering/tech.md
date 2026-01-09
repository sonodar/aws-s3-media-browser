# Technology Stack

## Architecture

フロントエンド SPA + AWS Amplify マネージドバックエンド構成。
Amplify Gen2 (TypeScript CDK) でバックエンドリソース（Auth, Storage, Functions）を定義。
S3 トリガー Lambda でサムネイル自動生成（Sharp + FFmpeg Layer）。
WebAuthn（パスキー）によるパスワードレス認証をサポート。

## Core Technologies

- **Language**: TypeScript 5.x (strict mode)
- **Framework**: React 19 + Vite
- **Backend**: AWS Amplify Gen2
- **Runtime**: Node.js 20+

## Key Libraries

- **@aws-amplify/ui-react**: 認証 UI コンポーネント
- **@aws-amplify/ui-react-storage**: ストレージ統合
- **jotai**: 軽量アトミック状態管理（コンポーネント間の共有状態）
- **yet-another-react-lightbox**: 画像/動画プレビュー
- **react-player**: 動画再生
- **lucide-react**: アイコンライブラリ
- **@use-gesture/react**: ジェスチャー検出（スワイプナビゲーション）

## Development Standards

### Type Safety

- TypeScript strict mode 有効
- `noUnusedLocals`, `noUnusedParameters` で未使用コード検出
- `any` 型の使用禁止

### Code Quality

- Vite によるビルド検証
- コンポーネント単位のテスト（Vitest + Testing Library）
- OxLint + OxFmt によるコード品質チェック
- husky + lint-staged でコミット時の自動 lint/format

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

| 決定                         | 理由                                                     |
| ---------------------------- | -------------------------------------------------------- |
| Amplify Gen2 採用            | TypeScript ベースの IaC で型安全なバックエンド定義       |
| セルフサインアップ無効化     | 管理者のみがユーザー作成可能なクローズド環境             |
| Identity ID ベースストレージ | ユーザー間の完全なデータ分離                             |
| Vite + React 19              | 高速な開発サーバーと最新の React 機能                    |
| 単一責任フック分割           | テスト容易性と保守性向上（useStorage → 個別フック）      |
| URL クエリパラメータ同期     | SPA でのブラウザ履歴・リロード対応                       |
| WebAuthn パスキー認証        | パスワードレスでセキュアな認証体験                       |
| Set ベース選択管理           | O(1) 選択チェックによる複数選択・一括操作                |
| Lucide React アイコン        | 統一されたアイコンデザイン、絵文字からの移行             |
| OxLint + OxFmt               | ESLint より高速な Rust ベースの Linter/Formatter         |
| localStorage 設定永続化      | ユーザー設定（ソート順等）のブラウザローカル保存         |
| Intl.Collator 自然順ソート   | 数字を正しく扱う多言語対応ソート（file1, file2, file10） |
| @use-gesture/react 採用      | タッチデバイス向けスワイプジェスチャーの高精度検出       |
| 長押しコンテキストメニュー   | タッチデバイスでの右クリック相当操作（useLongPress）     |
| Jotai アトミック状態管理     | 軽量・シンプルな共有状態管理（パス・選択・ソート状態）   |

---

_Document standards and patterns, not every dependency_
