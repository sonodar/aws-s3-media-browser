# Research & Design Decisions

---

**Feature**: `tanstack-query-migration` (Jotai + Suspense による非同期データ取得パターンへの移行)

**Discovery Scope**: Extension（Phase 1 で導入した Jotai 基盤を拡張）

**Key Findings**:

- Jotai の async 派生 atom は React Suspense とネイティブ統合され、useAtomValue が自動的にサスペンドする
- `loadable` ユーティリティで Suspense を使わない従来型のエラー/ローディング管理も可能
- `atomFamily` でパラメータ付き非同期 atom のキャッシュが可能だが、メモリリークに注意が必要
- 既存コードベースは useState + useEffect パターンが5箇所に分散

---

## Research Log

### 既存コードベースの非同期データ取得パターン分析

- **Context**: Phase 2 の移行対象を特定するため、既存の useEffect + useState パターンを調査
- **Sources Consulted**: src/hooks/\*.ts, src/components/MediaBrowser/\*.tsx
- **Findings**:
  - **useIdentityId.ts**: シンプルな useState + useEffect パターン。fetchAuthSession() を呼び出し、identityId を state に保存。loading/error 状態も手動管理。
  - **useStorageOperations.ts**: 680行の大規模フック。items, loading, error, isDeleting, isRenaming, isMoving など多数の状態を useState で管理。fetchItems の useEffect + 複数の操作関数（upload, delete, move, rename, createFolder）を含む。
  - **FolderBrowser.tsx**: folders 状態を useState で管理し、currentPath 変更時に useEffect でフォルダ一覧を取得。移動ダイアログ内のコンポーネント。
  - **PreviewModal.tsx**: slides 状態を useState で管理し、items/isOpen 変更時に useEffect でメディア URL を取得。Lightbox プレビュー用。
  - **usePasskey.ts**: credentials 状態を useState で管理し、fetchCredentials を useCallback で定義。register/delete 操作後に手動で refetch。
- **Implications**:
  - useStorageOperations.ts が最も複雑で、分割が必要
  - すべてのファイルで loading/error 状態を手動管理しているため、Suspense + ErrorBoundary で大幅に簡素化可能
  - パラメータ依存のデータ取得（currentPath → items, items → slides）は派生 atom の依存関係で表現可能

### 既存 Jotai atom 構造の分析

- **Context**: 新しい async atom を既存構造と統合する方法を検討
- **Sources Consulted**: src/stores/atoms/\*.ts, src/stores/JotaiProvider.tsx
- **Findings**:
  - **ドメイン分離**: selection, path, sort, deleteConfirm の4ドメインに分離済み
  - **命名規則**: `[name]Atom` で統一、debugLabel で DevTools 表示名を設定
  - **atom 種類**: primitive atom, derived atom, action atom（writable atom with null read）の3種類を使い分け
  - **Provider 構造**: JotaiProvider でラップ、開発環境では AtomsDevtools を有効化
- **Implications**:
  - 新しい非同期ドメイン（identity, storage, passkey）を同じパターンで追加可能
  - debugLabel 規則を踏襲: `[domain]/[name]` 形式
  - App.tsx の構造上、JotaiProvider は MantineProvider の内側にあり、Suspense 境界を追加しやすい

### Jotai + Suspense パターンの調査

- **Context**: TanStack Query を使わずに Jotai 単体で Suspense 対応を実現する方法を調査
- **Sources Consulted**:
  - Jotai 公式ドキュメント (pmndrs/jotai)
  - Context7 MCP による最新ドキュメント検索
- **Findings**:
  - **async 派生 atom**: read 関数で async 関数を返すと、Jotai が自動的に Suspense 対応する
    ```typescript
    const asyncAtom = atom(async (get) => {
      const response = await fetch(get(urlAtom));
      return response.json();
    });
    ```
  - **useAtomValue の動作**: Promise を検知すると自動的にサスペンドし、解決後の値を返す
  - **パラメータ依存**: `get(otherAtom)` で他の atom に依存し、依存先の変更で自動的に再計算
  - **loadable ユーティリティ**: Suspense を使わない場合の選択肢。state: 'loading' | 'hasData' | 'hasError' を返す
  - **unwrap ユーティリティ**: fallback 値を指定して非同期 atom をラップ、Suspense なしで利用可能
