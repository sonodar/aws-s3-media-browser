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
- **@mantine/core + @mantine/hooks**: UI コンポーネントライブラリ（メニュー、モーダル等）
- **@tanstack/react-query + @tanstack/react-query-devtools**: サーバー状態管理・キャッシュ（認証、ストレージ操作）
- **jotai + jotai-devtools**: 軽量アトミック状態管理（クライアント状態）+ Redux DevTools 連携
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

| 決定                         | 理由                                                                   |
| ---------------------------- | ---------------------------------------------------------------------- |
| Amplify Gen2 採用            | TypeScript ベースの IaC で型安全なバックエンド定義                     |
| セルフサインアップ無効化     | 管理者のみがユーザー作成可能なクローズド環境                           |
| Identity ID ベースストレージ | ユーザー間の完全なデータ分離                                           |
| Vite + React 19              | 高速な開発サーバーと最新の React 機能                                  |
| 単一責任フック分割           | テスト容易性と保守性向上（useStorage → 個別フック）                    |
| URL クエリパラメータ同期     | SPA でのブラウザ履歴・リロード対応                                     |
| WebAuthn パスキー認証        | パスワードレスでセキュアな認証体験                                     |
| Set ベース選択管理           | O(1) 選択チェックによる複数選択・一括操作                              |
| Lucide React アイコン        | 統一されたアイコンデザイン、絵文字からの移行                           |
| OxLint + OxFmt               | ESLint より高速な Rust ベースの Linter/Formatter                       |
| localStorage 設定永続化      | ユーザー設定（ソート順等）のブラウザローカル保存                       |
| Intl.Collator 自然順ソート   | 数字を正しく扱う多言語対応ソート（file1, file2, file10）               |
| @use-gesture/react 採用      | タッチデバイス向けスワイプジェスチャーの高精度検出                     |
| Jotai アトミック状態管理     | 軽量・シンプルな共有状態管理（パス・選択・ソート状態）                 |
| Mantine UI ライブラリ        | アクセシブルな UI コンポーネント（Menu, Modal 等）                     |
| jotai-devtools               | Redux DevTools 連携によるアトム状態のデバッグ                          |
| UI コンポーネント統合        | 自作 Menu/Modal → Mantine に移行（アクセシビリティ向上）               |
| TanStack Query 導入          | サーバー状態のキャッシュ・同期・無効化を宣言的に管理                   |
| 状態管理の二層構造           | サーバー状態（TanStack Query）/ クライアント状態（Jotai）              |
| 機能別フックディレクトリ整理 | identity, passkey, path, storage, ui でドメイン分離                    |
| useMutation 分割             | 書き込み操作を個別 mutation フックに分離（キャッシュ無効化の一元管理） |

---

_Document standards and patterns, not every dependency_
