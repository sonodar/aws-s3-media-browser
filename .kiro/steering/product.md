# Product Overview

AWS S3 Photo Browser は、AWS Amplify を活用した写真・動画ブラウザアプリケーションです。ユーザーごとに独立したストレージ空間を提供し、メディアファイルの閲覧・管理を可能にします。

## Core Capabilities

1. **認証ベースアクセス制御**: Cognito 認証でユーザーごとに隔離されたストレージを提供
2. **メディアブラウジング**: S3 に保存されたファイル/フォルダの階層的なナビゲーション
3. **ファイル操作**: アップロード、ダウンロード、削除、フォルダ作成
4. **メディアプレビュー**: 画像・動画のインラインプレビュー（Lightbox）

## Target Use Cases

- 個人・小規模チーム向けのプライベートメディアストレージ
- 管理者がユーザーを作成・管理するクローズドな環境
- 写真・動画の整理と共有（ユーザー単位）

## Value Proposition

- **シンプルさ**: Amplify の統合バックエンドで運用コスト最小化
- **セキュリティ**: ユーザー単位のストレージ分離（Identity ID ベース）
- **即座のデプロイ**: Amplify Hosting による CI/CD 統合

---
_Focus on patterns and purpose, not exhaustive feature lists_
