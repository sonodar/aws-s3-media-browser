# Requirements Document

## Introduction

AWS S3 Photo Browser における非同期データ取得を TanStack Query に移行し、サムネイル遅延表示バグ解決の基盤を整備します。

この要件定義は .kiro/specs/jotai-suspense-migration/requirements.md によって生成されたものを、選定技術を変更して引き継いだものです。
なお、失敗した `jotai-suspense-migration` のソースコードは破棄済みです。

### 最終目的：サムネイル遅延表示バグの解決

アップロード直後のファイルでサムネイルが正しく表示されない問題があります。

#### サムネイル生成の仕組み

1. ユーザーがファイルをアップロード
2. S3 トリガー Lambda がサムネイルを**非同期生成**（数秒かかる）
3. サムネイル生成完了後に表示

**遅延表示自体は必須の仕様**です。問題は、この遅延を管理する状態が複雑で追跡困難なことにあります。

#### 現在の問題

| 管理対象                       | 現状の実装                     | 問題                                |
| ------------------------------ | ------------------------------ | ----------------------------------- |
| どのファイルがアップロード中か | `useUploadTracker` の useState | 手動管理、useEffect チェーン        |
| サムネイル生成待機中か         | `ThumbnailImage` の useState   | 遅延タイマー + 再試行ロジックが複雑 |
| いつサムネイルを取得するか     | useEffect の依存配列           | 実行タイミングの追跡が困難          |

これらの状態遷移が useEffect チェーンで管理されており、人間にも AI にもデバッグが困難な状態です。

### 段階的アーキテクチャ改善

| Phase       | 目標                              | 状態           | サムネイルバグへの貢献                         |
| ----------- | --------------------------------- | -------------- | ---------------------------------------------- |
| Phase 1     | Jotai 導入 + クライアント状態整理 | ✅ 完了        | 状態の可視化、デバッグ容易性向上               |
| **Phase 2** | **TanStack Query による非同期化** | **🎯 本 spec** | **データ取得パターンの標準化、useEffect 削減** |
| Phase 3     | サムネイル遅延管理の改善          | 📋 次 spec     | ThumbnailImage + useUploadTracker の整理       |

### 背景と課題

Phase 1 でクライアント状態の store ベース管理を実現しましたが、以下のデータ取得処理には依然として `useEffect` + `useState` パターンが残存しています：

| 対象                   | ファイル                  | 問題                                           |
| ---------------------- | ------------------------- | ---------------------------------------------- |
| **IdentityId 取得**    | `useIdentityId.ts`        | 認証セッションからの ID 取得を手動管理         |
| **ストレージ操作**     | `useStorageOperations.ts` | ファイル一覧取得の状態・ローディングを手動管理 |
| **フォルダ一覧**       | `FolderBrowser.tsx`       | 移動先フォルダ選択用の一覧取得を手動管理       |
| **プレビュースライド** | `PreviewModal.tsx`        | プレビュー用 URL 取得を手動管理                |

#### Phase 2 がサムネイルバグ解決に貢献する理由

Phase 3 で ThumbnailImage / useUploadTracker を修正する前に、**非同期データ取得パターンを標準化**しておく必要があります：

1. **useEffect の撲滅**: データ取得の useEffect を TanStack Query の useQuery に置換し、コードベース全体の useEffect 密度を下げる
2. **ボイラープレートの削減**: useState + useEffect + クリーンアップの定型コードを useQuery 一行に置換
3. **DevTools による可視化**: React Query DevTools で全クエリ状態を追跡可能にする
4. **副次的効果としてのキャッシュ管理**: staleTime, gcTime, invalidateQueries も使えるようになる

これらの基盤が整うことで、Phase 3 でのサムネイル遅延管理ロジックの整理が容易になります。

### 解決アプローチ

TanStack Query を導入することで：

1. **非同期処理の宣言的管理**: useQuery / useMutation でデータ取得・更新を定義
2. **useEffect 排除**: データ取得の `useEffect` を useQuery に置換
3. **Phase 3 への基盤提供**: サムネイル遅延表示ロジックを TanStack Query 化する土台を構築

### 技術選択：TanStack Query を選択した理由

Phase 1 で Jotai を選択した際、Jotai + Suspense による非同期管理も検討しましたが、実装を進める中で以下の問題が明らかになりました：

#### Jotai + Suspense で発生した問題

| 問題                             | 詳細                                                              |
| -------------------------------- | ----------------------------------------------------------------- |
| Suspense 境界配置の複雑さ        | 機能単位で適切に境界を配置しないと意図しないサスペンドが発生      |
| ダイアログフリーズバグ           | refreshItems() によるサスペンドでダイアログが操作不能になる       |
| startTransition ワークアラウンド | 上記回避のため全 refreshItems() を startTransition でラップが必要 |
| キャッシュの暗黙性               | いつ再計算されるか追跡困難、staleTime 相当の概念がない            |

