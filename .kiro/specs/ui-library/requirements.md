# Requirements Document

## Introduction

本ドキュメントは、AWS S3 Photo Browser プロジェクトにおける UI コンポーネントライブラリ導入の要件を定義します。

### 背景

現在のプロジェクトでは、useLongPress, ContextMenu、DropdownMenu などの UI コンポーネントを独自実装しています。これには以下の課題があります：

| 課題                 | 詳細                                                                              |
| -------------------- | --------------------------------------------------------------------------------- |
| **長押し操作のバグ** | 長押し後の誤ナビゲーション、削除ボタンの動作不良、iOS ネイティブメニュー表示の3件 |
| **開発生産性の低下** | 共通 UI パターンを毎回ゼロから実装                                                |
| **保守コストの増加** | 独自コンポーネントのバグ修正・機能追加を自前で対応                                |
| **品質のばらつき**   | アクセシビリティ、キーボード操作、エッジケース対応が不完全                        |
| **車輪の再発明**     | 外部クリック検出、Escape キー処理など、標準的な機能を個別に実装                   |

### 依存関係の問題と解決策

Mantine 8 の導入を検討した結果、以下の依存関係の問題が発覚しました：

#### 問題

| 問題                      | 詳細                                                                                               |
| ------------------------- | -------------------------------------------------------------------------------------------------- |
| **jotai-devtools の依存** | `jotai-devtools@0.13.0` が `@mantine/core@7.17.8`、`@mantine/hooks@7.17.8` を dependencies に持つ  |
| **Mantine 8 導入不可**    | jotai-devtools をインストールすると Mantine 7 が強制的にインストールされ、Mantine 8 が導入できない |

#### 調査結果

jotai-devtools パッケージの内部構造を調査した結果：

| エントリポイント                             | Mantine 依存 | 用途                             |
| -------------------------------------------- | ------------ | -------------------------------- |
| `jotai-devtools` (DevTools コンポーネント)   | **あり**     | ブラウザ内 UI でアトム状態を表示 |
| `jotai-devtools/utils` (useAtomsDevtools 等) | **なし**     | Redux DevTools 拡張機能と連携    |

- `DevTools` UI コンポーネントは Mantine 7 の UI ライブラリを使用して構築されている
- `useAtomsDevtools` 等のフックは純粋に React と Jotai のみを使用し、Mantine に依存していない

また、React DevTools での Jotai アトムデバッグを検証した結果：

- `useAtomValue` は内部で `useDebugValue` を呼び出すとされているが、実際には React DevTools で「Atom」として表示されない
- カスタムフック名（StoragePath, Selection 等）は表示されるが、内部のアトム値は確認できない

#### 解決策

以下の方針で Mantine 8 導入と Redux DevTools 連携を両立させます：

1. **DevTools UI コンポーネントの使用を廃止**: Mantine 7 に依存する `<DevTools />` の使用をやめる
2. **useAtomsDevtools のみ使用**: Redux DevTools 拡張機能との連携は維持（Mantine 不使用）
3. **npm overrides で Mantine 8 を強制**: jotai-devtools の Mantine 7 依存を Mantine 8 に上書き

```json
// package.json
{
  "overrides": {
    "@mantine/core": "^8.0.0",
    "@mantine/hooks": "^8.0.0"
  }
}
```

これにより：

- Redux DevTools でアトム状態を確認可能（Time-travel debugging 含む）
- Mantine 8 の `useLongPress` フックが利用可能
- ブラウザ内 DevTools UI は使用不可（トレードオフ）

### 目的

上記の解決策に基づき、以下を実現します：

1. **jotai-devtools の DevTools UI 廃止と useAtomsDevtools への移行**
2. **npm overrides による Mantine 8 の導入**
3. **長押し操作のバグ修正**: Mantine 8 の `useLongPress` でタップ・長押しを適切に分離
4. **UI 開発生産性の向上**: 標準コンポーネントの活用で開発時間を短縮

### スコープ

本フェーズでは以下を実施します：

