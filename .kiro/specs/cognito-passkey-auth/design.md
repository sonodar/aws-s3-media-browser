# Technical Design Document

## Overview

本設計は AWS S3 Photo Browser アプリケーションに Cognito パスキー（WebAuthn）認証機能を追加する技術的な実装を定義する。既存のパスワード認証システムを維持しながら、パスキーによるパスワードレス認証オプションを提供する。

### 設計方針

**ハイブリッド認証アプローチ**を採用する：

- 既存の Authenticator コンポーネントはパスワード認証に継続使用
- パスキーサインインは独立したカスタムコンポーネントで実装
- Amplify Auth SDK の WebAuthn API を直接利用

この方針を選択した理由：

1. Amplify UI Authenticator はパスキーサインインをネイティブサポートしていない
2. 既存のパスワード認証フロー（パスワードリセット等）を維持できる
3. 実装リスクを最小化しつつ、段階的にパスキー機能を追加可能

## Architecture

### コンポーネント図

```
┌─────────────────────────────────────────────────────────────────────┐
│                           Frontend (React)                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                         App.tsx                              │   │
│  │  ┌─────────────────────┐   ┌──────────────────────────────┐ │   │
│  │  │  PasskeySignIn     │   │     Authenticator            │ │   │
│  │  │  (カスタム)        │   │     (パスワード認証)          │ │   │
│  │  └─────────────────────┘   └──────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                               │                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                       MediaBrowser                           │   │
│  │  ┌─────────────────────────────────────────────────────┐    │   │
│  │  │                      Header                          │    │   │
│  │  │  [選択] [設定⚙️] [サインアウト]                      │    │   │
│  │  └─────────────────────────────────────────────────────┘    │   │
│  │                           │                                  │   │
│  │  ┌─────────────────────────────────────────────────────┐    │   │
│  │  │              PasskeySettingsModal                    │    │   │
│  │  │  ┌─────────────────────────────────────────────────┐│    │   │
│  │  │  │            PasskeyManagement                     ││    │   │
│  │  │  │  - パスキー一覧表示                             ││    │   │
│  │  │  │  - パスキー登録                                 ││    │   │
│  │  │  │  - パスキー削除                                 ││    │   │
│  │  │  └─────────────────────────────────────────────────┘│    │   │
│  │  └─────────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                         Hooks                                │   │
│  │  ┌──────────────────┐  ┌──────────────────────────────────┐ │   │
│  │  │  usePasskey      │  │  useWebAuthnSupport              │ │   │
│  │  │  - credentials   │  │  - isSupported: boolean          │ │   │
│  │  │  - register()    │  │                                  │ │   │
│  │  │  - delete()      │  └──────────────────────────────────┘ │   │
│  │  │  - loading       │                                       │   │
│  │  │  - error         │                                       │   │
│  │  └──────────────────┘                                       │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Amplify Auth SDK                            │
├─────────────────────────────────────────────────────────────────────┤
│  signIn({ username, options: { authFlowType, preferredChallenge }}) │
│  associateWebAuthnCredential()                                      │
│  listWebAuthnCredentials({ pageSize, nextToken })                   │
│  deleteWebAuthnCredential({ credentialId })                         │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          Backend (Amplify)                          │
├─────────────────────────────────────────────────────────────────────┤
│  amplify/auth/resource.ts                                           │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  defineAuth({                                                │   │
│  │    loginWith: {                                              │   │
│  │      email: true,                                            │   │
│  │      webAuthn: {                                             │   │
│  │        relyingPartyId: process.env.WEBAUTHN_RELYING_PARTY_ID │   │
│  │        userVerification: 'preferred'                         │   │
│  │      }                                                       │   │
│  │    }                                                         │   │
│  │  })                                                          │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      AWS Cognito UserPool                           │
├─────────────────────────────────────────────────────────────────────┤
│  - Email 認証 + WebAuthn 認証                                       │
│  - adminCreateUserOnly: true                                        │
│  - RelyingPartyID: 環境依存（localhost / Amplify ドメイン / カスタム） │
└─────────────────────────────────────────────────────────────────────┘
```

