# Research & Design Decisions

---

**Feature**: `tanstack-query-migration` (TanStack Query による非同期データ取得パターンへの移行)

**Discovery Scope**: Replacement（以前試みた Jotai + Suspense アプローチの代替として TanStack Query を採用）

**Key Findings**:

- TanStack Query v5 は useQuery / useMutation でサーバー状態を管理し、キャッシュ・リトライ・バックグラウンド再取得を自動化
- queryKey パターン `["domain", ...params]` で依存関係を宣言的に表現
- enabled オプションで依存クエリを制御可能
- Jotai（クライアント状態）と TanStack Query（サーバー状態）の明確な責務分離が可能
- 既存コードベースは useState + useEffect パターンが5箇所に分散

---

## Research Log

### 既存コードベースの非同期データ取得パターン分析

- **Context**: Phase 2 の移行対象を特定するため、既存の useEffect + useState パターンを調査
- **Sources Consulted**: src/hooks/_.ts, src/components/MediaBrowser/_.tsx
- **Findings**:
  - **useIdentityId.ts** (34行): シンプルな useState + useEffect パターン。fetchAuthSession() を呼び出し、identityId を state に保存。loading/error 状態も手動管理。
  - **useStorageOperations.ts** (680行): 大規模フック。items, loading, error, isDeleting, isRenaming, isMoving など多数の状態を useState で管理。fetchItems の useEffect + 複数の操作関数（upload, delete, move, rename, createFolder）を含む。
  - **FolderBrowser.tsx** (147行): folders 状態を useState で管理し、currentPath 変更時に useEffect でフォルダ一覧を取得。移動ダイアログ内のコンポーネント。
  - **PreviewModal.tsx** (211行): slides 状態を useState で管理し、items/isOpen 変更時に useEffect でメディア URL を取得。Lightbox プレビュー用。
  - **usePasskey.ts** (133行): credentials 状態を useState で管理し、fetchCredentials を useCallback で定義。register/delete 操作後に手動で refetch。
- **Implications**:
  - useStorageOperations.ts が最も複雑で、Read/Write 操作の分離が必要
  - すべてのファイルで loading/error 状態を手動管理しているため、useQuery で大幅に簡素化可能
  - パラメータ依存のデータ取得（currentPath → items, items → slides）は queryKey の依存関係で表現可能

### Jotai + Suspense アプローチの振り返り

- **Context**: 以前試みた Jotai + Suspense アプローチが失敗した理由を確認
- **Sources Consulted**: .kiro/specs/jotai-suspense-migration/research.md, docs/bug-suspense-boundary.md
- **Findings**:
  - async 派生 atom + Suspense で実装を進めたが、ダイアログ内でのフリーズバグが発生
  - startTransition でのワークアラウンドを試みたが、コードの複雑性が増大
  - Jotai 自体にはリトライ機構がなく、キャッシュ戦略も基本的
  - 結論: Jotai は優れたクライアント状態管理ライブラリだが、サーバー状態管理には専用ツールが適切
- **Implications**:
  - サーバー状態（非同期データ取得）は TanStack Query に移行
  - クライアント状態（selection, path, sort など）は Jotai を継続使用
  - 責務の明確な分離でコードの保守性を向上

### TanStack Query v5 パターンの調査

- **Context**: TanStack Query を使用した非同期データ取得パターンを調査
- **Sources Consulted**:
  - TanStack Query 公式ドキュメント
  - Context7 MCP による最新ドキュメント検索
  - Web 検索による補足調査
- **Findings**:
  - **useQuery の基本構文**:
    ```typescript
    const { data, isLoading, error } = useQuery({
      queryKey: ["todos", todoId],
      queryFn: () => fetchTodoById(todoId),
    });
    ```
  - **queryKey パターン**: 配列形式で依存関係を宣言。`["domain", ...params]` の規則で一貫性を保つ
  - **enabled オプション**: 依存クエリの制御に使用。`enabled: !!identityId` で前提条件を表現
  - **staleTime / gcTime**: キャッシュ戦略の設定。staleTime でバックグラウンド再取得を制御
  - **QueryClient の設定**: defaultOptions でグローバルなデフォルト値を設定可能
  - **useMutation**: 書き込み操作用。onSuccess で invalidateQueries を呼び出してキャッシュを更新
