# Requirements Document

## Introduction

Phase 3: サムネイル遅延表示バグの解決

Phase 2（TanStack Query 移行）で確立したデータ取得パターンを活用し、サムネイル遅延表示の問題を根本解決します。

### 背景

アップロード直後のファイルでサムネイルが正しく表示されない問題があります。

#### サムネイル生成の仕組み

1. ユーザーがファイルをアップロード
2. S3 トリガー Lambda がサムネイルを**非同期生成**（数秒かかる）
3. サムネイル生成完了後に表示

サムネイルは非同期生成のため、アップロード直後は存在しません。TanStack Query のリトライ機能で生成完了を自動的に待機することで、複雑な状態管理なしにこの問題を解決します。

### 最重要命題：現在の設計・実装を踏襲しないこと

> **現在の設計・実装がバグの根本原因**です。単なる「技術の置き換え」ではなく、**設計思想からの抜本的な見直し**が本 Phase の主旨です。

**禁止事項:**

- 現在のコードパターンを「参考」にすること
- 既存の useEffect/useState を「そのまま」TanStack Query に置き換えること
- 既存の状態遷移ロジックを維持したまま技術だけ変えること

**推奨事項:**

- ゼロベースで「あるべきデータフロー」を設計する
- TanStack Query のプリミティブ（enabled, retry, onSuccess, invalidate）で表現する
- 状態遷移を DevTools で追跡可能な形にする

### Phase 3 の目標

1. **Storage Write 操作**: useMutation による宣言的な操作管理
2. **サムネイル URL 取得**: useQuery による宣言的なデータ取得とキャッシュ制御

### Phase 2 での準備完了項目

| 準備項目                   | Phase 2 での達成                               |
| -------------------------- | ---------------------------------------------- |
| TanStack Query 基盤        | QueryClient, queryKeys, DevTools 導入済み      |
| Read 操作の Query 化       | useStorageItems, useFolderList, usePreviewUrls |
| invalidateQueries パターン | 操作後のキャッシュ無効化パターン確立           |

---

## Requirements

### Requirement 1: Storage Write 操作の useMutation 実装

**Objective:** As a 開発者, I want ストレージ書き込み操作を useMutation で実装したい, so that 処理中状態を宣言的に管理し、一貫した操作パターンを確立できる

#### Acceptance Criteria

1. When ユーザーがファイルをアップロードするとき, the Photo Browser shall useMutation でアップロードを実行し、isPending で処理中状態を提供する
2. When アップロードが成功したとき, the Photo Browser shall onSuccess コールバック内で invalidateQueries を呼び出し、ファイル一覧を再取得する
3. When ユーザーがファイルを削除するとき, the Photo Browser shall useMutation で削除を実行し、isPending で処理中状態を提供する
4. When ユーザーがファイルを移動するとき, the Photo Browser shall useMutation で移動を実行し、isPending で処理中状態を提供する
5. When ユーザーがファイルをリネームするとき, the Photo Browser shall useMutation でリネームを実行し、isPending で処理中状態を提供する
6. When ユーザーがフォルダを作成するとき, the Photo Browser shall useMutation でフォルダ作成を実行し、isPending で処理中状態を提供する
7. If 操作が失敗したとき, then the Photo Browser shall isError で失敗状態を提供し、error オブジェクトからエラーメッセージを取得可能にする

### Requirement 2: サムネイル URL 取得の useQuery 実装

**Objective:** As a 開発者, I want サムネイル URL 取得を useQuery で実装したい, so that キャッシュ制御とリトライを宣言的に行える

#### Acceptance Criteria

1. When サムネイル画像を表示するとき, the Photo Browser shall useQuery でサムネイル URL を取得する
2. The サムネイル URL クエリ shall queryKey: ["thumbnail", originalKey] で一意に識別される
3. While サムネイル URL を取得中のとき, the Photo Browser shall isLoading でローディング状態を提供しスケルトン UI を表示する
4. If サムネイル URL の取得に失敗したとき, then the Photo Browser shall isError で失敗状態を提供しフォールバックアイコンを表示する
5. The サムネイル URL クエリ shall retry: 4 で自動リトライを行い、サムネイル生成完了を待機する
6. The サムネイル URL クエリ shall retryDelay を指数バックオフ（1秒, 2秒, 4秒, 8秒）で設定し、Lambda 処理完了を待機する