| タスク                              | 優先度 | 理由                                                     |
| ----------------------------------- | ------ | -------------------------------------------------------- |
| DevTools UI → useAtomsDevtools 移行 | 最優先 | Mantine 8 導入のブロッカー解消                           |
| npm overrides 設定と Mantine 8 導入 | 最優先 | useLongPress フック利用に必要                            |
| FileListItem（useLongPress 移行）   | 高     | **長押し操作のバグ修正**（基本操作が壊れている緊急対応） |
| ContextMenu（Menu コンポーネント）  | 中     | useEffect 2箇所（外部クリック、Escape キー）の削減       |
| DropdownMenu（Menu コンポーネント） | 中     | useEffect 2箇所（外部クリック、Escape キー）の削減       |

### ライブラリ選定

**Mantine 8** を採用します。

**選定理由**:

- **useLongPress フック**: タップと長押しを適切に分離
  - 閾値（デフォルト 400ms）を超える押下を長押しと判定
  - 短い押下は onClick で処理可能
  - onStart, onFinish, onCancel コールバック
- **Menu コンポーネント**: 右クリックメニュー、ドロップダウンメニューを標準サポート
  - 外部クリック検出、Escape キー処理、位置調整がすべて組み込み
  - `trigger="click"`, `trigger="hover"`, `trigger="click-hover"` のサポート
  - サブメニュー対応（`Menu.Sub`）
- **Tree コンポーネント**: MoveDialog のフォルダ選択 UI に将来的に活用可能
- **豊富なコンポーネント**: Button, Modal, Dialog, Form, Input など 120+ コンポーネント
- **アクセシビリティ**: ARIA 属性、キーボードナビゲーションが組み込み
- **React 19 対応**: 最新の React バージョンをサポート
- **TypeScript ファースト**: 型定義が充実

## Requirements

### Requirement 1: DevTools UI から useAtomsDevtools への移行

**Objective:** As a 開発者, I want jotai-devtools の DevTools UI コンポーネントの使用をやめ useAtomsDevtools に移行する, so that Mantine 7 への実質的な依存を排除し Mantine 8 の導入を可能にする

#### Acceptance Criteria

1. The JotaiProvider shall `<DevTools />` コンポーネントのレンダリングを削除する
2. The JotaiProvider shall `jotai-devtools/styles.css` のインポートを削除する
3. The プロジェクト shall `useAtomsDevtools` フックを使用して Redux DevTools と連携する
4. The useAtomsDevtools shall Provider 直下のコンポーネントで呼び出される
5. When 開発環境でアプリケーションを起動する, the Redux DevTools shall 全アトムの状態を表示する
6. When アトムの値が変更される, the Redux DevTools shall 変更をアクションとして記録する
7. The 本番ビルド shall useAtomsDevtools のコードを含まない（開発環境のみ）
8. If Redux DevTools 拡張機能がインストールされていない場合, the アプリケーション shall エラーなく動作する

### Requirement 2: npm overrides による Mantine 8 の導入

**Objective:** As a 開発者, I want npm overrides を使用して Mantine 8 をプロジェクトに導入する, so that useLongPress フックおよび標準化された UI コンポーネントを利用できる

#### Acceptance Criteria

1. The package.json shall `overrides` フィールドで `@mantine/core` を バージョン 8 に指定する
2. The package.json shall `overrides` フィールドで `@mantine/hooks` を バージョン 8 に指定する
3. When npm install を実行する, the プロジェクト shall @mantine/core@8 および @mantine/hooks@8 のみをインストールする
4. The プロジェクト shall Mantine 7 のパッケージが存在しないことを確認する
5. When アプリケーションを起動する, the アプリケーション shall MantineProvider でアプリケーションをラップする
6. The アプリケーション shall 既存のカスタム CSS と Mantine のスタイルが競合しないように設定する
7. The ビルドプロセス shall Mantine 8 を含む状態で正常にビルドが完了する
8. The テストスイート shall Mantine コンポーネントを含む状態で全テストがパスする

### Requirement 3: 長押し操作の安定化（@mantine/hooks useLongPress）【最優先】

**Objective:** As a ユーザー, I want ファイル・フォルダを長押ししたときにコンテキストメニューが表示され、短いタップでは通常のナビゲーションが動作する, so that タッチデバイスでも直感的に操作できる

