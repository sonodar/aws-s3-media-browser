# Requirements Document

## Introduction

AWS S3 Photo Browser における非同期データ取得を Jotai + Suspense パターンに移行し、サムネイル遅延表示バグ解決の基盤を整備します。

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

| Phase       | 目標                                | 状態           | サムネイルバグへの貢献                         |
| ----------- | ----------------------------------- | -------------- | ---------------------------------------------- |
| Phase 1     | Jotai 導入 + クライアント状態整理   | ✅ 完了        | 状態の可視化、デバッグ容易性向上               |
| **Phase 2** | **Jotai + Suspense による非同期化** | **🎯 本 spec** | **データ取得パターンの標準化、useEffect 削減** |
| Phase 3     | サムネイル遅延管理の改善            | 📋 次 spec     | ThumbnailImage + useUploadTracker の整理       |

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

1. **useEffect の削減**: データ取得の useEffect を Suspense 対応 atom に置換し、コードベース全体の useEffect 密度を下げる
2. **Suspense による宣言的ローディング管理**: `<Suspense fallback={...}>` でローディング状態を宣言的に管理
3. **状態管理の統一**: すべての状態（クライアント状態 + サーバー状態）を Jotai atom で統一的に管理
4. **DevTools による可視化**: Redux DevTools（jotai-devtools 経由）で全状態を追跡可能にする

これらの基盤が整うことで、Phase 3 でのサムネイル遅延管理ロジックの整理が容易になります。

### 解決アプローチ

Jotai + Suspense パターンを導入することで：

1. **非同期処理の宣言的管理**: async 派生 atom で非同期処理を定義し、Suspense でローディングを管理
2. **useEffect 排除**: データ取得の `useEffect` を async 派生 atom に置換
3. **状態管理の統一**: クライアント状態もサーバー状態も Jotai atom で統一的に管理
4. **Phase 3 への基盤提供**: サムネイル URL 取得を Suspense 対応 atom 化する土台を構築

### 技術選択：3つの選択肢の評価

Phase 1 で Jotai を選択した理由の一つに「将来の Suspense 統合」がありました（[research.md 参照](./../archive/client-state-store/research.md)）。Phase 2 での非同期データ取得パターンとして、3つの選択肢を評価しました。

#### 選択肢 1: Jotai + Suspense（async 派生 atom）

**TanStack Query を使わず、Jotai 単体で Suspense 対応を実現**する方法です。