### Requirement 3: 既存機能の互換性維持

**Objective:** As a ユーザー, I want Phase 3 移行後も現在の機能がすべて動作してほしい, so that 移行による機能退行がない

#### Acceptance Criteria

1. The Photo Browser shall ファイルのアップロード機能（重複チェック含む）を維持する
2. The Photo Browser shall ファイルの選択・複数選択・一括削除機能を維持する
3. The Photo Browser shall ファイルの移動・リネーム・ダウンロード機能を維持する
4. The Photo Browser shall フォルダ作成・削除・リネーム機能を維持する
5. The Photo Browser shall サムネイル表示機能（遅延生成対応含む）を維持する
6. The Photo Browser shall アップロード中の進捗表示・キャンセル機能を維持する
7. The Photo Browser shall 操作中のローディング表示を維持する

---

## 技術的制約（Architecture Constraints）

### Constraint 1: 実装順序

依存関係を考慮した実装順序を定義します。

| 順序 | 対象                              | 理由                                             |
| ---- | --------------------------------- | ------------------------------------------------ |
| 1    | Storage Write の useMutation 実装 | アップロード成功後にサムネイル取得が発生するため |
| 2    | サムネイル URL の useQuery 実装   | mutation 成功後のフローとして実装                |
| 3    | 互換性確認                        | 全機能の動作確認                                 |

### Constraint 2: useMutation 設計原則

| 原則                      | 実装方法                                        |
| ------------------------- | ----------------------------------------------- |
| mutationKey の一貫性      | ["storage", operation] 形式で一意に識別         |
| onSuccess での invalidate | 操作成功時に invalidateQueries で一覧を再取得   |
| isPending の活用          | 処理中状態は isPending で提供                   |
| 楽観的更新は使用しない    | S3 操作は確実性を優先し、成功後にキャッシュ更新 |

### Constraint 3: サムネイル取得戦略

| パラメータ | 値                           | 理由                                       |
| ---------- | ---------------------------- | ------------------------------------------ |
| retry      | 4                            | Lambda 処理時間を考慮した十分な回数        |
| retryDelay | exponential (1s, 2s, 4s, 8s) | バックオフで Lambda 完了を待機             |
| staleTime  | 5 minutes                    | 同一ファイルへの再アクセスでキャッシュ使用 |

> **注記**: アップロード直後のファイルは 1 回目の取得で 404 エラーになる可能性がありますが、リトライにより自動的にサムネイル生成完了を待機します。

### Constraint 4: 状態管理の責務分離

| 状態種別         | 管理手段       | 例                                 |
| ---------------- | -------------- | ---------------------------------- |
| サーバー状態     | TanStack Query | ファイル一覧、サムネイル URL       |
| 操作状態         | useMutation    | アップロード、削除、移動、リネーム |
| クライアント状態 | Jotai          | 選択状態、ソート設定               |

---

## 成功基準（Success Metrics）

### Phase 3 完了基準

| 指標                | 達成状態                                              |
| ------------------- | ----------------------------------------------------- |
| Storage Write 操作  | 全操作が useMutation で実装され、isPending で状態提供 |
| サムネイル URL 取得 | useQuery で実装され、retry/staleTime が設定済み       |

### サムネイルバグ解決の達成確認

| 確認項目                         | 期待動作                                       |
| -------------------------------- | ---------------------------------------------- |
| アップロード直後のサムネイル表示 | リトライにより数秒後に自動表示                 |
| サムネイル取得失敗時             | フォールバックアイコン表示（無限リトライなし） |
| 既存ファイルのサムネイル表示     | キャッシュにより即座に表示                     |
