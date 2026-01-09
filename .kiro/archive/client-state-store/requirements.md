# Requirements Document

## Introduction

AWS S3 Photo Browser におけるクライアント状態を store ベースに移行し、状態の可視化とデバッグ容易性を実現します。

### 背景と課題

現在の hooks ベースの状態管理には以下の問題があります：

| 問題               | 詳細                                                                   |
| ------------------ | ---------------------------------------------------------------------- |
| **状態の不可視性** | 複数の `useState` が各コンポーネントに分散し、状態の流れを追跡できない |
| **デバッグ困難**   | サムネイル遅延表示の不具合など、原因特定が困難な問題が発生している     |
| **props drilling** | 状態を子コンポーネントに渡すために多層の props 受け渡しが必要          |
| **テスト困難**     | hooks の内部状態をテストするのが難しい                                 |

#### 具体的な問題例: サムネイル遅延表示の不具合

- **推測された原因**: `useUploadTracker` の `trackUpload` 関数が正しく呼び出されていない
- **修正試行の結果**: Claude Opus 4.5 Thinking を含む複数回の修正チャレンジで解決に至らなかった
- **教訓**: 現在のアーキテクチャは、人間にも AI にも複雑すぎる

### 解決アプローチ

状態管理を store ベースに移行することで：

1. **状態の可視化**: DevTools で状態の流れをリアルタイムに確認可能
2. **配線の簡素化**: グローバル store により props drilling が不要に
3. **デバッグ容易性**: 状態変更の履歴追跡が可能
4. **関心の分離**: クライアント状態を明確に一元管理

### フェーズ分割

サムネイル不具合の根本解決には、状態管理アーキテクチャ全体の見直しが必要です。複雑さを管理するため、以下のフェーズに分割して段階的に進めます。

| フェーズ           | 目標                        | 状態       |
| ------------------ | --------------------------- | ---------- |
| Phase 1（本 spec） | Jotai 導入 + useEffect 削減 | 🎯 対象    |
| Phase 2            | TanStack Query 移行         | 📋 予定    |
| Phase 3（別 spec） | サムネイル状態管理          | 📋 別 spec |

#### 本フェーズの達成基準

- **禁止用途の useEffect**: 3箇所 → 0箇所
- **Jotai store 基盤**: 構築完了
- **既存機能**: 全て動作維持

---

## 期待される効果（Expected Benefits）

### Benefit 1: Store アーキテクチャ基盤

**Objective:** As a 開発者, I want 状態管理を store ベースのアーキテクチャに移行したい, so that 状態の可視化・デバッグ・テストが容易になる

#### Acceptance Criteria

1. The Photo Browser shall クライアント状態を単一のグローバル store で管理する
2. The Store shall DevTools 拡張機能（Redux DevTools 等）と連携し、状態変更の履歴を可視化する
3. The Store shall TypeScript の型安全性を維持し、状態とアクションに対する完全な型推論を提供する
4. The Store shall 純粋関数ベースの状態更新ロジックを持ち、副作用を分離する

### Benefit 2: 状態の一元管理

**Objective:** As a 開発者, I want アプリケーション全体の状態を一箇所で把握したい, so that 状態間の依存関係や更新タイミングを追跡できる

#### Acceptance Criteria

1. The Store shall ファイル一覧の状態（現在のアイテム、ローディング状態、エラー）を管理する
2. The Store shall アップロード処理の状態（進行中のアップロード、進捗、完了/失敗ステータス）を管理する
3. The Store shall 選択状態（選択中のアイテム、選択モード）を管理する
4. The Store shall UI 状態（モーダルの開閉、コンテキストメニュー、ダイアログ）を管理する
5. The Store shall 現在のパス（フォルダ階層）の状態を管理する

### Benefit 3: props drilling の排除

**Objective:** As a 開発者, I want コンポーネント間の props 受け渡しを最小化したい, so that コンポーネントの結合度を下げ保守性を向上させる

#### Acceptance Criteria

1. When コンポーネントが状態を必要とするとき, the Store shall hooks 経由で直接状態にアクセスする手段を提供する
2. When コンポーネントがアクションを実行するとき, the Store shall hooks 経由で直接アクションをディスパッチする手段を提供する
3. The Store shall 必要な状態スライスのみを購読できるセレクタ機能を提供し、不要な再レンダリングを防ぐ

### Benefit 4: 既存機能との互換性

**Objective:** As a ユーザー, I want store 移行後も現在の機能がすべて動作してほしい, so that 移行による機能退行がない

#### Acceptance Criteria

1. The Photo Browser shall ファイル/フォルダの一覧表示機能を維持する
2. The Photo Browser shall ファイルのアップロード機能（重複チェック含む）を維持する
3. The Photo Browser shall ファイルの選択・複数選択・一括削除機能を維持する
4. The Photo Browser shall ファイルの移動・リネーム・ダウンロード機能を維持する
5. The Photo Browser shall サムネイル表示機能を維持する
6. The Photo Browser shall Lightbox によるメディアプレビュー機能を維持する
7. The Photo Browser shall URL 同期によるフォルダナビゲーション機能を維持する
8. The Photo Browser shall ソート機能（設定永続化含む）を維持する
9. The Photo Browser shall ジェスチャー操作（長押し、スワイプ）を維持する

### Benefit 5: 段階的移行戦略

**Objective:** As a 開発者, I want 既存コードを段階的に移行したい, so that 一度に大規模な変更を行うリスクを回避できる

#### Acceptance Criteria

1. The Store shall 既存の hooks と共存可能な設計とし、段階的な移行を可能にする
2. The Photo Browser shall 移行中も既存の hooks ベースのコードが動作し続けることを保証する
3. When 新しい store ベースのコードに移行するとき, the Photo Browser shall 既存のテストが引き続きパスすることを検証する

