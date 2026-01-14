# Research & Design Decisions

---

**Feature**: `identity-id-auth-guard`
**Discovery Scope**: Extension（既存システムの拡張）
**Key Findings**:

- 認証済みコンテキストを App レベルで導入し、`identityId` の非 null 保証を型レベルで実現可能
- 既存の `useIdentityId` フックは TanStack Query ベースで実装済み、キャッシュ戦略は維持
- 影響範囲は約 10 ファイル（フック 5、コンポーネント 4、ユーティリティ/型 3）

## Research Log

### 既存 useIdentityId フックの分析

- **Context**: 現在の認証 ID 取得パターンを理解し、リファクタリングの基盤を確認
- **Sources Consulted**: `src/hooks/identity/useIdentityId.ts`
- **Findings**:
  - TanStack Query (`useQuery`) を使用し、`fetchAuthSession()` で Cognito セッションから Identity ID を取得
  - キャッシュ戦略: `staleTime: Infinity`, `gcTime: Infinity`, `retry: false`
  - 戻り値型: `UseIdentityIdReturn` = `{ identityId: string | null, loading: boolean, isLoading, isError, error }`
  - 認証されていない場合に `null` を返す設計
- **Implications**:
  - 認証済みコンテキスト内では `identityId` が常に存在することを保証し、新しいフックでは `string` 型を返す設計に変更
  - 既存のキャッシュ戦略を維持し、認証済みコンテキスト外では従来のフックを内部的に使用

### 現在の App.tsx 構造分析

- **Context**: 認証ガードの挿入位置を特定
- **Sources Consulted**: `src/App.tsx`
- **Findings**:
  - `MantineProvider` → `JotaiProvider` → `QueryProvider` → `Authenticator.Provider` → `HybridAuthApp` の順序
  - `HybridAuthApp` 内で `isPasskeyAuthenticated || authStatus === "authenticated"` を判定し、`AuthenticatedApp` をレンダリング
  - `AuthenticatedApp` は `MediaBrowser` と `PasskeySettingsModal` を含む
- **Implications**:
  - 認証済みコンテキストは `AuthenticatedApp` の直上（または内部）で `identityId` を取得してから子コンポーネントに提供
  - Provider 階層: `QueryProvider` より内側、`AuthenticatedApp` の外側に配置

### identityId の使用箇所分析

- **Context**: 型変更の影響範囲を把握
- **Sources Consulted**: codebase grep 結果
- **Findings**:
  - **フック**:
    - `useStorageOperations`: `identityId: string | null` を受け取り、内部で `identityId ?? ""` に変換
    - `useStorageItems`: `identityId: string | null` を受け取り、`enabled: !!identityId` で identityId 取得完了を待機
  - **コンポーネント**:
    - `MediaBrowser`: `useIdentityId()` で取得、`identityId` を `FileActions`, `MoveDialog` に渡す
    - `FileActions`: `identityId: string | null` を Props で受け取り、`if (!identityId) return null` でガード
    - `MoveDialog`: `identityId: string | null` を Props で受け取り、`FolderBrowser` に渡す
    - `FolderBrowser`: `identityId: string | null` を Props で受け取り、`useStorageItems` に渡す
  - **ユーティリティ/型**:
    - `mutations/types.ts`: `MutationContext.identityId: string`（既に非 null）
    - `queryKeys.ts`: `storageItems(identityId: string, path: string)` 既に非 null
    - `storagePathUtils.ts`: すべての関数が `identityId: string` を期待（非 null）
    - `invalidationUtils.ts`: `identityId: string` を期待
- **Implications**:
  - 型変更の影響範囲は限定的（Props と内部の null チェック削除）
  - mutation/types.ts は既に非 null のため変更不要
  - storagePathUtils/queryKeys/invalidationUtils も既に非 null のため変更不要

## Architecture Pattern Evaluation