- **Implications**:
  - 基本的には Suspense + ErrorBoundary で宣言的に管理
  - 部分的なローディング表示が必要な場合は loadable も検討可能
  - パラメータ付き非同期処理は派生 atom の依存関係で自然に表現できる

### atomFamily の調査

- **Context**: 複数パラメータ（異なるパスのフォルダ一覧など）のキャッシュ方法を調査
- **Sources Consulted**: Jotai 公式ドキュメント (jotai/utils)
- **Findings**:
  - **基本構文**: `atomFamily((param) => atom(...), areEqual)` でパラメータ付き atom を生成
  - **キャッシュ機構**: 同じパラメータで呼び出すとキャッシュされた atom を返す
  - **メモリリーク注意**: 内部で Map を使用するため、使用済みパラメータは `myFamily.remove(param)` で削除が必要
  - **setShouldRemove**: 自動削除ポリシーを設定可能（例: 5分経過したものを削除）
- **Implications**:
  - プレビュー URL のような一時的なデータには atomFamily が適切
  - ただし本プロジェクトの規模では、シンプルな派生 atom で十分な可能性が高い
  - atomFamily を使う場合はクリーンアップ戦略を明確にする必要がある

### エラーハンドリングパターンの調査

- **Context**: async atom でのエラー処理方法を調査
- **Sources Consulted**: Jotai 公式ドキュメント
- **Findings**:
  - **ErrorBoundary との統合**: async 派生 atom でエラーがスローされると、ErrorBoundary でキャッチ可能
  - **loadable でのエラー処理**: `state === 'hasError'` で明示的にエラー状態を判定
  - **リトライ機構**: Jotai 自体にはリトライ機構がないため、必要なら atom 内で実装
- **Implications**:
  - 認証エラーなど致命的なエラーは ErrorBoundary で処理
  - ネットワーク一時エラーなど回復可能なエラーは loadable + リトライボタンで対応
  - 本プロジェクトでは ErrorBoundary を基本とし、必要に応じて loadable を検討

---

## Architecture Pattern Evaluation

| Option               | Description                                         | Strengths                                    | Risks / Limitations                      | Notes                   |
| -------------------- | --------------------------------------------------- | -------------------------------------------- | ---------------------------------------- | ----------------------- |
| Jotai + Suspense     | async 派生 atom + useAtomValue による自動サスペンド | ネイティブ統合、追加ライブラリ不要、シンプル | リトライ機構なし、キャッシュ戦略が基本的 | ✅ 採用（Phase 1 継続） |
| TanStack Query 直接  | useQuery/useMutation + Jotai（クライアント状態）    | 豊富な機能、成熟したエコシステム             | 2つの状態管理モデルが共存                | 不採用（複雑性増加）    |
| jotai-tanstack-query | TanStack Query を atom でラップ                     | atom ベースで TQ 機能を利用                  | 両方の理解が必要、抽象レイヤー増加       | 不採用（過剰な抽象化）  |

---

## Design Decisions

### Decision: Suspense 境界の配置戦略

- **Context**: どこに Suspense 境界を配置するかで UX が大きく変わる
- **Alternatives Considered**:
  1. アプリケーションルートに単一の Suspense 境界 — 実装が簡単だが、部分更新時に全画面がサスペンド
  2. 機能単位で細かく Suspense 境界を配置 — きめ細かい制御が可能だが、実装が複雑
  3. ハイブリッド（ルート + 主要機能境界） — バランスの取れたアプローチ
- **Selected Approach**: ハイブリッドアプローチを採用
  - ルートレベル: ErrorBoundary + Suspense（認証、クリティカルエラー対応）
  - MediaBrowser レベル: Suspense（ファイル一覧のローディング）
  - MoveDialog / PreviewModal: 個別の Suspense（ダイアログ内のローディング）