### Benefit 6: デバッグ・開発体験

**Objective:** As a 開発者, I want 状態変更の原因を素早く特定したい, so that 不具合の調査時間を短縮できる

#### Acceptance Criteria

1. The Store shall 各状態変更にアクション名（意味のある名前）を付与し、DevTools で変更理由を識別可能にする
2. The Store shall 状態変更の時系列履歴を DevTools で確認可能にする
3. The Store shall 開発モードでのみ DevTools 連携を有効化し、本番ビルドには含めない

### Benefit 7: テスト容易性

**Objective:** As a 開発者, I want store の状態とアクションを単体テストしたい, so that 状態管理ロジックの品質を保証できる

#### Acceptance Criteria

1. The Store shall 初期状態を注入可能な設計とし、テスト用の状態セットアップを容易にする
2. The Store shall アクションの実行結果を検証可能な設計とする
3. The Store shall コンポーネントテスト時に mock store を提供可能とする

---

## 技術的制約（Architecture Constraints）

本セクションは設計フェーズにおける実装制約を定義します。React 公式ドキュメント「You Might Not Need an Effect」の原則に従います。

### Constraint 1: useEffect 使用制限

useEffect は**外部システムとの同期**にのみ使用を許可します。

#### 許可される用途（Allowed）

| 用途                     | 例                                     | 理由                       |
| ------------------------ | -------------------------------------- | -------------------------- |
| ブラウザ API リスナー    | `popstate`, `resize`, `online/offline` | 外部イベントソースとの同期 |
| DOM 直接操作             | フォーカス管理、スクロール位置         | React 外部の DOM 状態      |
| サードパーティライブラリ | 地図、チャートの初期化                 | 外部ライブラリとの同期     |
| データフェッチ           | API 呼び出し（クリーンアップ必須）     | 外部データソースとの同期   |

#### 禁止される用途（Prohibited）

| 用途                          | 代替手段                             | 理由                       |
| ----------------------------- | ------------------------------------ | -------------------------- |
| 派生データの計算              | レンダリング中の計算 / derived atoms | 不要な再レンダリング       |
| イベント応答                  | イベントハンドラ / action atoms      | 実行タイミングの明確化     |
| 状態リセット                  | `key` 属性                           | コンポーネントの概念的分離 |
| 状態初期化                    | atoms の初期値 / `atomWithDefault`   | 宣言的な初期値定義         |
| Effect チェーン               | イベントハンドラで一括更新           | 複数レンダリングの回避     |
| props/state の監視 → setState | derived atoms                        | Single Source of Truth     |

### Constraint 2: Single Source of Truth

> 「既存の props または state から計算できるものは、状態に入れない」

| 原則                                | 実装方法                         |
| ----------------------------------- | -------------------------------- |
| 真の状態のみ primitive atoms に保持 | `atom()`, `atomWithReset()`      |
| 派生値はレンダリング時に計算        | derived atoms（read-only atoms） |
| 状態変更はアクションとして定義      | action atoms（write-only atoms） |

### Constraint 3: コンポーネント設計原則

| 原則                              | 詳細                                       |
| --------------------------------- | ------------------------------------------ |
| コンポーネントは atoms を直接購読 | `useAtomValue()`, `useAtom()`              |
| ビジネスロジックは atoms に移行   | コンポーネントはプレゼンテーションに徹する |
| hooks は最小化または廃止          | atoms のファサードとしてのみ存在           |
| 状態派生は derived atoms          | コンポーネント内で計算しない               |

### Constraint 4: 判断基準

コードを書く前に以下を問う：

> 「このコードが実行される理由は、**ユーザーが何かをしたから**か、それとも**コンポーネントが画面に表示されたから**か？」

- **ユーザー操作** → イベントハンドラ / action atoms
- **画面表示時で外部同期が必要** → useEffect（許可リストに該当する場合のみ）
- **画面表示時で派生値が必要** → derived atoms

---

## 成功基準（Success Metrics）

> **測定対象**: 本フェーズの目標は「Jotai 導入」と「useEffect 削減」です。
> 下記指標はこれらの達成度を測定します。
> Benefit 1-7 は、これらが達成された結果として得られる効果です。

| 指標                                   | 現状  | 目標      | 今回スコープ                          |
| -------------------------------------- | ----- | --------- | ------------------------------------- |
| コンポーネント内 useEffect（禁止用途） | 2箇所 | 0箇所     | 2箇所排除（MoveDialog, RenameDialog） |
| コンポーネント内 useEffect（許可用途） | 5箇所 | 5箇所以下 | 維持                                  |
| hooks 内 useEffect（禁止用途）         | 1箇所 | 0箇所     | 1箇所排除（useSelection）             |
| hooks 内 useEffect（許可用途）         | 3箇所 | 3箇所以下 | 維持                                  |
| 派生値を状態として保持                 | 多数  | 0         | Selection 関連を derived atoms 化     |
| Effect チェーン                        | 存在  | 0         | ダイアログ初期化を `key` 属性に置換   |

### 対象外（今回スコープ外）

| 分類                 | ファイル                                                         | 箇所数 | 理由                        |
| -------------------- | ---------------------------------------------------------------- | ------ | --------------------------- |
| Phase 2              | useIdentityId, useStorageOperations, PreviewModal, FolderBrowser | 4箇所  | TanStack Query 移行予定     |
| 別 spec（Thumbnail） | ThumbnailImage (2箇所), useUploadTracker                         | 3箇所  | サムネイル状態管理は別 spec |