参考: [jotaiによるReact再入門（uhyo）](https://zenn.dev/uhyo/books/learn-react-with-jotai)

```typescript
// async 派生 atom で非同期処理を定義
const userAtom = atom(async (): Promise<User> => {
  const user = await fetchUser();
  return user;
});

// useAtomValue は内部で use を使用し、自動的にサスペンド
const user: User = useAtomValue(userAtom);
```

**特徴:**

- 派生 atom の読み取り関数で async 関数を返すと、Promise がキャッシュされる
- `useAtomValue` は Promise を検知すると自動的にサスペンドし、解決後の値を返す
- パラメータ付き非同期処理は、パラメータ atom に依存する派生 atom で実現
- `atomFamily`（jotai-family）で複数パラメータのキャッシュも可能

**思想の転換（uhyo 氏の記事より）:**

- 従来: 「ボタンクリック→非同期処理→ステート更新→UI更新」
- Suspense + Jotai: 「ボタンクリック→ステート更新→非同期処理（サスペンド）→UI更新」
- **Promise そのものをステートとして扱う**

#### 選択肢 2: TanStack Query 直接利用

**useQuery / useMutation を直接使用**し、Jotai はクライアント状態のみに使用する方法です。

```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ["users", userId],
  queryFn: () => fetchUser(userId),
});
```

**特徴:**

- 豊富なドキュメント、成熟したエコシステム
- React Query DevTools による詳細な可視化
- キャッシュ管理（staleTime, gcTime）、再取得ロジック（refetch, invalidation）が充実
- サーバー状態 = TanStack Query、クライアント状態 = Jotai という責務分離

#### 選択肢 3: jotai-tanstack-query

**TanStack Query を Jotai atom でラップ**する方法です。

```typescript
const userAtom = atomWithQuery((get) => ({
  queryKey: ["users", get(userIdAtom)],
  queryFn: () => fetchUser(get(userIdAtom)),
}));
```

**特徴:**

- TanStack Query の機能を atom モデルで利用可能
- `atomWithSuspenseQuery` で Suspense 対応
- atom 間の依存関係を `get(otherAtom)` で宣言的に定義
- 同じ QueryClient インスタンスの共有が必要

#### 比較まとめ

| 観点                   | Jotai + Suspense                   | TanStack Query 直接    | jotai-tanstack-query      |
| ---------------------- | ---------------------------------- | ---------------------- | ------------------------- |
| **Suspense 対応**      | ◎ ネイティブ対応                   | ○ useSuspenseQuery     | ◎ atomWithSuspenseQuery   |
| **追加ライブラリ**     | ◎ 不要（Jotai のみ）               | △ TanStack Query 追加  | △ 両方必要                |
| **状態管理の統一性**   | ◎ すべて atom                      | △ 2つのモデルが共存    | ○ atom ベースだが内部は別 |
| **学習コスト**         | ○ Jotai + Suspense                 | ○ TanStack Query       | △ 両方の理解が必要        |
| **ドキュメント**       | ○ Jotai 公式 + uhyo 本             | ◎ 豊富                 | △ 限定的                  |
| **キャッシュ管理**     | ○ atom キャッシュ                  | ◎ 高機能（stale, gc）  | ◎ TanStack Query 機能     |
| **DevTools**           | ○ Redux DevTools（jotai-devtools） | ◎ React Query DevTools | ○ 両方利用可能            |
| **Phase 1 との一貫性** | ◎ 同じ Jotai パターン              | △ 新しいパターン追加   | ○ atom ベースで統一       |

#### 決定：Jotai + Suspense（async 派生 atom）

**Phase 2 では Jotai + Suspense パターンを採用**します。

**採用理由:**

1. **Suspense が今回の目的に直結**
   - サムネイル遅延表示バグの根本原因は「非同期処理の状態管理が複雑」であること
   - Suspense により `<Suspense fallback={...}>` でローディング状態を宣言的に管理できる
   - useEffect + useState による手動管理を排除できる

2. **Phase 1 との一貫性**
   - Phase 1 で導入した Jotai をそのまま活用
   - 「すべてが atom」という統一的なメンタルモデルを維持
   - 新しいライブラリ（TanStack Query）の追加が不要

3. **思想の転換による根本解決**
   - 従来の「非同期処理の結果をステートに保存」から「Promise そのものをステートとして扱う」へ
   - この思想の転換が、サムネイル遅延管理の複雑さを根本から解決する基盤となる

4. **シンプルさ**
   - 追加ライブラリが不要（Jotai のみ）
   - 抽象レイヤーが少なく、問題の特定が容易

**TanStack Query を選ばなかった理由:**

- Suspense 対応は TanStack Query でも可能だが、Jotai と2つのモデルが共存することになる
- Phase 1 で Jotai を選択した理由の一つが「将来の Suspense 統合」であり、その方針を継続
- 本プロジェクトの規模では、TanStack Query の高機能なキャッシュ管理（staleTime, gcTime）は過剰

**jotai-tanstack-query を選ばなかった理由:**

- Jotai 単体で Suspense 対応が可能であり、TanStack Query を追加する必要がない
- 抽象レイヤーを増やすメリットが不明確

---

## Requirements

### Requirement 1: Suspense 対応基盤の構築

**Objective:** As a 開発者, I want Suspense 対応の非同期 atom パターンを確立したい, so that 以降の実装で一貫したパターンを適用できる

#### Acceptance Criteria

1. The Photo Browser shall アプリケーションルートで Suspense 境界（ErrorBoundary + Suspense）を提供する
2. The Photo Browser shall async 派生 atom で非同期データ取得を定義する
3. The Photo Browser shall useAtomValue による自動サスペンドでローディング状態を管理する
4. The Photo Browser shall Redux DevTools（jotai-devtools） で全状態（同期 + 非同期）を可視化する
5. When ビルドするとき, the Photo Browser shall DevTools を本番ビルドから除外する
6. The Photo Browser shall 非同期状態もクライアント状態も統一的に Jotai atom で管理する
7. The Photo Browser shall Suspense fallback でローディング UI を宣言的に定義する
8. The Photo Browser shall ErrorBoundary でエラー状態を宣言的に処理する

### Requirement 2: 認証状態の Suspense 対応 atom 化

**Objective:** As a 開発者, I want 認証状態の取得を async 派生 atom 化したい, so that 認証情報を Suspense で宣言的に管理できる

#### Acceptance Criteria

1. When ユーザーが認証済みのとき, the Photo Browser shall async 派生 atom で Identity ID を取得する
2. The Identity ID atom shall Promise をキャッシュし、同一セッション内での再計算を回避する
3. If Identity ID の取得に失敗したとき, then the Photo Browser shall ErrorBoundary でエラー状態を処理する
4. The Photo Browser shall 既存の `useIdentityId` を async 派生 atom + useAtomValue に置換する

### Requirement 3: ストレージ一覧取得の Suspense 対応 atom 化（Read のみ）

**Objective:** As a 開発者, I want ストレージ一覧取得を Suspense 対応 atom 化したい, so that ファイル一覧取得を宣言的に管理できる

#### Acceptance Criteria

1. When 現在のパスが変更されたとき, the Photo Browser shall パス依存の async 派生 atom でファイル一覧を取得する
2. The ファイル一覧 atom shall パス atom に依存し、パス変更時に自動的に再計算する
3. The Photo Browser shall `useStorageOperations` のファイル一覧取得部分を async 派生 atom + useAtomValue に置換する

> **Note:** Storage Write 操作（アップロード、削除、移動、リネーム、フォルダ作成）は Phase 3 で対応します。

### Requirement 4: フォルダ選択の Suspense 対応 atom 化

**Objective:** As a 開発者, I want 移動ダイアログのフォルダ一覧取得を async 派生 atom 化したい, so that フォルダツリーを Suspense で宣言的に管理できる

#### Acceptance Criteria

1. When MoveDialog でパスを選択するとき, the Photo Browser shall パス依存の async 派生 atom でサブフォルダ一覧を取得する
2. The フォルダ一覧 atom shall 選択パス atom に依存し、パス変更時に自動的にサスペンドする
3. While フォルダ一覧を取得中のとき, the Photo Browser shall Suspense fallback でローディング状態を表示する
4. The Photo Browser shall `FolderBrowser.tsx` 内の useEffect を async 派生 atom + useAtomValue に置換する

### Requirement 5: プレビュー URL の Suspense 対応 atom 化

**Objective:** As a 開発者, I want プレビュー用 URL 取得を async 派生 atom 化したい, so that メディア URL を Suspense で宣言的に管理できる

#### Acceptance Criteria

1. When プレビューモーダルを開くとき, the Photo Browser shall アイテム依存の async 派生 atom でメディア URL を取得する
2. The URL atom shall 現在のプレビューアイテム atom に依存し、アイテム変更時に自動的にサスペンドする
3. While URL を取得中のとき, the Photo Browser shall Suspense fallback でローディング状態を表示する
4. The Photo Browser shall `PreviewModal.tsx` 内の useEffect を async 派生 atom + useAtomValue に置換する

### Requirement 6: パスキー管理の Suspense 対応 atom 化

**Objective:** As a 開発者, I want パスキー（WebAuthn）一覧取得を async 派生 atom 化したい, so that クレデンシャル情報を Suspense で宣言的に管理できる

#### Acceptance Criteria

1. When パスキー設定画面を表示するとき, the Photo Browser shall async 派生 atom でクレデンシャル一覧を取得する
2. When パスキーを登録するとき, the Photo Browser shall writable atom で処理し、成功時にクレデンシャル一覧 atom を再計算させる
3. When パスキーを削除するとき, the Photo Browser shall writable atom で処理し、成功時にクレデンシャル一覧 atom を再計算させる
4. The Photo Browser shall 既存の `usePasskey` を async 派生 atom + writable atom に置換する

### Requirement 7: 既存機能の互換性維持

**Objective:** As a ユーザー, I want Jotai + Suspense 移行後も現在の機能がすべて動作してほしい, so that 移行による機能退行がない

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

| 順序 | 対象                        | 分類    | 理由                                        |
| ---- | --------------------------- | ------- | ------------------------------------------- |
| 1    | Suspense 対応基盤（Req 1）  | 基盤    | ErrorBoundary + Suspense の配置が前提       |
| 2    | 認証状態の atom 化（Req 2） | Auth    | `identityIdAtom` が他の atom の依存先となる |
| 3    | パスキー管理（Req 6）       | Auth    | 認証機能の一部として Auth 関連を先に完了    |
| 4    | ストレージ一覧（Req 3）     | Storage | `identityIdAtom` + `currentPathAtom` に依存 |
| 5    | フォルダ選択（Req 4）       | Storage | ストレージ一覧と同様のパターン              |
| 6    | プレビュー URL（Req 5）     | Storage | 同上                                        |
| 7    | 互換性確認（Req 7）         | 検証    | 全機能の動作確認                            |

### Constraint 1: useEffect 使用基準（Phase 1 継続）

Phase 1 で定義した useEffect 使用基準を継続適用します。

#### 許可される用途

| 用途                     | 例                                     | 理由                       |
| ------------------------ | -------------------------------------- | -------------------------- |
| ブラウザ API リスナー    | `popstate`, `resize`, `online/offline` | 外部イベントソースとの同期 |
| DOM 直接操作             | フォーカス管理、スクロール位置         | React 外部の DOM 状態      |
| サードパーティライブラリ | 地図、チャートの初期化                 | 外部ライブラリとの同期     |

#### 禁止される用途（Jotai + Suspense で代替）

| 用途               | 代替手段                                 | 理由                        |
| ------------------ | ---------------------------------------- | --------------------------- |
| データフェッチ     | async 派生 atom + useAtomValue           | Suspense による宣言的管理   |
| データ更新         | writable atom                            | atom の再計算による更新     |
| 取得結果の状態管理 | Suspense + ErrorBoundary                 | 宣言的なローディング/エラー |
| 依存データの再取得 | 派生 atom の依存関係（`get(otherAtom)`） | 宣言的な依存関係定義        |

### Constraint 2: 非同期 atom 設計

| 原則                       | 実装方法                                           |
| -------------------------- | -------------------------------------------------- |
| パラメータ依存の atom      | パラメータ atom に `get()` で依存する派生 atom     |
| 複数パラメータのキャッシュ | atomFamily（jotai-family）で複数キーを管理         |
| 再計算トリガー             | 依存先 atom の更新で自動再計算（Promise の再生成） |
| 型安全性                   | async 関数の戻り値型を明示的に定義                 |

### Constraint 3: 状態管理の統一

| 状態種別   | 管理手段            | 例                                 |
| ---------- | ------------------- | ---------------------------------- |
| 非同期状態 | async 派生 atom     | ファイル一覧、URL、認証情報        |
| 同期状態   | primitive/派生 atom | 選択状態、ソート設定、UI 状態      |
| URL 状態   | URL パラメータ      | 現在のパス                         |
| 更新操作   | writable atom       | アップロード、削除、移動、リネーム |

---

## 成功基準（Success Metrics）

### Phase 2 完了基準

| 指標                       | 現状  | 目標  | 詳細                                |
| -------------------------- | ----- | ----- | ----------------------------------- |
| データ取得 useEffect       | 5箇所 | 0箇所 | async 派生 atom に移行              |
| ローディング状態の手動管理 | 5箇所 | 0箇所 | Suspense fallback で宣言的に管理    |
| エラー状態の手動管理       | 5箇所 | 0箇所 | ErrorBoundary で宣言的に管理        |
| パスキー更新操作の手動管理 | 2箇所 | 0箇所 | writable atom に統一（登録 + 削除） |

> **Note:** Storage Write 操作（アップロード、削除、移動、リネーム、フォルダ作成）の writable atom 化は Phase 3 で対応します。

### サムネイルバグ解決への貢献（Phase 3 準備）

| 準備項目                   | Phase 2 での達成                                          |
| -------------------------- | --------------------------------------------------------- |
| データ取得パターンの標準化 | async 派生 atom + Suspense による統一的なパターン確立     |
| useEffect 密度の低下       | コードベース全体の useEffect を削減し見通し向上           |
| 状態管理の統一             | すべての状態（同期 + 非同期）を Jotai atom で統一的に管理 |
| 状態遷移の可視化           | Redux DevTools（jotai-devtools） で全状態を追跡可能       |

### 対象箇所（本 Phase スコープ）

| ファイル                  | useEffect 用途         | 移行先          |
| ------------------------- | ---------------------- | --------------- |
| `useIdentityId.ts`        | 認証セッション取得     | async 派生 atom |
| `useStorageOperations.ts` | ファイル一覧取得       | async 派生 atom |
| `FolderBrowser.tsx`       | フォルダ一覧取得       | async 派生 atom |
| `PreviewModal.tsx`        | プレビュー URL 取得    | async 派生 atom |
| `usePasskey.ts`           | クレデンシャル一覧取得 | async 派生 atom |

### 対象外（Phase 3 で対応）

| ファイル                  | 用途                     | Phase 3 での対応                           |
| ------------------------- | ------------------------ | ------------------------------------------ |
| `useStorageOperations.ts` | ファイル操作（Write 系） | writable atom 化（Upload/Delete/Move/etc） |
| `ThumbnailImage.tsx`      | サムネイル URL 取得      | async 派生 atom + アップロード完了との連携 |
| `useUploadTracker.ts`     | アップロード状態追跡     | writable atom との統合                     |

> **Note:** `useStorageOperations.ts` の Read 部分（ファイル一覧取得）は Phase 2 で対応し、Write 部分は Phase 3 で対応します。

### 許可用途（移行対象外）

| ファイル                | useEffect 用途        | 理由              |
| ----------------------- | --------------------- | ----------------- |
| `useStoragePath.ts`     | popstate リスナー     | ブラウザ API 同期 |
| `useWebAuthnSupport.ts` | WebAuthn API チェック | ブラウザ API 同期 |