- **Implications**:
  - useQuery で Read 操作を移行（Phase 2 スコープ）
  - useMutation で Write 操作を移行（Phase 3 スコープ）
  - QueryClientProvider を JotaiProvider の内側に配置

### 依存クエリパターンの調査

- **Context**: 複数のクエリ間の依存関係を管理する方法を調査
- **Sources Consulted**: TanStack Query ドキュメント
- **Findings**:
  - **enabled オプション**: `enabled: !!userId` で前提条件が満たされるまでクエリを無効化
  - **queryKey の依存関係**: `queryKey: ['items', identityId, path]` で自動的に再取得
  - **useQueries**: 動的な数のクエリを並列実行可能（プレビュー URL 取得に有用）
- **Implications**:
  - identityId → items の依存は enabled オプションで表現
  - path 変更時の自動再取得は queryKey で表現
  - 複数アイテムのプレビュー URL 取得は useQueries で効率化

### エラーハンドリングとリトライ機構の調査

- **Context**: TanStack Query のエラー処理とリトライ機能を調査
- **Sources Consulted**: TanStack Query ドキュメント
- **Findings**:
  - **自動リトライ**: デフォルトで3回リトライ、指数バックオフ
  - **retry オプション**: `retry: 2` でリトライ回数を設定、`retry: false` で無効化
  - **retryDelay**: リトライ間隔をカスタマイズ可能
  - **onError コールバック**: エラー発生時のカスタム処理
  - **Error Boundaries**: throwOnError オプションで React Error Boundary と統合可能
- **Implications**:
  - ネットワークエラーは自動リトライで回復
  - 認証エラー（401/403）はリトライせず Error Boundary で処理
  - 本プロジェクトではデフォルトのリトライ設定を採用

---

## Architecture Pattern Evaluation

| Option                 | Description                                               | Strengths                                      | Risks / Limitations                    | Notes                               |
| ---------------------- | --------------------------------------------------------- | ---------------------------------------------- | -------------------------------------- | ----------------------------------- |
| TanStack Query + Jotai | TanStack Query（サーバー状態）+ Jotai（クライアント状態） | 責務分離明確、豊富な機能、成熟したエコシステム | 2つのライブラリの理解が必要            | ✅ 採用                             |
| Jotai + Suspense       | async 派生 atom + useAtomValue による自動サスペンド       | ネイティブ統合、追加ライブラリ不要             | ダイアログでフリーズ、リトライ機構なし | ❌ 不採用（以前のアプローチで失敗） |
| jotai-tanstack-query   | TanStack Query を atom でラップ                           | atom ベースで TQ 機能を利用                    | 両方の理解が必要、抽象レイヤー増加     | ❌ 不採用（過剰な抽象化）           |

---

## Design Decisions

### Decision: 責務分離戦略（サーバー状態 vs クライアント状態）

- **Context**: 非同期データ取得と UI 状態を別々のライブラリで管理するかどうか
- **Alternatives Considered**:
  1. TanStack Query のみ — サーバー状態もクライアント状態も統一管理
  2. Jotai のみ（Suspense 使用） — 既存アプローチの継続（以前のアプローチで失敗）
  3. TanStack Query + Jotai — サーバー状態とクライアント状態を分離
- **Selected Approach**: TanStack Query + Jotai（オプション3）
  - **TanStack Query**: identityId, items, folders, slides, credentials などのサーバー状態
  - **Jotai**: selection, path, sort, deleteConfirm, moveTarget などのクライアント状態
- **Rationale**:
  - 各ライブラリが得意な領域に集中
  - 以前の Jotai + Suspense アプローチの失敗（ダイアログフリーズ）を回避
  - TanStack Query の豊富な機能（キャッシュ、リトライ、バックグラウンド再取得）を活用
- **Trade-offs**:
  - 2つのライブラリを理解する必要がある
  - ただし、責務が明確に分離されているため、混乱は少ない
- **Follow-up**: DevTools を使用して両方の状態を可視化

### Decision: useStorageOperations の分割戦略

- **Context**: 680行の大規模フックを useQuery + useMutation に移行する方法
- **Alternatives Considered**:
  1. 単一の大きな useStorageItems — 移行は簡単だが、責務分離が不十分
  2. Read（useQuery）と Write（useMutation）を分離 — 責務分離が明確
  3. 操作ごとに完全に分離（useStorageItems, useUpload, useDelete, ...） — 最も細粒度