| Option                    | Description                                                                           | Strengths                                                    | Risks / Limitations                                                                  | Notes                                          |
| ------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------ | ---------------------------------------------- |
| Props Drilling            | HybridAuthApp で identityId を取得し、AuthenticatedApp → MediaBrowser に Props で伝播 | シンプル、追加の抽象化不要、コンポーネント構造が型保証を反映 | 深いネスト時は Props バケツリレーになる可能性                                        | **採用**: YAGNI 原則に従い最もシンプルな解決策 |
| React Context + Provider  | App 内に IdentityIdProvider を設置、useIdentityId フックで取得                        | 型安全性が高い、深いネストでも直接アクセス可能               | 過剰な抽象化、現時点では必要ない複雑さ                                               | 却下: 現状の構造ではオーバーエンジニアリング   |
| Global State (Jotai atom) | identityId を Jotai atom で管理                                                       | Jotai は既に導入済み                                         | サーバー状態を Jotai で管理するのは設計方針に反する（TanStack Query = サーバー状態） | 却下: ステート管理の二層構造に違反             |

## Design Decisions

### Decision: 認証済みコンテキストの実装パターン

- **Context**: 認証済みコンポーネント内で `identityId` が常に存在することを型レベルで保証する
- **Alternatives Considered**:
  1. Props Drilling — HybridAuthApp で取得し、コンポーネントツリーを通じて伝播
  2. React Context + Provider — 専用の Context を作成し、認証済み状態を管理
  3. HOC (Higher-Order Component) — withAuthenticatedIdentity HOC でラップ
- **Selected Approach**: Props Drilling
  - `HybridAuthApp` で `useIdentityId({ enabled: isAuthenticated })` を呼び出し
  - 取得した `identityId: string` を `AuthenticatedApp` → `MediaBrowser` に Props で渡す
  - `MediaBrowser` は内部で `useIdentityId()` を呼び出す代わりに Props から受け取る
- **Rationale**:
  - **シンプルさ**: 追加の Context、Provider、フック不要
  - **構造的保証**: コンポーネント階層が認証状態を反映（`AuthenticatedApp` 内は認証済み）
  - **YAGNI**: 将来の拡張が必要になった時点で Context 化を検討
  - **影響範囲最小**: 型変更のみで実装変更は限定的
- **Trade-offs**:
  - 深いネストが増えた場合は Props バケツリレーになる可能性（現状は 2-3 階層のみで問題なし）
  - 将来、認証コンテキスト外から identityId が必要になった場合は Context 化が必要
- **Follow-up**: テスト時は Props として直接 identityId を渡せばよく、モックが簡素化される

### Decision: 既存 useIdentityId フックの使用方法

- **Context**: 既存のフックをどう扱うか
- **Alternatives Considered**:
  1. 既存フックをそのまま使用 — `enabled` オプションを追加して HybridAuthApp で使用
  2. 既存フックを削除 — インラインで `fetchAuthSession` を呼び出し
- **Selected Approach**: 既存フックをそのまま使用
  - `HybridAuthApp` で `useIdentityId({ enabled: isAuthenticated })` として使用
  - 他のコンポーネントは Props で `identityId` を受け取る
- **Rationale**:
  - TanStack Query のキャッシュ戦略を維持
  - 既存のフックを活用し、変更を最小限に
  - `enabled` オプションにより認証前は Query が実行されず、認証後に確実に identityId を取得

### Decision: タイミング問題の解決

- **Context**: 認証状態と TanStack Query のキャッシュのタイミング整合性
- **Problem**: 認証完了前に Query が実行されると `identityId: null` がキャッシュされる可能性
- **Solution**: `useIdentityId({ enabled: isAuthenticated })` パターン
  - `enabled: false` の間は Query が実行されない
  - 認証完了後に `enabled: true` になり、その時点で Query が実行される
  - これにより認証済みの状態でのみ identityId が取得される
- **Rationale**:
  - TanStack Query の公式パターン
  - React Hooks のルールに違反しない（フック自体は常に呼び出される）
  - 条件付きレンダリングと組み合わせて型安全性を確保

## Risks & Mitigations

- **Props バケツリレーの深化** — 現状は 2-3 階層のみで問題なし。将来深くなった場合は Context 化を検討
- **テスト時の Props 設定漏れ** — TypeScript の型チェックにより必須 Props の漏れを検出
- **identityId 取得エラー時の UX** — HybridAuthApp でエラーハンドリングを行い、適切なエラー UI を表示

## References

- [React Context Documentation](https://react.dev/reference/react/useContext) — Context API の公式ドキュメント
- [TanStack Query Patterns](https://tanstack.com/query/latest/docs/framework/react/guides/suspense) — Suspense との統合パターン
- 既存実装: `src/stores/JotaiProvider.tsx`, `src/stores/QueryProvider.tsx` — Provider パターンの参考