- **Rationale**:
  - 部分的なローディング表示で UX を向上
  - エラー境界は大きく、Suspense 境界は適度に細かく
- **Trade-offs**:
  - コードの複雑さが若干増加
  - ただし、各 Suspense 境界は独立したローディング状態を提供するため保守性は維持
- **Follow-up**: 実装時にネストした Suspense 境界のローディング UX を確認

### Decision: useStorageOperations の分割戦略

- **Context**: 680行の大規模フックを async atom + writable atom に移行する方法
- **Alternatives Considered**:
  1. 単一の巨大な storageAtom — 移行は簡単だが、責務分離が不十分
  2. 読み取り（items）と書き込み（operations）を分離 — 責務分離が明確
  3. 操作ごとに完全に分離（itemsAtom, uploadAtom, deleteAtom, ...） — 最も細粒度
- **Selected Approach**: 読み取りと書き込みを分離（オプション2）
  - `itemsAtom`: async 派生 atom（currentPath + identityId に依存）
  - `storageOperationsAtom`: writable atom（各操作を実行し、itemsAtom を再計算トリガー）
- **Rationale**:
  - 読み取りは Suspense で宣言的に、書き込みは明示的な操作として分離
  - 過度な分割は atom 間の依存関係を複雑化させる
- **Trade-offs**:
  - 書き込み操作が1つの atom に集約されるため、個別テストがやや複雑
  - ただし、操作の実行と状態の更新が1箇所に集約されるため追跡は容易
- **Follow-up**: 操作ごとのローディング状態（isDeleting など）の管理方法を実装時に検討

### Decision: identityId の取得タイミング

- **Context**: identityId は他の多くの操作の前提条件であり、取得タイミングが重要
- **Alternatives Considered**:
  1. アプリ起動時に1回取得しキャッシュ — シンプルだが、セッション更新に対応できない
  2. 各操作前に毎回取得 — 確実だが、パフォーマンスに影響
  3. 認証時に1回取得し、async 派生 atom でキャッシュ — バランスの取れたアプローチ
- **Selected Approach**: async 派生 atom でキャッシュ（オプション3）
  - `identityIdAtom`: async 派生 atom（fetchAuthSession を実行）
  - 他の atom は `get(identityIdAtom)` で依存
- **Rationale**:
  - Jotai の atom キャッシュにより、同一セッション内では再取得されない
  - 認証セッションの有効期限は Amplify Auth が管理
- **Trade-offs**:
  - セッションが更新された場合の再取得は考慮していない（本プロジェクトでは不要）
- **Follow-up**: 長時間セッションでの動作確認

---

## Risks & Mitigations

- **リスク1: useStorageOperations の移行による機能退行** — 包括的なテストカバレッジを維持し、段階的に移行
- **リスク2: Suspense 境界のネストによる予期しないローディング表示** — 境界配置を慎重に設計し、UX テストを実施
- **リスク3: ErrorBoundary でのエラー回復が困難** — リセット機能付きの ErrorBoundary を実装し、再試行を可能に
- **リスク4: atomFamily のメモリリーク** — 本プロジェクトでは atomFamily の使用を最小限に抑え、使用する場合はクリーンアップを実装

---

## References

- [Jotai 公式ドキュメント - Async Atoms](https://jotai.org/docs/guides/async) — async 派生 atom の基本
- [Jotai 公式ドキュメント - atomFamily](https://jotai.org/docs/utilities/family) — パラメータ付き atom
- [Jotai 公式ドキュメント - loadable](https://jotai.org/docs/utilities/async#loadable) — Suspense を使わない場合の選択肢
- [jotaiによるReact再入門（uhyo）](https://zenn.dev/uhyo/books/learn-react-with-jotai) — 思想の転換（Promise as state）
- [Phase 1 research.md](../archive/client-state-store/research.md) — Jotai 選択理由と Suspense 統合の方針