## Technology Stack

| レイヤー       | 技術                      | バージョン |
| -------------- | ------------------------- | ---------- |
| Frontend       | React                     | 19.x       |
| UI Components  | @aws-amplify/ui-react     | ^6.x       |
| Auth SDK       | aws-amplify/auth          | ^6.x       |
| Build Tool     | Vite                      | ^6.x       |
| Backend        | AWS Amplify Gen2          | latest     |
| Authentication | Amazon Cognito + WebAuthn | -          |
| Language       | TypeScript                | ^5.x       |

## System Flows

### フロー 1: パスキー登録

```
┌──────────┐      ┌─────────────────┐      ┌───────────────┐      ┌─────────────┐
│  ユーザー │      │ PasskeyManagement│      │ Amplify Auth  │      │   Cognito   │
└────┬─────┘      └───────┬─────────┘      └──────┬────────┘      └──────┬──────┘
     │                    │                       │                      │
     │  設定ボタンクリック  │                       │                      │
     │───────────────────>│                       │                      │
     │                    │                       │                      │
     │  モーダル表示       │                       │                      │
     │<───────────────────│                       │                      │
     │                    │                       │                      │
     │  パスキー登録クリック │                       │                      │
     │───────────────────>│                       │                      │
     │                    │                       │                      │
     │                    │ associateWebAuthnCredential()                │
     │                    │─────────────────────>│                      │
     │                    │                       │                      │
     │                    │                       │  WebAuthn Challenge  │
     │                    │                       │────────────────────>│
     │                    │                       │                      │
     │  ブラウザ認証プロンプト│                      │                      │
     │<──────────────────────────────────────────│                      │
     │                    │                       │                      │
     │  生体認証実行       │                       │                      │
     │──────────────────────────────────────────>│                      │
     │                    │                       │                      │
     │                    │                       │  Credential 保存     │
     │                    │                       │────────────────────>│
     │                    │                       │                      │
     │                    │                       │  成功レスポンス       │
     │                    │                       │<────────────────────│
     │                    │                       │                      │
     │                    │  成功                  │                      │
     │                    │<─────────────────────│                      │
     │                    │                       │                      │
     │  成功メッセージ表示  │                       │                      │
     │<───────────────────│                       │                      │
     │                    │                       │                      │
     │                    │ listWebAuthnCredentials() (一覧更新)          │
     │                    │─────────────────────>│                      │
```

### フロー 2: パスキーサインイン

```
┌──────────┐      ┌───────────────┐      ┌───────────────┐      ┌─────────────┐
│  ユーザー │      │ PasskeySignIn │      │ Amplify Auth  │      │   Cognito   │
└────┬─────┘      └──────┬────────┘      └──────┬────────┘      └──────┬──────┘
     │                   │                      │                      │
     │  メールアドレス入力 │                      │                      │
     │──────────────────>│                      │                      │
     │                   │                      │                      │
     │ パスキーでサインイン │                      │                      │
     │──────────────────>│                      │                      │
     │                   │                      │                      │
     │                   │ signIn({             │                      │
     │                   │   username,          │                      │
     │                   │   options: {         │                      │
     │                   │     authFlowType:    │                      │
     │                   │       'USER_AUTH',   │                      │
     │                   │     preferredChallenge:                     │
     │                   │       'WEB_AUTHN'    │                      │
     │                   │   }                  │                      │
     │                   │ })                   │                      │
     │                   │─────────────────────>│                      │
     │                   │                      │                      │
     │                   │                      │  WebAuthn Challenge  │
     │                   │                      │────────────────────>│
     │                   │                      │                      │
     │ ブラウザ認証プロンプト│                      │                      │
     │<─────────────────────────────────────────│                      │
     │                   │                      │                      │
     │  生体認証実行      │                      │                      │
     │─────────────────────────────────────────>│                      │
     │                   │                      │                      │
     │                   │                      │  認証検証            │
     │                   │                      │────────────────────>│
     │                   │                      │                      │
     │                   │                      │  トークン発行         │
     │                   │                      │<────────────────────│
     │                   │                      │                      │
     │                   │ { nextStep:          │                      │
     │                   │   { signInStep:      │                      │
     │                   │     'DONE' } }       │                      │
     │                   │<─────────────────────│                      │
     │                   │                      │                      │
     │  MediaBrowser へ遷移│                      │                      │
     │<──────────────────│                      │                      │
```