- **Selected Approach**: 段階的な分離（オプション2、Phase 2 では Read のみ）
  - **Phase 2**: `useStorageItems` カスタムフック（useQuery でアイテム一覧取得）
  - **Phase 3**: `useStorageMutations` カスタムフック（useMutation で各操作）
- **Rationale**:
  - Phase 2 で Read 操作のみを移行し、安定性を確認
  - Phase 3 で Write 操作を移行し、invalidateQueries で連携
  - 段階的な移行でリスクを最小化
- **Trade-offs**:
  - Phase 2 完了時点では useStorageOperations.ts が混在状態
  - ただし、テストカバレッジで機能退行を防止
- **Follow-up**: Phase 3 での useMutation 移行計画を別途策定

### Decision: Provider 階層構造

- **Context**: QueryClientProvider を既存の Provider 構造にどう統合するか
- **Alternatives Considered**:
  1. JotaiProvider の外側に QueryClientProvider — TQ が Jotai に依存しない
  2. JotaiProvider の内側に QueryClientProvider — TQ が Jotai の値にアクセス可能
  3. 同レベルに並列配置 — 独立性を保つ
- **Selected Approach**: JotaiProvider の内側に QueryClientProvider（オプション2）
  ```tsx
  <JotaiProvider>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </JotaiProvider>
  ```
- **Rationale**:
  - TanStack Query のクエリ内から Jotai の atom を読み取る必要はない
  - ただし、コンポーネント内で両方のフックを使用するため、順序は自由度が高い
  - 既存の JotaiProvider 構造を維持しつつ、QueryClientProvider を追加
- **Trade-offs**:
  - Provider のネストが深くなる
  - ただし、React 19 の Context 最適化でパフォーマンス影響は最小限
- **Follow-up**: DevTools の配置を検討

### Decision: queryKey パターン

- **Context**: キャッシュキーの命名規則を統一する
- **Alternatives Considered**:
  1. フラットな配列 — `["items", identityId, path]`
  2. オブジェクト形式 — `[{ domain: "items", identityId, path }]`
  3. 階層的な配列 — `["storage", "items", { identityId, path }]`
- **Selected Approach**: シンプルなフラット配列（オプション1）
  - `["identityId"]` — 認証 ID
  - `["items", identityId, path]` — ストレージアイテム
  - `["folders", identityId, path]` — フォルダ一覧
  - `["previewUrls", ...itemKeys]` — プレビュー URL
  - `["passkeys"]` — パスキー一覧
- **Rationale**:
  - シンプルで理解しやすい
  - invalidateQueries でプレフィックスマッチが容易
  - 公式ドキュメントの推奨パターンに準拠
- **Trade-offs**:
  - オブジェクト形式ほどの型安全性はない
  - ただし、本プロジェクトの規模では十分
- **Follow-up**: queryKey ファクトリ関数を作成して一貫性を保証

---

## Risks & Mitigations

- **リスク1: useStorageOperations の移行による機能退行** — 包括的なテストカバレッジを維持し、Phase 2 では Read のみ移行
- **リスク2: QueryClient 設定の不適切なデフォルト値** — staleTime, gcTime を適切に設定し、不要な再取得を防止
- **リスク3: queryKey の不整合によるキャッシュ問題** — queryKey ファクトリ関数で一貫性を保証
- **リスク4: Jotai と TanStack Query の状態同期の複雑性** — 責務を明確に分離し、相互依存を最小化

---

## References

- [TanStack Query 公式ドキュメント](https://tanstack.com/query/latest) — useQuery, useMutation, queryKey パターン
- [TanStack Query - Dependent Queries](https://tanstack.com/query/latest/docs/framework/react/guides/dependent-queries) — enabled オプションによる依存クエリ
- [TanStack Query - Query Keys](https://tanstack.com/query/latest/docs/framework/react/guides/query-keys) — queryKey のベストプラクティス
- [Jotai + Suspense 失敗の記録](./../jotai-suspense-migration/research.md) — 失敗したアプローチの教訓
- [Jotai + Suspense 設計ドキュメント](./../jotai-suspense-migration/design.md) — 参照粒度の基準
