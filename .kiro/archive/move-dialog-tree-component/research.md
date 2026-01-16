# Research & Design Decisions

---

**Purpose**: MoveDialog コンポーネントにおけるツリー形式のフォルダ選択 UI 導入に関する調査記録

---

## Summary

- **Feature**: `move-dialog-tree-component`
- **Discovery Scope**: Extension（既存システムの拡張）
- **Key Findings**:
  - Mantine 8.x の Tree コンポーネントは非同期データ読み込みに対応可能
  - 既存の useStorageItems フックを活用して子フォルダを動的に取得可能
  - TreeNodeData 形式への変換ロジックが必要

## Research Log

### Mantine Tree コンポーネント API

- **Context**: MoveDialog で使用するツリーコンポーネントの技術選定
- **Sources Consulted**:
  - [Mantine Tree Documentation](https://mantine.dev/core/tree/)
  - プロジェクトの package.json（@mantine/core@8.3.12）
- **Findings**:
  - TreeNodeData 形式: `{ value: string, label: string, children?: TreeNodeData[] }`
  - useTree フック: 展開・選択・チェック状態を管理
  - RenderTreeNodePayload: カスタムレンダリング用ペイロード（level, expanded, hasChildren, selected, node, elementProps）
  - expandOnClick: ノードクリック時に自動展開（デフォルト true）
  - selectOnClick: ノードクリック時に選択（デフォルト false）
  - getTreeExpandedState: 初期展開状態を生成するユーティリティ
- **Implications**:
  - renderNode コールバックでカスタムスタイル（無効状態のグレーアウト等）を適用
  - useTree フックで展開・選択状態を一元管理
  - 非同期読み込みはデータの動的更新で対応（children を後から追加）

### 既存 FolderBrowser の構造分析

- **Context**: 置き換え対象コンポーネントの現状把握
- **Sources Consulted**:
  - `src/components/MediaBrowser/FolderBrowser.tsx`
  - `src/components/MediaBrowser/MoveDialog.tsx`
  - `src/hooks/storage/useStorageItems.ts`
- **Findings**:
  - FolderBrowser は identityId, currentPath, rootPath, disabledPaths, onNavigate を Props として受け取る
  - useStorageItems フックで S3 からフォルダ一覧を取得（TanStack Query でキャッシュ共有）
  - MoveDialog は循環移動防止のため disabledPaths を計算し FolderBrowser に渡す
  - 現在のナビゲーションはフラットリスト表示 + 「上へ」「ホーム」ボタン
- **Implications**:
  - FolderBrowser を FolderTree に置き換え
  - disabledPaths ロジックは MoveDialog に残す（ツリーノードの無効化判定で使用）
  - useStorageItems を活用してノード展開時に子フォルダを動的取得

### 非同期ツリーデータ読み込みパターン

- **Context**: S3 からの子フォルダ動的取得の実装方針
- **Sources Consulted**:
  - Mantine Tree ドキュメント
  - TanStack Query パターン
- **Findings**:
  - Mantine Tree の data prop は stable reference（memoized）が必要
  - 非同期読み込み時は children を後から更新するパターンが一般的
  - ノード展開時にデータを取得し、state を更新して再レンダリング
  - ローディング状態はカスタム renderNode でスピナー表示可能
- **Implications**:
  - useFolderTree カスタムフックでツリーデータと展開ロジックを管理
  - ノード展開時に useStorageItems のクエリをトリガー
  - ローディング中ノードは children: [] + loading フラグで表現

## Architecture Pattern Evaluation

| Option                           | Description                                      | Strengths                        | Risks / Limitations  | Notes  |
| -------------------------------- | ------------------------------------------------ | -------------------------------- | -------------------- | ------ |
| A: FolderTree 新規コンポーネント | FolderBrowser を完全に置き換える新コンポーネント | 既存コードへの影響最小、単一責任 | 新規コード量増加     | 推奨   |
| B: FolderBrowser 拡張            | 既存 FolderBrowser にツリー表示モードを追加      | コード再利用                     | 複雑化、Props 増加   | 非推奨 |
| C: Mantine Tree 直接使用         | MoveDialog 内で Tree コンポーネントを直接使用    | 中間層なし                       | ビジネスロジック混在 | 非推奨 |

## Design Decisions

### Decision: FolderTree 新規コンポーネント採用

- **Context**: ツリー形式のフォルダ選択 UI を実現する最適なアーキテクチャ
- **Alternatives Considered**:
  1. Option A — FolderTree 新規コンポーネント
  2. Option B — FolderBrowser 拡張
  3. Option C — Mantine Tree 直接使用
- **Selected Approach**: Option A — FolderTree を新規作成し、MoveDialog でのみ使用
- **Rationale**:
  - 既存 FolderBrowser は他で使用される可能性があり、変更リスクを回避
  - ツリー表示固有のロジック（非同期展開、ノード状態管理）を分離
  - 単一責任原則に従い、テスト容易性を確保
- **Trade-offs**:
  - 新規コード量は増加するが、保守性と拡張性が向上
  - FolderBrowser.css の一部スタイルは再利用可能
- **Follow-up**: 将来的に FolderBrowser を廃止し FolderTree に統一する可能性を検討

### Decision: useFolderTree カスタムフック導入

- **Context**: ツリーデータと非同期読み込みロジックの管理
- **Alternatives Considered**:
  1. FolderTree コンポーネント内でローカル state 管理
  2. useFolderTree フックでロジック分離
- **Selected Approach**: useFolderTree フックを hooks/ui/ に配置
- **Rationale**:
  - テスト容易性向上（フック単体テストが可能）
  - Mantine useTree との統合ロジックをカプセル化
  - 将来的な再利用性確保
- **Trade-offs**: フック数増加、ただしドメイン分離の原則に合致
- **Follow-up**: 実装時にフックの責務範囲を明確化

### Decision: TreeNodeData への変換ユーティリティ

- **Context**: StorageItem から Mantine TreeNodeData への変換
- **Alternatives Considered**:
  1. コンポーネント内で直接変換
  2. ユーティリティ関数として分離
- **Selected Approach**: toTreeNodeData ユーティリティ関数を utils/ または hooks/ui/ 内に配置
- **Rationale**:
  - 純粋関数として単体テスト可能
  - 変換ロジックの再利用性確保
- **Trade-offs**: 軽微なファイル増加
- **Follow-up**: 不要な複雑化を避け、最小限の変換のみ実装

## Risks & Mitigations

- **リスク 1**: 非同期読み込み時の UX 劣化（ちらつき、遅延感）
  - **緩和策**: ローディングインジケータの表示、TanStack Query のキャッシュ活用
- **リスク 2**: 大量フォルダ時のパフォーマンス問題
  - **緩和策**: 仮想化は初期スコープ外とするが、将来的に検討
- **リスク 3**: 既存テストの破壊
  - **緩和策**: MoveDialog.test.tsx の更新、FolderTree 専用テストの作成

## References

- [Mantine Tree Documentation](https://mantine.dev/core/tree/) — Tree コンポーネント API
- [TanStack Query Documentation](https://tanstack.com/query/latest) — 非同期データ管理
- プロジェクト steering/tech.md — 技術選定基準
