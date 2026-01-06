# Research & Design Decisions

## Summary

- **Feature**: `use-storage-refactor`
- **Discovery Scope**: Extension（既存システムのリファクタリング）
- **Key Findings**:
  1. 現在の `useStorage` は5つの責務を持ち、約230行の単一フック
  2. 既存の `urlSync.ts` ユーティリティを活用してパス管理フックを構築可能
  3. React の Custom Hook パターンに従い、Composition で再構成可能

## Research Log

### 既存実装の構造分析

- **Context**: `useStorage.ts` の現状把握と分離ポイントの特定
- **Sources Consulted**: `src/hooks/useStorage.ts`, `src/hooks/urlSync.ts`, `src/utils/pathUtils.ts`
- **Findings**:
  - `useStorage` は以下の責務を持つ（約230行）:
    1. Identity ID 管理（L57-67）: `fetchAuthSession` で取得
    2. パス管理（L37-55）: URL クエリパラメータとの同期
    3. ストレージ操作（L75-216）: list, upload, remove, createFolder, getUrl
    4. アイテム変換（L88-125）: S3 レスポンス → StorageItem 変換、ソート、重複排除
    5. アップロード追跡（L194-202）: サムネイル遅延取得用
  - `urlSync.ts` は既に分離済み: `parseUrlPath()`, `syncToUrl()` がユーティリティとして存在
  - `UseStorageReturn` インターフェースは12個のプロパティを公開
- **Implications**:
  - 責務ごとに独立フックに分離可能
  - 既存の `urlSync.ts` を活用して `useStoragePath` を構築
  - アイテム変換は純粋関数として utils に分離可能

### 使用箇所の分析

- **Context**: リファクタリングの影響範囲を把握
- **Sources Consulted**: `src/components/MediaBrowser/index.tsx`, Grep検索結果
- **Findings**:
  - `useStorage` は `MediaBrowser/index.tsx` のみで使用（L3, L17-29）
  - `StorageItem` 型は複数コンポーネントで import されている:
    - `PreviewModal.tsx`, `DeleteConfirmDialog.tsx`, `FileList.tsx`, `FileList.test.tsx`
  - `MediaBrowser` は `identityId` を別途 `fetchAuthSession` で取得（L31-39, L86）
    - `FileActions` に `identityId` を渡すため重複取得している
- **Implications**:
  - `useIdentityId` を分離すれば `MediaBrowser` での重複取得を解消可能
  - `StorageItem` 型はフックから分離して共有型定義にすべき
  - 後方互換性を維持すれば影響範囲は限定的

### React Custom Hook ベストプラクティス