**背景:** 現在のカスタム `useLongPress` フックでは、長押し後に `onClick` イベントが発火してしまい誤ナビゲーションが発生する。また、コンテキストメニューの削除ボタンが正常に動作しない問題、iOS でネイティブメニューが表示される問題がある。Mantine 8 の `useLongPress` フックに移行することで解決する。

**対象バグ一覧:**

1. フォルダ長押し後、ポインタをそのまま離すとフォルダ内に入ってしまう
2. フォルダのコンテキストメニューで「削除」をクリックしても動作しない
3. iPhone でファイル長押し時に OS ネイティブメニューが表示される

#### Acceptance Criteria

1. When ユーザーがファイル・フォルダを 400ms 以上長押しする, the FileListItem shall コンテキストメニューを表示する
2. When ユーザーがファイル・フォルダを短くタップする（400ms 未満）, the FileListItem shall 通常のナビゲーション動作を実行する（フォルダ: フォルダ内に移動、ファイル: プレビュー表示）
3. When 長押しによりコンテキストメニューが表示された後にポインタを離す, the FileListItem shall ナビゲーション動作を抑制する
4. When ユーザーが iOS デバイスで長押しする, the FileListItem shall OS ネイティブのコンテキストメニューを抑制する
5. When ユーザーが Android デバイスで長押しする, the FileListItem shall OS ネイティブのコンテキストメニューを抑制する
6. When 選択モードが有効な場合, the FileListItem shall 長押し操作を無効化し、タップで選択トグルを行う
7. The FileListItem shall タッチデバイスとマウスデバイスの両方で一貫した動作を提供する
8. When ユーザーが長押し中にポインタを移動キャンセル閾値以上動かす, the フック shall 長押しをキャンセルし、ナビゲーション動作を許可する
9. The 移行後 shall カスタム useLongPress フックを削除する

### Requirement 4: ContextMenu の Mantine Menu への移行

**Objective:** As a ユーザー, I want 右クリック・長押しで表示されるコンテキストメニューを使用する, so that ファイル・フォルダに対する操作を実行できる

#### Acceptance Criteria

1. When ユーザーがファイル・フォルダを右クリックする, the アプリケーション shall Mantine Menu コンポーネントでコンテキストメニューを表示する
2. When ユーザーがファイル・フォルダを長押しする（タッチデバイス）, the アプリケーション shall Mantine Menu コンポーネントでコンテキストメニューを表示する
3. When ユーザーがメニュー外をクリックする, the アプリケーション shall コンテキストメニューを閉じる（Mantine 組み込み機能）
4. When ユーザーが Escape キーを押す, the アプリケーション shall コンテキストメニューを閉じる（Mantine 組み込み機能）
5. The コンテキストメニュー shall 「名前を変更」「移動」「削除」の 3 つのアクションを提供する
6. The コンテキストメニュー shall 画面端での位置調整を自動的に行う（Mantine 組み込み機能）
7. The コンテキストメニュー shall キーボードナビゲーション（矢印キー、Enter）に対応する
8. The コンテキストメニュー shall 適切な ARIA 属性を持つ

### Requirement 5: DropdownMenu の Mantine Menu への移行

**Objective:** As a ユーザー, I want ドロップダウンメニューを使用する, so that 追加のアクションにアクセスできる

#### Acceptance Criteria

1. When ユーザーがトリガーボタンをクリックする, the アプリケーション shall Mantine Menu コンポーネントでドロップダウンメニューを表示する
2. When ユーザーがメニュー外をクリックする, the アプリケーション shall ドロップダウンメニューを閉じる（Mantine 組み込み機能）
3. When ユーザーが Escape キーを押す, the アプリケーション shall ドロップダウンメニューを閉じる（Mantine 組み込み機能）
4. The ドロップダウンメニュー shall 画面端での位置を自動調整する（Mantine 組み込み機能）
5. The ドロップダウンメニュー shall キーボードナビゲーションに対応する
6. The ドロップダウンメニュー shall 危険なアクション（削除など）を視覚的に区別する

### Requirement 6: 独自コンポーネントの撤廃

**Objective:** As a 開発者, I want 独自実装の UI コンポーネントを Mantine に置き換える, so that 保守対象コードを削減できる

