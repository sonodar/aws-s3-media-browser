# Research & Design Decisions

## Summary

- **Feature**: `s3-media-browser`
- **Discovery Scope**: New Feature（グリーンフィールド）
- **Key Findings**:
  - **StorageBrowser コンポーネント**: Amplify UI が提供する S3 ファイルブラウザ UI コンポーネントを最大限活用
  - Amplify Gen2 は TypeScript ベースのリソース定義（`defineAuth`, `defineStorage`, `defineBackend`）を使用
  - `createAmplifyAuthAdapter` + `createStorageBrowser` で認証統合済みブラウザを即座に構築可能

## Research Log

### StorageBrowser コンポーネント（重要）

- **Context**: Amplify UI が提供する S3 ファイルブラウザコンポーネントの調査
- **Sources Consulted**:
  - [Storage Browser for Amazon S3 | Amplify UI](https://ui.docs.amplify.aws/react/connected-components/storage/storage-browser)
  - [AWS News Blog - Storage Browser](https://aws.amazon.com/blogs/aws/connect-users-to-data-through-your-apps-with-storage-browser-for-amazon-s3/)
  - [GitHub - sample-amplify-storage-browser](https://github.com/aws-samples/sample-amplify-storage-browser)
- **Findings**:
  - `@aws-amplify/ui-react-storage` パッケージに `StorageBrowser` コンポーネントが含まれる
  - 3つのビュー構成:
    1. **Locations View**: ルートレベルの S3 リソースと権限を表示
    2. **Location Detail View**: ファイルブラウザ UI（フォルダ階層、アップロード、ダウンロード）
    3. **Location Action View**: アップロード等のアクション実行画面
  - 機能: ファイル閲覧、アップロード、ダウンロード、コピー、削除
  - **プレビュー機能なし**: 画像・動画のインラインプレビューは非対応（将来的に拡張可能）
  - 認証方式: Amplify Auth（推奨）、IAM Identity Center + S3 Access Grants、カスタム認証
  - テーマ: Amplify UI テーマを自動適用
  - CORS 設定が必要
- **Implications**:
  - **自前実装を最小化**: StorageBrowser を使うことでファイルブラウザ UI の実装工数をほぼゼロに
  - プレビュー機能は Phase 2 として後から追加可能
  - Amplify Auth との統合が標準サポートされている

### StorageBrowser セットアップコード

```typescript
// StorageBrowser.tsx
import {
  createAmplifyAuthAdapter,
  createStorageBrowser,
} from "@aws-amplify/ui-react-storage/browser";
import "@aws-amplify/ui-react-storage/styles.css";

export const { StorageBrowser } = createStorageBrowser({
  config: createAmplifyAuthAdapter(),
});
```

### Amplify Gen2 アーキテクチャ

- **Context**: Amplify Gen2 のプロジェクト構造と設定方法を調査
- **Sources Consulted**:
  - AWS Amplify Docs: `/aws-amplify/docs`
  - Amplify Gen2 Project Structure
- **Findings**:
  - `amplify/` ディレクトリ配下にリソース定義ファイルを配置
  - `amplify/backend.ts` で `defineBackend` を使用してリソースを統合
  - `amplify/auth/resource.ts` で認証設定（`defineAuth`）
  - `amplify/storage/resource.ts` でストレージ設定（`defineStorage`）
  - `amplify_outputs.json` が生成され、フロントエンドで `Amplify.configure()` に渡す
- **Implications**:
  - バックエンドコードは最小限で済む（マネージドサービス活用）
  - TypeScript で型安全なリソース定義が可能

### Amplify Auth（Cognito 認証）

- **Context**: Cognito 認証の設定と UI 統合方法
- **Sources Consulted**:
  - Amplify UI React Authenticator
  - Cognito User Pools 設定
- **Findings**:
  - `@aws-amplify/ui-react` の `Authenticator` コンポーネントでラップするだけで認証 UI を提供
  - `loginWith: { email: true }` で email ベース認証を設定
  - セッショントークンは自動的に localStorage に保存・リフレッシュ
- **Implications**:
  - 認証 UI の実装工数を大幅に削減

### Amplify Storage（S3 アクセス）

- **Context**: S3 ファイル操作の API と権限設定
- **Sources Consulted**:
  - Amplify Storage API v6.2.0+
  - Access Level Authorization
- **Findings**:
  - StorageBrowser 用のアクセスパターン定義:
    ```typescript
    access: (allow) => ({
      "media/*": [allow.authenticated.to(["read", "write", "delete"])],
    });
    ```
  - CORS 設定が必要（クライアントからの直接 S3 アクセスのため）
- **Implications**:
  - 個人用アプリなので `authenticated` ユーザーのみアクセス可能な `media/*` パスを使用

## Architecture Pattern Evaluation

| Option                | Description                                 | Strengths              | Risks / Limitations | Notes          |
| --------------------- | ------------------------------------------- | ---------------------- | ------------------- | -------------- |
| StorageBrowser 活用   | Amplify UI 提供コンポーネントをそのまま使用 | 実装工数最小、保守性高 | プレビュー機能なし  | **採用**       |
| 自前 FileBrowser 実装 | カスタム UI コンポーネント開発              | 完全なカスタマイズ性   | 開発工数大          | 不採用         |
| ハイブリッド          | StorageBrowser + カスタム拡張               | 段階的拡張可能         | 複雑性増加          | Phase 2 で検討 |

## Design Decisions

### Decision: Amplify 提供コンポーネントの最大活用

- **Context**: 開発効率とメンテナンス性を最大化したい
- **Alternatives Considered**:
  1. 全て自前実装 - 完全なカスタマイズ性
  2. Amplify コンポーネント活用 - 開発工数最小
- **Selected Approach**: **Amplify が提供するコンポーネントを最大限活用し、自前実装を最小化**
- **Rationale**:
  - StorageBrowser は認証統合、ファイル操作、UI をすべて提供
  - AWS 公式コンポーネントとして保守・更新が継続される
  - 個人用途では過度なカスタマイズは不要
- **Trade-offs**: UI のカスタマイズ性は制限される（テーマ変更は可能）
- **Follow-up**: プレビュー機能は Phase 2 で StorageBrowser の拡張またはカスタムモーダルとして追加

### Decision: プレビュー機能の Phase 2 延期

- **Context**: StorageBrowser にはプレビュー機能が含まれていない
- **Alternatives Considered**:
  1. 最初からプレビュー機能を自前実装
  2. まず StorageBrowser で基本機能を実装し、後からプレビューを追加
- **Selected Approach**: Phase 1 では StorageBrowser のみ、Phase 2 でプレビュー機能追加
- **Rationale**:
  - まずは動作する MVP を迅速にリリース
  - プレビューはダウンロードで代替可能
- **Trade-offs**: 初期バージョンではプレビュー不可
- **Follow-up**: Phase 2 でカスタムプレビューモーダルを実装

### Decision: ストレージパス構造

- **Context**: S3 バケット内のファイル構造をどのように設計するか
- **Selected Approach**: `media/*` パスで認証済みユーザーのみアクセス可能
- **Rationale**: 個人用アプリのため、シンプルな構造を優先

## Risks & Mitigations

- **Risk 1**: StorageBrowser の UI カスタマイズ制限
  - **Mitigation**: Amplify UI テーマでブランディング対応、必要に応じて CSS オーバーライド
- **Risk 2**: プレビュー機能なしによる UX 低下
  - **Mitigation**: Phase 2 でプレビュー機能を追加、当面はダウンロードで対応
- **Risk 3**: CORS 設定ミスによるアクセスエラー
  - **Mitigation**: Amplify Gen2 が CORS を自動設定、ドキュメントに設定手順を明記

## References

- [Storage Browser for Amazon S3 | Amplify UI](https://ui.docs.amplify.aws/react/connected-components/storage/storage-browser) - StorageBrowser 公式ドキュメント
- [AWS News Blog - Storage Browser](https://aws.amazon.com/blogs/aws/connect-users-to-data-through-your-apps-with-storage-browser-for-amazon-s3/) - 機能紹介
- [GitHub - sample-amplify-storage-browser](https://github.com/aws-samples/sample-amplify-storage-browser) - サンプルプロジェクト
- [AWS Amplify Gen2 Documentation](https://docs.amplify.aws/) - 公式ドキュメント
- [Amplify UI React](https://ui.docs.amplify.aws/) - UI コンポーネントライブラリ
