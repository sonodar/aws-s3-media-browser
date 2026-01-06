# Research & Design Decisions

## Summary

- **Feature**: cognito-passkey-auth
- **Discovery Scope**: Extension（既存認証システムへのパスキー機能追加）
- **Key Findings**:
  - Amplify Gen2 の `defineAuth` で `webAuthn: true` を設定するだけでパスキー認証が有効化可能
  - Amplify UI Authenticator コンポーネントはパスキーサインインをネイティブサポートしていないため、カスタム UI が必要
  - パスキー登録は認証済みユーザーのみ可能（サインアップ時には不可）

## Research Log

### Amplify Gen2 WebAuthn 設定方法

- **Context**: バックエンド設定のシンプル化可能性を調査
- **Sources Consulted**:
  - [AWS Amplify Passwordless Documentation](https://docs.amplify.aws/react/build-a-backend/auth/concepts/passwordless/)
  - [AWS Amplify Docs GitHub](https://github.com/aws-amplify/docs)
- **Findings**:
  - `defineAuth` の `loginWith.webAuthn` オプションで宣言的に設定可能
  - `webAuthn: true` で自動 RelyingPartyID 解決（localhost/Amplify ドメイン）
  - カスタムドメインの場合は `webAuthn.relyingPartyId` を明示指定
  - `userVerification` は `'preferred'` または `'required'` を選択可能
- **Implications**: CFN オーバーライド不要、`defineAuth` の設定のみで完結

### Amplify UI Authenticator パスキーサポート状況

- **Context**: 既存 Authenticator コンポーネントの活用可能性を調査
- **Sources Consulted**:
  - [Amplify UI Authenticator Documentation](https://ui.docs.amplify.aws/react/connected-components/authenticator)
  - [GitHub Issue #5788 - amplify-flutter](https://github.com/aws-amplify/amplify-flutter/issues/5788)
- **Findings**:
  - Authenticator コンポーネントはパスキーサインインをネイティブサポートしていない
  - パスキーサインインには `signIn()` API を直接使用する必要あり
  - Authenticator はパスワード認証には引き続き使用可能
- **Implications**: パスキーサインイン用のカスタム UI コンポーネントが必要

### Amplify Auth パスキー API

- **Context**: フロントエンドで使用する API の調査
- **Sources Consulted**:
  - [Manage WebAuthn credentials](https://docs.amplify.aws/react/build-a-backend/auth/manage-users/manage-webauthn-credentials/)
  - [Sign in](https://docs.amplify.aws/react/build-a-backend/auth/connect-your-frontend/sign-in/)
- **Findings**:
  - `associateWebAuthnCredential()`: パスキー登録（認証必須）
  - `listWebAuthnCredentials({ pageSize, nextToken })`: パスキー一覧取得
  - `deleteWebAuthnCredential({ credentialId })`: パスキー削除
  - `signIn({ username, options: { authFlowType: 'USER_AUTH', preferredChallenge: 'WEB_AUTHN' } })`: パスキーサインイン
  - `credential` オブジェクト: `credentialId`, `friendlyCredentialName`, `relyingPartyId`, `createdAt`
- **Implications**: Amplify SDK の型定義を活用してタイプセーフな実装が可能

### 既存コードベース分析

- **Context**: 拡張ポイントと既存パターンの確認
- **Findings**:
  - **認証**: `src/App.tsx` で `Authenticator` コンポーネント使用、`hideSignUp` 設定済み
  - **Header**: `src/components/MediaBrowser/Header.tsx` にサインアウトボタンあり、設定ボタン追加可能
  - **Hooks パターン**: `useIdentityId` 等、`useState` + `useEffect` + 非同期 API パターン確立済み
  - **バックエンド**: `amplify/auth/resource.ts` で `defineAuth` 使用、`backend.ts` で CFN オーバーライド
- **Implications**: 既存パターンに沿った hooks とコンポーネント設計が可能

## Architecture Pattern Evaluation

| Option                 | Description                                | Strengths                   | Risks / Limitations                             | Notes                          |
| ---------------------- | ------------------------------------------ | --------------------------- | ----------------------------------------------- | ------------------------------ |
| Authenticator 拡張     | Authenticator コンポーネントのカスタマイズ | 既存 UI との統一感          | パスキーサインインは Authenticator 外で実装必要 | パスワード認証には引き続き使用 |
| カスタムサインイン UI  | 完全カスタムのサインイン画面               | 完全な制御                  | 実装コスト大、パスワード認証も再実装必要        | 採用しない                     |
| ハイブリッドアプローチ | Authenticator + パスキーオプション         | 既存 UI 活用 + パスキー対応 | UI 切り替えロジック必要                         | **採用**                       |

## Design Decisions

### Decision: ハイブリッド認証 UI アプローチ

- **Context**: パスワード認証とパスキー認証の両方をサポートする UI 構成
- **Alternatives Considered**:
  1. Authenticator のみ使用（パスキー非対応）
  2. 完全カスタムサインイン UI（両方対応）
  3. Authenticator + パスキーサインインボタン追加（ハイブリッド）
- **Selected Approach**: ハイブリッドアプローチ - Authenticator の前にパスキーサインインオプションを表示
- **Rationale**:
  - 既存のパスワード認証フローを維持
  - Authenticator の機能（パスワードリセット等）を活用
  - パスキーサインインは独立した軽量コンポーネントで実装
- **Trade-offs**:
  - (+) 既存コードへの変更最小
  - (+) Authenticator の機能をそのまま活用
  - (-) サインイン画面に2つの認証オプションが表示される
- **Follow-up**: ユーザビリティテストでフローを検証

### Decision: パスキー管理 UI の配置

- **Context**: パスキー登録・管理機能のアクセスポイント
- **Alternatives Considered**:
  1. Header に設定ボタン追加 → モーダル表示
  2. 専用の設定ページ作成
  3. ユーザーメニュードロップダウン
- **Selected Approach**: Header に設定ボタン追加 → モーダルでパスキー管理
- **Rationale**:
  - 既存 Header に追加するだけで実装可能
  - モーダル形式で文脈を維持
  - 新規ルーティング不要
- **Trade-offs**:
  - (+) 実装シンプル
  - (+) 既存 UI との一貫性
  - (-) Header のボタンが増える
- **Follow-up**: モーダルのデザインを Amplify UI に合わせる

### Decision: 環境変数による RelyingPartyID 設定

- **Context**: 本番環境でカスタムドメインを使用するための設定方法
- **Selected Approach**: 環境変数 `WEBAUTHN_RELYING_PARTY_ID` から取得、未設定時は Amplify デフォルト
- **Rationale**:
  - 環境ごとに異なるドメインに対応
  - ローカル開発時は設定不要（自動で localhost）
  - Amplify Hosting の環境変数機能と統合
- **Trade-offs**:
  - (+) 柔軟な環境対応
  - (+) 既存の Amplify 設定パターンと一致
  - (-) 本番デプロイ時に環境変数設定が必要

## Risks & Mitigations

- **ブラウザ互換性**: WebAuthn 非対応ブラウザでは機能無効化 → `PublicKeyCredential` のサポートチェックを実装
- **パスキー未登録ユーザー**: パスキーサインイン試行時にエラー → 明確なエラーメッセージとパスワード認証へのフォールバック案内
- **RelyingPartyID 不一致**: ドメイン変更時にパスキー無効化 → ドキュメントで注意喚起、既存パスキー再登録が必要

## References

- [Amplify Gen2 Passwordless Authentication](https://docs.amplify.aws/react/build-a-backend/auth/concepts/passwordless/) - パスキー設定の公式ドキュメント
- [Manage WebAuthn credentials](https://docs.amplify.aws/react/build-a-backend/auth/manage-users/manage-webauthn-credentials/) - パスキー管理 API
- [Amplify UI Authenticator](https://ui.docs.amplify.aws/react/connected-components/authenticator) - Authenticator コンポーネント
- [WebAuthn Specification](https://www.w3.org/TR/webauthn-2/) - W3C WebAuthn 標準