#### Acceptance Criteria

1. When ContextMenu を Mantine に移行する, the プロジェクト shall 独自の ContextMenu.tsx を Mantine Menu ベースの実装に置き換える
2. When DropdownMenu を Mantine に移行する, the プロジェクト shall 独自の DropdownMenu.tsx を Mantine Menu ベースの実装に置き換える
3. The 移行後のコンポーネント shall 独自実装の外部クリック検出ロジックを含まない
4. The 移行後のコンポーネント shall 独自実装の Escape キー処理ロジックを含まない
5. The 移行後のコンポーネント shall 独自実装の位置調整ロジックを含まない
6. The 移行後 shall カスタム実装の useLongPress フックを削除する

### Requirement 7: 既存機能の互換性維持

**Objective:** As a ユーザー, I want 移行後も既存の操作フローが変わらない, so that 学習コストなく継続して利用できる

#### Acceptance Criteria

1. When ユーザーがコンテキストメニューから「名前を変更」を選択する, the アプリケーション shall リネームダイアログを開く
2. When ユーザーがコンテキストメニューから「移動」を選択する, the アプリケーション shall 移動ダイアログを開く
3. When ユーザーがコンテキストメニューから「削除」を選択する, the アプリケーション shall 削除確認ダイアログを開く
4. The 移行後のメニュー shall 既存のアイコン（Lucide React）を使用する
5. The 移行後のメニュー shall 既存の日本語ラベルを維持する

### Requirement 8: スタイルの統一

**Objective:** As a ユーザー, I want 統一されたデザインの UI を使用する, so that 一貫した体験が得られる

#### Acceptance Criteria

1. The Mantine コンポーネント shall アプリケーションの既存カラースキームに適合する
2. The Mantine コンポーネント shall 既存のフォント設定を継承する
3. If カスタムスタイルが必要な場合, the アプリケーション shall Mantine のスタイル API を使用してカスタマイズする
4. The 移行後の UI shall 視覚的な一貫性を維持する

### Requirement 9: 将来的な拡張性

**Objective:** As a 開発者, I want Mantine を他のコンポーネントにも順次適用する, so that UI 全体の品質と生産性を向上できる

#### Acceptance Criteria

1. The Mantine 導入 shall 将来的に他の UI コンポーネント（Dialog, Modal, Form 等）への適用を可能にする
2. Where MoveDialog の改善が必要な場合, the アプリケーション shall Mantine Tree コンポーネントの採用を検討する
3. The 現在の移行スコープ shall DevTools 移行、長押し修正、ContextMenu/DropdownMenu を優先し、他は将来の拡張ポイントとして記録する

---

## 成功基準（Success Metrics）

本フェーズの達成度を測定する指標：

| 指標                                 | 現状  | 目標              |
| ------------------------------------ | ----- | ----------------- |
| DevTools UI コンポーネント使用       | あり  | なし              |
| useAtomsDevtools による Redux 連携   | なし  | あり              |
| Mantine 7 への依存                   | あり  | なし（overrides） |
| Mantine 8 の導入                     | なし  | あり              |
| 長押し操作のバグ                     | 3件   | 0件               |
| 独自 UI コンポーネント（メニュー系） | 2件   | 0件               |
| ContextMenu 内の独自ロジック         | 3箇所 | 0箇所             |
| DropdownMenu 内の独自ロジック        | 3箇所 | 0箇所             |
| カスタム useLongPress フック         | 1件   | 0件               |
| 既存テストのパス率                   | 100%  | 100%              |
| 既存機能の動作維持                   | -     | 全件              |
| Mantine コンポーネント利用可能       | -     | 120+ 種類         |

### 副次的効果

- 長押し操作の安定化（PC・タッチデバイス共通）
- カスタム useLongPress フックの削除（独自実装 → @mantine/hooks）
- useEffect 使用箇所の削減（ContextMenu: 2箇所、DropdownMenu: 2箇所 → 各 0箇所）
- アクセシビリティ対応の標準化
- キーボードナビゲーションの品質向上
- バンドルサイズの最適化（Mantine 7 の実質的な除去）
- Redux DevTools による Time-travel debugging の維持
