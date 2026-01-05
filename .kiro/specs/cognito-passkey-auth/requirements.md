# Requirements Document

## Introduction

本仕様は、AWS S3 Photo Browser アプリケーションにおける Cognito パスキー（WebAuthn）認証機能の実装要件を定義する。既存のパスワード認証に加え、パスキーによるパスワードレス認証を追加することで、ユーザーのログイン体験を向上させ、セキュリティを強化する。

パスキー認証は WebAuthn 標準に基づき、ユーザーのデバイス（指紋認証、Face ID、Windows Hello など）を利用した生体認証を可能にする。管理者がユーザーを作成するクローズド環境の特性を維持しつつ、認証済みユーザーが自身でパスキーを登録・管理できる機能を提供する。

### Amplify 機能の活用方針

本実装では AWS Amplify Gen2 が提供する以下の機能を最大限活用する：

- **バックエンド設定**: `defineAuth` の `webAuthn` オプションによる宣言的設定
- **パスキー登録**: `associateWebAuthnCredential()` API
- **パスキー管理**: `listWebAuthnCredentials()`, `deleteWebAuthnCredential()` API
- **パスキーサインイン**: `signIn()` API の `USER_AUTH` フローと `WEB_AUTHN` チャレンジ

**注意**: Amplify UI Authenticator コンポーネントは現時点でパスキーサインインをネイティブサポートしていないため、パスキーサインイン機能にはカスタム UI 実装が必要。

## Requirements

### Requirement 1: バックエンド認証設定

**Objective:** As a 開発者, I want Amplify の `defineAuth` 設定でパスキー認証を有効化する, so that Cognito UserPool がパスキー認証をサポートする

#### Acceptance Criteria

1. The Auth Backend shall `defineAuth` の `loginWith.webAuthn` オプションを有効にしてパスキー認証を有効化する
2. The Auth Backend shall `webAuthn.relyingPartyId` を環境変数（例: `WEBAUTHN_RELYING_PARTY_ID`）から取得する
3. If 環境変数が未設定である, then the Auth Backend shall Amplify のデフォルト動作（サンドボックス: `localhost`、ブランチデプロイ: Amplify アプリドメイン）にフォールバックする
4. The Auth Backend shall `webAuthn.userVerification` を `preferred` に設定する
5. The Auth Backend shall 既存のメール認証設定（`loginWith.email: true`）を維持する
6. The Auth Backend shall 既存のセルフサインアップ無効化設定（`allowAdminCreateUserOnly: true`）を維持する

### Requirement 2: パスキー登録機能

**Objective:** As a 認証済みユーザー, I want 自分のアカウントにパスキーを登録できる, so that 次回以降パスワードなしでログインできる

#### Acceptance Criteria

1. When ユーザーがパスキー登録ボタンをクリックする, the Passkey Service shall Amplify の `associateWebAuthnCredential()` API を呼び出してパスキー登録フローを開始する
2. When パスキー登録が成功する, the Passkey Service shall 登録成功メッセージをユーザーに表示する
3. If パスキー登録が失敗する, then the Passkey Service shall エラーメッセージをユーザーに表示する
4. While ユーザーが未認証状態である, the Passkey Service shall パスキー登録機能を非表示にする
5. The Passkey Registration UI shall 操作中にローディング状態を表示する

### Requirement 3: パスキー管理機能

**Objective:** As a 認証済みユーザー, I want 登録済みのパスキー一覧を確認し、不要なパスキーを削除できる, so that 自分のパスキーを管理できる

#### Acceptance Criteria

1. When ユーザーがパスキー管理画面を開く, the Passkey Service shall Amplify の `listWebAuthnCredentials()` API を呼び出して登録済みパスキー一覧を取得する
2. The Passkey Management UI shall 各パスキーの名前（friendlyCredentialName）、作成日時（createdAt）を表示する
3. When ユーザーがパスキーの削除ボタンをクリックする, the Passkey Service shall 削除確認ダイアログを表示する
4. When ユーザーが削除を確認する, the Passkey Service shall Amplify の `deleteWebAuthnCredential()` API を呼び出して該当パスキーを削除する
5. When パスキー削除が成功する, the Passkey Service shall パスキー一覧を更新して削除されたパスキーを非表示にする
6. If パスキー削除が失敗する, then the Passkey Service shall エラーメッセージをユーザーに表示する
7. The Passkey Management UI shall ページネーションが必要な場合に `nextToken` を使用して追加のパスキーを取得する

### Requirement 4: パスキーによるサインイン

**Objective:** As a ユーザー, I want パスキーを使ってサインインできる, so that パスワードを入力せずに素早くログインできる

#### Acceptance Criteria

1. The Sign-in UI shall 既存の Authenticator コンポーネントに加えて、パスキーでサインインするオプションを表示する
2. When ユーザーがパスキーサインインボタンをクリックする, the Auth Service shall Amplify の `signIn()` API を `authFlowType: 'USER_AUTH'` および `preferredChallenge: 'WEB_AUTHN'` オプションで呼び出す
3. When `signIn()` の戻り値の `nextStep.signInStep` が `'DONE'` である, the Auth Service shall ユーザーを認証状態に遷移させ、メディアブラウザ画面を表示する
4. If パスキー認証が失敗する, then the Auth Service shall エラーメッセージを表示し、パスワード認証へのフォールバックを案内する
5. The Sign-in UI shall パスキーサインイン用にユーザー名（メールアドレス）入力フィールドを提供する

### Requirement 5: パスワードとパスキーの併用

**Objective:** As a ユーザー, I want パスワード認証とパスキー認証を選択できる, so that 状況に応じて適切な認証方法を使用できる

#### Acceptance Criteria

1. The Sign-in UI shall パスワード認証（Authenticator コンポーネント）とパスキー認証の両方のオプションを提供する
2. The Sign-in UI shall デフォルトで Authenticator コンポーネントによるパスワード認証フォームを表示する
3. When ユーザーがパスキーオプションを選択する, the Sign-in UI shall パスキー認証フローに切り替える
4. The Auth Backend shall `defineAuth` の設定でパスワードとパスキーの両方を許可する認証ファクターとして設定する

### Requirement 6: ユーザーインターフェース

**Objective:** As a ユーザー, I want パスキー機能が既存の UI と一貫したデザインで提供される, so that 直感的に操作できる

#### Acceptance Criteria

1. The Passkey UI shall 既存の Amplify UI コンポーネントのスタイルと一貫したデザインを使用する
2. The Passkey Management UI shall 認証後のヘッダーからアクセス可能な設定メニューまたはモーダルとして提供する
3. The Passkey UI shall パスキー登録・削除・サインインの操作中にローディング状態を表示する
4. If ブラウザが WebAuthn をサポートしていない, then the Passkey UI shall パスキー関連機能を非表示または無効化する
5. The Passkey UI shall `@aws-amplify/ui-react` のコンポーネント（Button, Card, Loader など）を活用する

### Requirement 7: セキュリティ要件

**Objective:** As a システム管理者, I want パスキー認証がセキュリティ要件を満たす, so that システム全体のセキュリティを維持できる

#### Acceptance Criteria

1. The Auth System shall パスキー操作（登録・削除）を認証済みセッション内でのみ許可する
2. The Auth System shall WebAuthn の RelyingPartyID をアプリケーションのドメインに限定する
3. The Auth System shall パスキー認証失敗時に詳細なエラー情報を外部に公開しない
4. The Auth Backend shall 既存のセルフサインアップ無効化設定を維持する（管理者のみがユーザーを作成可能）