### フロー 3: パスキー削除

```
┌──────────┐      ┌─────────────────┐      ┌───────────────┐      ┌─────────────┐
│  ユーザー │      │ PasskeyManagement│      │ Amplify Auth  │      │   Cognito   │
└────┬─────┘      └───────┬─────────┘      └──────┬────────┘      └──────┬──────┘
     │                    │                       │                      │
     │  削除ボタンクリック  │                       │                      │
     │───────────────────>│                       │                      │
     │                    │                       │                      │
     │  確認ダイアログ表示  │                       │                      │
     │<───────────────────│                       │                      │
     │                    │                       │                      │
     │  削除確認           │                       │                      │
     │───────────────────>│                       │                      │
     │                    │                       │                      │
     │                    │ deleteWebAuthnCredential({ credentialId })   │
     │                    │─────────────────────>│                      │
     │                    │                       │                      │
     │                    │                       │  Credential 削除     │
     │                    │                       │────────────────────>│
     │                    │                       │                      │
     │                    │                       │  成功レスポンス       │
     │                    │                       │<────────────────────│
     │                    │                       │                      │
     │                    │  成功                  │                      │
     │                    │<─────────────────────│                      │
     │                    │                       │                      │
     │  一覧から削除表示    │                       │                      │
     │<───────────────────│                       │                      │
```

## Components

### Component 1: Auth Backend Configuration

**場所**: `amplify/auth/resource.ts`

**責務**: Cognito UserPool の WebAuthn 設定を宣言的に定義

**変更内容**:

```typescript
import { defineAuth } from "@aws-amplify/backend";

export const auth = defineAuth({
  loginWith: {
    email: true,
    // WebAuthn (パスキー) 認証を有効化
    webAuthn: process.env.WEBAUTHN_RELYING_PARTY_ID
      ? {
          relyingPartyId: process.env.WEBAUTHN_RELYING_PARTY_ID,
          userVerification: "preferred",
        }
      : {
          // Amplify デフォルト: サンドボックスは localhost、ブランチデプロイは Amplify ドメイン
          userVerification: "preferred",
        },
  },
});
```

**環境変数**:

- `WEBAUTHN_RELYING_PARTY_ID`: カスタムドメイン使用時に設定（例: `example.com`）
- 未設定時: Amplify のデフォルト動作（localhost または Amplify アプリドメイン）

### Component 2: useWebAuthnSupport Hook

**場所**: `src/hooks/useWebAuthnSupport.ts`

**責務**: ブラウザの WebAuthn サポート状況を検出

**インターフェース**:

```typescript
export interface UseWebAuthnSupportReturn {
  isSupported: boolean;
}

export function useWebAuthnSupport(): UseWebAuthnSupportReturn;
```

**実装概要**:

- `window.PublicKeyCredential` の存在チェック
- `PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()` の結果を確認

### Component 3: usePasskey Hook

**場所**: `src/hooks/usePasskey.ts`

**責務**: パスキーの CRUD 操作を管理

**インターフェース**:

```typescript
export interface WebAuthnCredential {
  credentialId: string;
  friendlyCredentialName: string;
  relyingPartyId: string;
  createdAt: Date;
}

export interface UsePasskeyReturn {
  credentials: WebAuthnCredential[];
  loading: boolean;
  error: Error | null;
  registering: boolean;
  registerPasskey: () => Promise<void>;
  deletePasskey: (credentialId: string) => Promise<void>;
  refreshCredentials: () => Promise<void>;
}

export function usePasskey(): UsePasskeyReturn;
```