- **Context**: フック分離のパターン確認
- **Sources Consulted**: [React 公式ドキュメント](https://react.dev), Context7 ドキュメント
- **Findings**:
  - Custom Hook は状態ロジックの再利用を可能にする
  - Composition パターン: 複数のフックを組み合わせて高レベルフックを構築
  - 各フックは単一責任を持つべき
  - 戻り値は配列（useState 風）またはオブジェクト（named properties）
- **Implications**:
  - 分離フックは個別にテスト可能
  - 統合フック `useStorage` は分離フックを内部で compose
  - 依存性注入パターンでテスト容易性を向上

### AWS Amplify Auth/Storage API 確認

- **Context**: 外部 API の型定義と使用パターン
- **Sources Consulted**: [AWS Amplify JS API Documentation](https://aws-amplify.github.io/amplify-js/api/), [Manage user sessions](https://docs.amplify.aws/react/build-a-backend/auth/connect-your-frontend/manage-user-sessions/)
- **Findings**:
  - `fetchAuthSession()` は `AuthSession` 型を返すが、v6では型エクスポートに制限あり
  - `identityId` は `session.identityId` で取得（`string | undefined`）
  - Storage API: `list`, `remove`, `uploadData`, `getUrl` はすべて Promise を返す
  - `list` の戻り値は `ListOutput` 型（`items`, `nextToken` を含む）
- **Implications**:
  - `useIdentityId` は `string | null` と loading/error 状態を返すべき
  - Storage 操作は既存の Amplify API を直接使用可能
  - 型安全性のため、戻り値の型を明示的に定義

## Architecture Pattern Evaluation

| Option      | Description                              | Strengths                        | Risks / Limitations    | Notes      |
| ----------- | ---------------------------------------- | -------------------------------- | ---------------------- | ---------- |
| Composition | 個別フックを組み合わせて統合フックを構築 | 単一責任、テスト容易、再利用可能 | 初期実装コスト         | ✅ 採用    |
| Facade      | 既存フックをラップして内部を隠蔽         | 後方互換性維持が容易             | 内部複雑性が残る       | 検討対象外 |
| Provider    | Context でグローバル状態を管理           | グローバルアクセス可能           | 過剰設計、テスト複雑化 | 検討対象外 |

## Design Decisions

### Decision: 疎結合パターンの採用（統合フック廃止）

- **Context**: 5つの責務を持つ単一フックを分離する方法
- **Alternatives Considered**:
  1. Composition パターン — 統合フックで全てをまとめる
  2. Facade パターン — 内部を隠蔽しつつ既存 API を維持
  3. 疎結合パターン — 各フックを独立させ、コンポーネントで直接使用
- **Selected Approach**: 疎結合パターン
  - 個別のフック（`useIdentityId`, `useStoragePath`, `useStorageOperations`, `useUploadTracker`）と純粋関数（`parseStorageItems`）を定義
  - 統合フックは作成せず、MediaBrowser コンポーネントが各フックを直接使用
  - `useStorageOperations` は `identityId` と `currentPath` を引数として受け取る
- **Rationale**:
  - 各フックが完全に独立、再利用可能
  - 依存関係が明示的（引数として渡す）
  - 現在の MediaBrowser で `identityId` が重複取得されている問題を解消
  - テストが容易（各フックを個別にモック可能）
- **Trade-offs**:
  - コンポーネント側で複数フックを呼び出す必要がある
  - upload 処理は `uploadFiles` + `trackUpload` の組み合わせをコンポーネントで実装
- **Follow-up**: なし

### Decision: StorageItem 型の共有化

- **Context**: 型定義の配置場所
- **Alternatives Considered**:
  1. `useStorage.ts` に残す — 既存のまま
  2. `types/` ディレクトリに移動 — グローバル型として管理
  3. 各フックで個別に定義 — 責務分離を徹底
- **Selected Approach**: `src/types/storage.ts` に共有型定義を配置
- **Rationale**:
  - 複数コンポーネントで既に使用されている
  - フック分離後も共通で使用する
  - 循環参照を防止
- **Trade-offs**:
  - 新規ディレクトリ追加
  - import パスの変更が必要
- **Follow-up**: 移行時に既存 import の更新

### Decision: useIdentityId のエラー・ローディング状態設計

- **Context**: 認証状態の取得と表現
- **Alternatives Considered**:
  1. シンプルな `string | null` 返却
  2. オブジェクト形式 `{ identityId, loading, error }`
  3. タプル形式 `[identityId, loading, error]`
- **Selected Approach**: オブジェクト形式 `{ identityId, loading, error }`
- **Rationale**:
  - 名前付きプロパティで可読性向上
  - 拡張性（将来的にリフレッシュ関数等を追加可能）
  - 他のフックと一貫した設計
- **Trade-offs**:
  - タプル形式より若干冗長
- **Follow-up**: なし

### Decision: parseStorageItems を純粋関数として分離

- **Context**: S3 レスポンス変換ロジックの配置
- **Alternatives Considered**:
  1. フック内にインライン — 現状維持
  2. 別フック `useStorageItemParser` — フックとして分離
  3. ユーティリティ関数 `parseStorageItems` — 純粋関数として分離
- **Selected Approach**: ユーティリティ関数として `src/utils/storageItemParser.ts` に配置
- **Rationale**:
  - 副作用なし、状態なしの純粋関数
  - ユニットテストが最も容易
  - React に依存しないため再利用性が高い
- **Trade-offs**:
  - フックから分離されるため、使用箇所を明示的に管理
- **Follow-up**: なし

### テスト環境の分析

- **Context**: リファクタリング前のテスト整備状況を把握
- **Sources Consulted**: `src/components/MediaBrowser/*.test.tsx`、Glob検索結果
- **Findings**:
  - 個別コンポーネントの単体テストは存在: `Header.test.tsx`, `FileList.test.tsx`, `ThumbnailImage.test.tsx`
  - `MediaBrowser` 全体の振る舞いテスト（`index.test.tsx`）は存在しない
  - `useStorage` フックのユニットテストも存在しない
- **Implications**:
  - リファクタリング前に `MediaBrowser.test.tsx` の作成が必須
  - **振る舞いテストを採用する理由**:
    1. 今回のリファクタリングはフック内部構造の変更（単一 → 4つの独立フック）
    2. フック内部実装をテストすると、リファクタリング後にテスト書き換えが必要
    3. 外部から観測可能な振る舞いをテストすれば、内部変更に対する耐性を持つ
    4. 同じテストがリファクタリング前後でパスすれば、動作維持を保証できる
  - **テスト対象**: 今回変更するフック群（useIdentityId, useStoragePath, useStorageOperations, useUploadTracker）が連携して実現するフローを検証
  - 個別コンポーネントは単体テスト済みなので、振る舞いテストはフック連携に集中

## Risks & Mitigations

- **Risk 1**: 後方互換性の破壊 — MediaBrowser 統合テストをリファクタリング前に整備し、リファクタリング後も同じテストがパスすることを保証
- **Risk 2**: パフォーマンス低下（フック呼び出し増加）— React は複数フック呼び出しを最適化、実測で検証
- **Risk 3**: 循環参照 — 型定義を専用ファイルに分離、依存グラフを単方向に維持
- **Risk 4**: 統合テスト不足によるリグレッション — Requirement 8 で統合テスト整備を必須要件として定義

## References

- [React Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks) — フック分離のベストプラクティス
- [AWS Amplify JS API Documentation](https://aws-amplify.github.io/amplify-js/api/) — Auth/Storage API リファレンス
- [Manage user sessions - AWS Amplify](https://docs.amplify.aws/react/build-a-backend/auth/connect-your-frontend/manage-user-sessions/) — fetchAuthSession の使用方法