<details>
<summary>📋 Jotai + Suspense 実装の詳細と断念の経緯</summary>

**実装の経緯**

Phase 1 で Jotai を導入した際、「将来の Suspense 統合」を見据えていました。Phase 2 では以下の理由から Jotai + Suspense（async 派生 atom）を選択しました：

1. **追加ライブラリ不要**: Jotai 単体で Suspense 対応が可能
2. **統一的なメンタルモデル**: 「すべてが atom」という一貫した設計
3. **思想の転換**: 「Promise そのものをステートとして扱う」という uhyo 氏の提唱するパターン

参考: [jotaiによるReact再入門（uhyo）](https://zenn.dev/uhyo/books/learn-react-with-jotai)

**発生した問題**

| 問題                         | 詳細                                                                                                                            | 影響         |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| **ダイアログフリーズ**       | ファイル操作後の `refreshItems()` が Suspense をトリガーし、開いているダイアログ（MoveDialog, RenameDialog 等）が操作不能になる | UX 致命的    |
| **startTransition の必須化** | 上記回避のため `startTransition(() => refreshItems())` を全箇所に適用が必要                                                     | 保守性低下   |
| **Suspense 境界の複雑化**    | 各機能コンポーネントに細かく境界を配置する必要があり、意図しないサスペンドが発生                                                | デバッグ困難 |

**断念の決定**

Jotai + Suspense は「読み取り専用のデータ表示」には適していますが、本プロジェクトのように「ファイル操作後に UI をブロックせず再取得」というユースケースには不向きでした。

**学び**

- Suspense は「最初のデータ取得」には優れているが、「更新後の再取得」では UI ブロックが問題になる
- サーバー状態管理には専用ライブラリ（TanStack Query）が適している
- 「シンプルさ」を求めたつもりが、ユースケースと一致せずにかえって複雑になってしまった。

前回の要件定義: `.kiro/specs/jotai-suspense-migration/requirements.md`

</details>

#### TanStack Query の利点

| 観点                     | TanStack Query の強み                                |
| ------------------------ | ---------------------------------------------------- |
| **useEffect 不要**       | useQuery/useMutation でデータ取得、useEffect 不要    |
| **ボイラープレート削減** | isLoading, isError, data で状態管理が宣言的          |
| **リフレッシュ**         | invalidateQueries は即座に返り、バックグラウンド更新 |
| **DevTools**             | 優秀な可視化ツールで状態追跡が容易                   |
| **副次的にキャッシュも** | staleTime, gcTime も使えて便利                       |

#### 決定：TanStack Query

**Phase 2 では TanStack Query を採用**します。

**採用理由:**

1. **useEffect の撲滅**
   - データ取得を useQuery に置換し、useEffect + useState パターンを根絶
   - クリーンアップ関数やレースコンディションの心配が不要

2. **ボイラープレートの大幅削減**
   - isLoading, isError, data で状態管理が宣言的に
   - 複雑な状態管理ロジックを 1 行の useQuery に置換

3. **副次的なメリット**
   - staleTime, gcTime によるキャッシュ制御も可能
   - React Query DevTools による可視化も便利

**Jotai との共存:**

- Jotai はクライアント状態（選択、ソート、パス）の管理に継続使用
- TanStack Query はサーバー状態（S3 データ、認証情報）の管理に使用
- 責務を明確に分離することで、各ライブラリの強みを活かす

---

## Requirements

### Requirement 1: TanStack Query 基盤の構築

**Objective:** As a 開発者, I want TanStack Query の基盤を確立したい, so that 以降の実装で一貫したパターンを適用できる

#### Acceptance Criteria

1. The Photo Browser shall QueryClientProvider をアプリケーションルートで提供する
2. The Photo Browser shall QueryClient にデフォルトのキャッシュ設定（staleTime, gcTime, retry）を定義する
3. When 開発環境で実行するとき, the Photo Browser shall React Query DevTools を表示する
4. When ビルドするとき, the Photo Browser shall DevTools を本番ビルドから除外する
5. The Photo Browser shall 非同期状態を TanStack Query、クライアント状態を Jotai で管理する責務分離を維持する

### Requirement 2: 認証状態の TanStack Query 化

**Objective:** As a 開発者, I want 認証状態の取得を useQuery 化したい, so that useEffect + useState のボイラープレートを削減できる

#### Acceptance Criteria

1. When ユーザーが認証済みのとき, the Photo Browser shall useQuery で Identity ID を取得する
2. The Identity ID クエリ shall staleTime: Infinity でセッション中のキャッシュを維持する
3. If Identity ID の取得に失敗したとき, then the Photo Browser shall エラー状態を isError で検出しエラー UI を表示する
4. The Photo Browser shall 既存の `useIdentityId` を useQuery ベースに置換する

### Requirement 3: ストレージ一覧取得の TanStack Query 化（Read のみ）

**Objective:** As a 開発者, I want ストレージ一覧取得を useQuery 化したい, so that useEffect + useState のボイラープレートを削減できる

#### Acceptance Criteria

1. When 現在のパスが変更されたとき, the Photo Browser shall queryKey にパスを含む useQuery でファイル一覧を取得する
2. The ファイル一覧クエリ shall queryKey: ["storage", identityId, path] で一意に識別する
3. While ファイル一覧を取得中のとき, the Photo Browser shall isLoading でローディング状態を検出しローディング UI を表示する
4. When ファイル操作（アップロード、削除、移動、リネーム、フォルダ作成）が完了したとき, the Photo Browser shall invalidateQueries でファイル一覧を再取得する
5. The Photo Browser shall `useStorageOperations` のファイル一覧取得部分を useQuery ベースに置換する

> **Note:** Storage Write 操作（アップロード、削除、移動、リネーム、フォルダ作成）は Phase 3 で useMutation 化します。

### Requirement 4: フォルダ選択の TanStack Query 化

**Objective:** As a 開発者, I want 移動ダイアログのフォルダ一覧取得を useQuery 化したい, so that useEffect + useState のボイラープレートを削減できる

#### Acceptance Criteria

1. When MoveDialog でパスを選択するとき, the Photo Browser shall queryKey にパスを含む useQuery でサブフォルダ一覧を取得する
2. The フォルダ一覧クエリ shall queryKey: ["folders", identityId, path] で一意に識別する
3. While フォルダ一覧を取得中のとき, the Photo Browser shall isLoading でローディング状態を検出しローディング UI を表示する
4. The Photo Browser shall `FolderBrowser.tsx` 内の useEffect を useQuery ベースに置換する

### Requirement 5: プレビュー URL の TanStack Query 化

**Objective:** As a 開発者, I want プレビュー用 URL 取得を useQuery 化したい, so that useEffect + useState のボイラープレートを削減できる

#### Acceptance Criteria

1. When プレビューモーダルを開くとき, the Photo Browser shall queryKey にアイテムキーを含む useQuery でメディア URL を取得する
2. The URL クエリ shall queryKey: ["preview", itemKey] で一意に識別する
3. While URL を取得中のとき, the Photo Browser shall isLoading でローディング状態を検出しローディング UI を表示する
4. The Photo Browser shall `PreviewModal.tsx` 内の useEffect を useQuery ベースに置換する

### Requirement 6: パスキー管理の TanStack Query 化

**Objective:** As a 開発者, I want パスキー（WebAuthn）の一覧取得・登録・削除を useQuery + useMutation 化したい, so that useEffect + useState のボイラープレートを削減できる

#### Acceptance Criteria

1. When パスキー設定画面を表示するとき, the Photo Browser shall useQuery でクレデンシャル一覧を取得する
2. When パスキーを登録するとき, the Photo Browser shall useMutation で処理し、成功時に invalidateQueries でクレデンシャル一覧を再取得する
3. When パスキーを削除するとき, the Photo Browser shall useMutation で処理し、成功時に invalidateQueries でクレデンシャル一覧を再取得する
4. The Photo Browser shall 既存の `usePasskey` を useQuery + useMutation ベースに置換する

### Requirement 7: 既存機能の互換性維持

**Objective:** As a ユーザー, I want TanStack Query 移行後も現在の機能がすべて動作してほしい, so that 移行による機能退行がない

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
10. The Photo Browser shall パスキー管理機能を維持する

---

## 技術的制約（Architecture Constraints）

### Constraint 0: 実装順序

Auth 関連を先に完了させることで、認証基盤が確立された状態で Storage 関連に進めます。

| 順序 | 対象                         | 分類    | 理由                                     |
| ---- | ---------------------------- | ------- | ---------------------------------------- |
| 1    | TanStack Query 基盤（Req 1） | 基盤    | QueryClientProvider の配置が前提         |
| 2    | 認証状態の Query 化（Req 2） | Auth    | Identity ID が他のクエリの依存先となる   |
| 3    | パスキー管理（Req 6）        | Auth    | 認証機能の一部として Auth 関連を先に完了 |
| 4    | ストレージ一覧（Req 3）      | Storage | Identity ID + currentPath に依存         |
| 5    | フォルダ選択（Req 4）        | Storage | ストレージ一覧と同様のパターン           |
| 6    | プレビュー URL（Req 5）      | Storage | 同上                                     |
| 7    | 互換性確認（Req 7）          | 検証    | 全機能の動作確認                         |

### Constraint 1: useEffect 使用基準（Phase 1 継続）

Phase 1 で定義した useEffect 使用基準を継続適用します。

#### 許可される用途

| 用途                     | 例                                     | 理由                       |
| ------------------------ | -------------------------------------- | -------------------------- |
| ブラウザ API リスナー    | `popstate`, `resize`, `online/offline` | 外部イベントソースとの同期 |
| DOM 直接操作             | フォーカス管理、スクロール位置         | React 外部の DOM 状態      |
| サードパーティライブラリ | 地図、チャートの初期化                 | 外部ライブラリとの同期     |

#### 禁止される用途（TanStack Query で代替）

| 用途               | 代替手段                        | 理由                        |
| ------------------ | ------------------------------- | --------------------------- |
| データフェッチ     | useQuery                        | 宣言的なデータ取得          |
| データ更新         | useMutation + invalidateQueries | 更新後の自動再取得          |
| 取得結果の状態管理 | isLoading, isError, data        | 明示的なローディング/エラー |
| 依存データの再取得 | queryKey の変更による自動再取得 | 宣言的な依存関係定義        |

### Constraint 2: TanStack Query 設計原則

| 原則                     | 実装方法                                        |
| ------------------------ | ----------------------------------------------- |
| queryKey の一貫性        | ["domain", ...params] 形式で一意に識別          |
| staleTime の適切な設定   | 更新頻度に応じて設定（Identity ID は Infinity） |
| invalidateQueries の活用 | 更新操作後はキャッシュ無効化で再取得をトリガー  |
| 型安全性                 | queryFn の戻り値型を明示的に定義                |

### Constraint 3: 状態管理の責務分離

| 状態種別         | 管理手段       | 例                            |
| ---------------- | -------------- | ----------------------------- |
| サーバー状態     | TanStack Query | ファイル一覧、URL、認証情報   |
| クライアント状態 | Jotai          | 選択状態、ソート設定、UI 状態 |
| URL 状態         | URL パラメータ | 現在のパス                    |

---

## 成功基準（Success Metrics）

### Phase 2 完了基準

| 指標                       | 現状  | 目標  | 詳細                                    |
| -------------------------- | ----- | ----- | --------------------------------------- |
| データ取得 useEffect       | 5箇所 | 0箇所 | useQuery に移行                         |
| ローディング状態の手動管理 | 5箇所 | 0箇所 | isLoading で宣言的に管理                |
| エラー状態の手動管理       | 5箇所 | 0箇所 | isError で宣言的に管理                  |
| パスキー更新操作の手動管理 | 2箇所 | 0箇所 | invalidateQueries に統一（登録 + 削除） |

> **Note:** Storage Write 操作（アップロード、削除、移動、リネーム、フォルダ作成）の useMutation 化は Phase 3 で対応します。

### サムネイルバグ解決への貢献（Phase 3 準備）

| 準備項目                   | Phase 2 での達成                              |
| -------------------------- | --------------------------------------------- |
| **useEffect の撲滅**       | データ取得の useEffect を useQuery に置換     |
| **ボイラープレート削減**   | useState + useEffect を宣言的なパターンに統一 |
| データ取得パターンの標準化 | useQuery による統一的なパターン確立           |
| 状態遷移の可視化           | React Query DevTools で全クエリ状態を追跡可能 |

### 対象箇所（本 Phase スコープ）

| ファイル                  | useEffect 用途         | 移行先   |
| ------------------------- | ---------------------- | -------- |
| `useIdentityId.ts`        | 認証セッション取得     | useQuery |
| `useStorageOperations.ts` | ファイル一覧取得       | useQuery |
| `FolderBrowser.tsx`       | フォルダ一覧取得       | useQuery |
| `PreviewModal.tsx`        | プレビュー URL 取得    | useQuery |
| `usePasskey.ts`           | クレデンシャル一覧取得 | useQuery |

### 対象外（Phase 3 で対応）

| ファイル                  | 用途                     | Phase 3 での対応                         |
| ------------------------- | ------------------------ | ---------------------------------------- |
| `useStorageOperations.ts` | ファイル操作（Write 系） | useMutation 化（Upload/Delete/Move/etc） |
| `ThumbnailImage.tsx`      | サムネイル URL 取得      | useQuery + アップロード完了との連携      |
| `useUploadTracker.ts`     | アップロード状態追跡     | useMutation との統合                     |

> **Note:** `useStorageOperations.ts` の Read 部分（ファイル一覧取得）は Phase 2 で対応し、Write 部分は Phase 3 で対応します。

### 許可用途（移行対象外）

| ファイル                | useEffect 用途        | 理由              |
| ----------------------- | --------------------- | ----------------- |
| `useStoragePath.ts`     | popstate リスナー     | ブラウザ API 同期 |
| `useWebAuthnSupport.ts` | WebAuthn API チェック | ブラウザ API 同期 |