**使用する Amplify API**:

- `associateWebAuthnCredential()`: パスキー登録
- `listWebAuthnCredentials({ pageSize?, nextToken? })`: 一覧取得（ページネーション対応）
- `deleteWebAuthnCredential({ credentialId })`: 削除

### Component 4: PasskeySignIn Component

**場所**: `src/components/PasskeySignIn/PasskeySignIn.tsx`

**責務**: パスキーによるサインイン UI を提供

**Props**:

```typescript
interface PasskeySignInProps {
  onSuccess: () => void;
  onSwitchToPassword: () => void;
}
```

**UI 構成**:

- メールアドレス入力フィールド
- パスキーでサインインボタン
- パスワードでサインインへの切り替えリンク
- エラーメッセージ表示エリア
- ローディング状態表示

**使用する Amplify API**:

```typescript
signIn({
  username: email,
  options: {
    authFlowType: "USER_AUTH",
    preferredChallenge: "WEB_AUTHN",
  },
});
```

### Component 5: PasskeyManagement Component

**場所**: `src/components/PasskeyManagement/PasskeyManagement.tsx`

**責務**: 登録済みパスキーの一覧表示・登録・削除

**Props**:

```typescript
interface PasskeyManagementProps {
  // Props なし - 認証済みユーザー向けの自己完結コンポーネント
}
```

**UI 構成**:

- パスキー登録ボタン
- 登録済みパスキー一覧（Card コンポーネント）
  - パスキー名（friendlyCredentialName）
  - 作成日時（createdAt）
  - 削除ボタン
- 削除確認ダイアログ
- ローディング・エラー状態表示

**使用する Hook**: `usePasskey`, `useWebAuthnSupport`

### Component 6: PasskeySettingsModal Component

**場所**: `src/components/PasskeySettingsModal/PasskeySettingsModal.tsx`

**責務**: パスキー管理のモーダルラッパー

**Props**:

```typescript
interface PasskeySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}
```

**UI 構成**:

- モーダルオーバーレイ
- モーダルヘッダー（タイトル + 閉じるボタン）
- PasskeyManagement コンポーネント

### Component 7: Updated App.tsx

**場所**: `src/App.tsx`

**変更内容**: ハイブリッド認証 UI の統合

**UI フロー**:

1. 初期表示: パスキーサインインオプション + パスワードサインインへの切り替えリンク
2. パスキーサインイン成功 → MediaBrowser 表示
3. パスワードサインイン選択 → Authenticator 表示
4. Authenticator サインイン成功 → MediaBrowser 表示

**状態管理**:

```typescript
type AuthMode = "passkey" | "password";
const [authMode, setAuthMode] = useState<AuthMode>("passkey");
const [isAuthenticated, setIsAuthenticated] = useState(false);
```

### Component 8: Updated Header.tsx

**場所**: `src/components/MediaBrowser/Header.tsx`

**変更内容**: 設定ボタンの追加

**追加 Props**:

```typescript
interface HeaderProps {
  // ...既存 Props
  onOpenSettings?: () => void;
}
```

**UI 変更**:

- header-right セクションに設定ボタン（⚙️ アイコン）を追加
- クリックで PasskeySettingsModal を開く

## Requirements Traceability

| Requirement                                 | Design Component                                         | 実装場所                                                                                               |
| ------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Req 1: バックエンド認証設定                 | Auth Backend Configuration                               | `amplify/auth/resource.ts`                                                                             |
| Req 1.2: 環境変数からの RelyingPartyID 取得 | Auth Backend Configuration                               | `amplify/auth/resource.ts`                                                                             |
| Req 2: パスキー登録機能                     | usePasskey Hook, PasskeyManagement                       | `src/hooks/usePasskey.ts`, `src/components/PasskeyManagement/`                                         |
| Req 3: パスキー管理機能                     | usePasskey Hook, PasskeyManagement, PasskeySettingsModal | `src/hooks/usePasskey.ts`, `src/components/PasskeyManagement/`, `src/components/PasskeySettingsModal/` |
| Req 4: パスキーによるサインイン             | PasskeySignIn                                            | `src/components/PasskeySignIn/`                                                                        |
| Req 5: パスワードとパスキーの併用           | Updated App.tsx                                          | `src/App.tsx`                                                                                          |
| Req 6: ユーザーインターフェース             | 全 UI コンポーネント, useWebAuthnSupport                 | 各コンポーネント, `src/hooks/useWebAuthnSupport.ts`                                                    |
| Req 7: セキュリティ要件                     | Auth Backend Configuration, usePasskey                   | `amplify/auth/resource.ts`, `src/hooks/usePasskey.ts`                                                  |

