# Implementation Plan

## Overview

本実装計画は、Renovate GitHub App を使用した依存関係自動アップデート機能の導入手順を定義する。
アプリケーションコードの変更は不要で、設定ファイルの追加と GitHub App のインストールのみで完結する。

**ユーザー作業と AI 実装作業の区分**:

- **🔧 AI 実装**: 設定ファイルの作成（自動化可能）
- **👤 ユーザー作業**: GitHub App のインストールと権限設定（手動操作必須）

---

## Tasks

- [x] 1. Renovate 設定ファイルの作成
- [x] 1.1 基本設定とスケジュールの定義
  - リポジトリルートに `renovate.json` を作成
  - JSON Schema 参照を設定して IDE での検証を有効化
  - 推奨プリセット `config:recommended` を継承
  - タイムゾーンを `Asia/Tokyo` に設定
  - 週次スケジュール（毎週月曜日の午前9時前）を設定
  - PR 作成制限（時間あたり5件、同時最大10件）を設定
  - npm と asdf マネージャーを有効化
  - Dependency Dashboard を無効化（ノイズ軽減）
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 3.1, 3.3, 7.1_

- [x] 1.2 パッケージグループ化ルールの設定
  - AWS Amplify パッケージ（`@aws-amplify/*`, `aws-amplify`）のグループ化
  - TanStack パッケージ（`@tanstack/*`）のグループ化
  - Mantine パッケージ（`@mantine/*`）のグループ化
  - テスト関連パッケージ（`@testing-library/*`, `vitest`, `@vitest/*`）のグループ化
  - 型定義パッケージ（`@types/*`）のグループ化
  - devDependencies のマイナーアップデートをグループ化
  - _Requirements: 4.1, 4.2_

- [x] 1.3 自動マージとセキュリティ設定
  - devDependencies のパッチアップデートに対する自動マージを有効化
  - 自動マージ戦略として squash マージを設定
  - セキュリティアラートを常時有効化（スケジュール外でも即時対応）
  - dependencies（本番依存）は自動マージ対象外とする
  - _Requirements: 3.2, 5.1, 5.2, 5.3, 5.4_

- [x] 1.4 Node.js バージョン管理の設定
  - asdf マネージャーで Node.js パッケージを個別に管理
  - メジャー/マイナーバージョンを分離して PR 作成
  - Node.js アップデートは自動マージ対象外とする
  - _Requirements: 7.1, 7.2, 7.3_

- [ ] 2. 👤 Renovate GitHub App のインストール（ユーザー作業）
  - GitHub Marketplace（https://github.com/apps/renovate）にアクセス
  - 「Install」または「Configure」をクリック
  - 対象リポジトリ（aws-s3-photo-browser）を選択してアクセス許可
  - インストール完了後、Renovate が自動的に Onboarding PR を作成することを確認
  - **注意**: この作業は GitHub の Web UI で手動実行が必要
  - _Requirements: 1.1, 1.3, 2.1_

- [ ] 3. 動作確認と検証
- [ ] 3.1 設定ファイルの検証
  - `renovate.json` の JSON 構文を検証
  - JSON Schema に基づく設定の妥当性を確認
  - 設定ファイルをコミットして PR を作成
  - _Requirements: 1.2_

- [ ] 3.2 👤 初回スキャンと PR 確認（ユーザー作業）
  - Renovate App インストール後の Onboarding PR を確認
  - Onboarding PR をマージして Renovate を有効化
  - 初回スキャン後に作成される依存関係更新 PR を確認
  - PR にパッケージ名、バージョン情報、changelog リンクが含まれることを確認
  - CI ワークフロー（`npm run check-all`）が自動トリガーされることを確認
  - **注意**: この作業は GitHub の Web UI で確認が必要
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 3.3 👤 自動マージ動作の検証（ユーザー作業・オプション）
  - devDependencies のパッチアップデート PR が作成されるまで待機
  - CI 成功後に自動マージが実行されることを確認
  - 自動マージが実行されない場合は Branch Protection Rules を確認
  - 必要に応じて Renovate を bypass 対象に追加
  - **注意**: 実際のパッチアップデートが発生するまで時間がかかる可能性あり
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

---

## Requirements Coverage

| Requirement | Tasks                                    |
| ----------- | ---------------------------------------- |
| 1.1         | 1.1, 2                                   |
| 1.2         | 1.1, 3.1                                 |
| 1.3         | 1.1, 2                                   |
| 1.4         | 1.1                                      |
| 2.1         | 2, 3.2                                   |
| 2.2         | 3.2                                      |
| 2.3         | 3.2                                      |
| 2.4         | 3.2                                      |
| 3.1         | 1.1                                      |
| 3.2         | 1.3                                      |
| 3.3         | 1.1                                      |
| 4.1         | 1.2                                      |
| 4.2         | 1.2                                      |
| 4.3         | （Renovate デフォルト動作で対応）        |
| 5.1         | 1.3, 3.3                                 |
| 5.2         | 1.3, 3.3                                 |
| 5.3         | 1.3, 3.3                                 |
| 5.4         | 1.3, 3.3                                 |
| 6.1         | （設定で対応可能、初期設定では除外なし） |
| 6.2         | （設定で対応可能、初期設定では固定なし） |
| 6.3         | （Renovate が自動検出）                  |
| 7.1         | 1.1, 1.4                                 |
| 7.2         | 1.4                                      |
| 7.3         | 1.4                                      |

---

## Notes

### ユーザー作業が必要な理由

以下の作業は GitHub の Web UI または API トークンを使用した操作が必要なため、ユーザーによる手動実行が必須です：

1. **Renovate GitHub App のインストール**: GitHub Marketplace からのアプリインストールはリポジトリオーナーの権限が必要
2. **Onboarding PR の確認とマージ**: PR のマージ操作はユーザーの承認が必要
3. **Branch Protection Rules の調整**: リポジトリ設定の変更はユーザーの権限が必要

### 除外設定について（要件 6）

初期設定では特定パッケージの除外は行わない。将来的に互換性問題が発生した場合、以下のような `packageRules` を追加することで対応可能：

```json
{
  "matchPackageNames": ["problematic-package"],
  "enabled": false
}
```

### メジャーアップデートについて（要件 4.3）

Renovate のデフォルト動作でメジャーアップデートは個別の PR として作成されるため、明示的な設定は不要。