## File Structure

```
amplify/
├── auth/
│   └── resource.ts                    # 変更: WebAuthn 設定追加
├── backend.ts                         # 既存維持: CFN オーバーライド

src/
├── App.tsx                            # 変更: ハイブリッド認証 UI
├── hooks/
│   ├── useIdentityId.ts               # 既存
│   ├── usePasskey.ts                  # 新規: パスキー管理 Hook
│   └── useWebAuthnSupport.ts          # 新規: WebAuthn サポート検出
├── components/
│   ├── MediaBrowser/
│   │   ├── Header.tsx                 # 変更: 設定ボタン追加
│   │   └── ...                        # 既存
│   ├── PasskeySignIn/
│   │   ├── index.tsx                  # 新規: エクスポート
│   │   ├── PasskeySignIn.tsx          # 新規: パスキーサインイン UI
│   │   └── PasskeySignIn.css          # 新規: スタイル
│   ├── PasskeyManagement/
│   │   ├── index.tsx                  # 新規: エクスポート
│   │   ├── PasskeyManagement.tsx      # 新規: パスキー管理 UI
│   │   └── PasskeyManagement.css      # 新規: スタイル
│   └── PasskeySettingsModal/
│       ├── index.tsx                  # 新規: エクスポート
│       ├── PasskeySettingsModal.tsx   # 新規: モーダルラッパー
│       └── PasskeySettingsModal.css   # 新規: スタイル
```

## Design Decisions

### Decision 1: ハイブリッド認証 UI

**決定**: Authenticator コンポーネントとカスタムパスキーサインインコンポーネントを併用

**理由**:

- Amplify UI Authenticator はパスキーサインインをネイティブサポートしていない
- 既存のパスワード認証機能（パスワードリセット等）を維持できる
- 段階的な移行が可能

**代替案と却下理由**:

1. 完全カスタムサインイン UI → 実装コスト大、パスワード認証機能の再実装が必要
2. Authenticator のみ使用 → パスキーサインイン不可

### Decision 2: モーダルベースのパスキー管理

**決定**: Header の設定ボタンからモーダルでパスキー管理画面を表示

**理由**:

- 新規ルーティング不要
- 既存の UI フローを維持
- コンテキストを失わずに設定変更可能

**代替案と却下理由**:

1. 専用設定ページ → ルーティング追加が必要、UI フロー複雑化
2. ドロップダウンメニュー → 複雑な操作には不向き

### Decision 3: 環境変数による RelyingPartyID 設定

**決定**: `WEBAUTHN_RELYING_PARTY_ID` 環境変数で本番ドメインを設定可能に

**理由**:

- ローカル開発時は設定不要（Amplify デフォルト: localhost）
- サンドボックスデプロイは Amplify ドメイン自動解決
- 本番環境のみカスタムドメイン設定

**トレードオフ**:

- 本番デプロイ時に環境変数設定が必要
- ドメイン変更時は既存パスキーが無効化される

## Security Considerations

1. **認証済みセッション必須**: パスキー登録・削除は認証後のみ実行可能
2. **RelyingPartyID 制限**: ドメインに紐付けることでフィッシング対策
3. **エラー情報非公開**: 認証失敗時に詳細なエラー情報を外部に公開しない
4. **セルフサインアップ無効化維持**: 管理者のみがユーザー作成可能
