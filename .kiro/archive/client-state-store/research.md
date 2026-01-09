# Research & Design Decisions

## Summary

- **Feature**: `client-state-store`
- **Discovery Scope**: Extension（既存システムへの状態管理レイヤー追加）
- **Key Findings**:
  - Jotai が最適な状態管理ライブラリ（軽量、TypeScript 完全対応、将来の Suspense 対応）
  - Atom モデルで既存 hooks を段階的に移行可能
  - `useAtomsDevtools` による Redux DevTools 連携

## Research Log

### 状態管理ライブラリ評価

- **Context**: React 向け状態管理ライブラリの選定
- **Sources Consulted**:
  - [Jotai 公式ドキュメント](https://jotai.org/)
  - [Zustand 公式ドキュメント](https://github.com/pmndrs/zustand)
  - Context7 ドキュメント検索
- **Findings**:
  | 観点 | Jotai | Zustand |
  | ---- | ----- | ------- |
  | バンドルサイズ | ~3KB (gzip) | ~3KB (gzip) |
  | DevTools 対応 | `useAtomsDevtools` | `devtools` middleware |
  | TypeScript | 完全対応 | 完全対応 |
  | 状態モデル | Atom（ボトムアップ） | Store（トップダウン） |
  | Suspense 対応 | ネイティブ対応 | 限定的 |
  | 将来拡張性 | jotai-tanstack-query で TanStack Query 統合可能 | 別途 TanStack Query 導入 |
- **Decision**: Jotai を選択
- **Rationale**: 将来のサーバー状態管理（S3）フェーズで jotai-tanstack-query + Suspense の活用を見据え、Jotai を採用

### Jotai Atom モデル詳細

- **Context**: Jotai の基本概念と API の理解
- **Sources Consulted**: Jotai 公式ドキュメント、Context7
- **Findings**:
  - **Primitive Atom**: `atom(initialValue)` で作成、読み書き可能な基本単位
  - **Derived Atom**: `atom((get) => get(baseAtom) * 2)` で他の atom から派生
  - **Writable Derived Atom**: `atom(read, write)` で読み書きロジックをカスタマイズ
  - **atomWithReset**: 初期値にリセット可能な atom
  - **atomFamily**: パラメータ化された atom 群
- **Implications**: 既存 hooks の各状態を個別の atom に対応付け可能

### DevTools 連携調査

- **Context**: デバッグ体験の向上
- **Sources Consulted**: jotai-devtools ドキュメント
- **Findings**:
  - `useAtomsDevtools('storeName')` で Redux DevTools Extension に接続
  - atom に `debugLabel` を設定してアクション名を識別可能
  - 本番ビルドでは自動的に無効化
  - タイムトラベルデバッグ対応
- **Implications**: Zustand と同等のデバッグ体験を提供可能

### 既存 hooks 構造分析

- **Context**: 現在の状態管理パターンの把握
- **Sources Consulted**: プロジェクト内 `/src/hooks/` ディレクトリ
- **Findings**:
  - 11 個のカスタムフックが存在
  - `useUploadTracker`: アップロード追跡（問題の起点）
  - `useSelection`: 選択状態管理（Set ベース）
  - `useStoragePath`: パス + URL 同期
  - `useStorageOperations`: S3 操作
  - `useMoveDialog`: ダイアログ状態
  - `useSortOrder`: ソート設定（localStorage 永続化）
  - 各 hooks は useState で独立した状態を持つ
- **Implications**: 各 hook の状態を対応する atom に移行し、facade hook で既存インターフェースを維持

### MediaBrowser コンポーネント分析

- **Context**: メインコンポーネントでの hooks 使用パターン
- **Sources Consulted**: `/src/components/MediaBrowser/index.tsx`
- **Findings**:
  - 10 個以上の hooks を使用
  - 複数の `useState` でローカル UI 状態を管理
  - props drilling は限定的だが、状態変更の流れが複雑
  - コールバック関数が多層にネスト
- **Implications**: Atom への移行で状態アクセスを簡素化できる

### テスト戦略調査

- **Context**: Vitest との統合
- **Sources Consulted**: Jotai Testing Guide
- **Findings**:
  - `Provider` で atom を分離してテスト可能
  - `useHydrateAtoms` で初期状態を注入
  - `atomWithReset` でテスト間リセット
  - `act()` ラッパーで非同期状態更新対応
- **Implications**: 既存の Vitest + Testing Library 環境と完全互換

## Architecture Pattern Evaluation

| Option            | Description                                  | Strengths                                                       | Risks / Limitations                  | Notes            |
| ----------------- | -------------------------------------------- | --------------------------------------------------------------- | ------------------------------------ | ---------------- |
| Jotai Atoms       | 機能別に atom を分割、必要に応じて組み合わせ | 型安全、段階移行可能、Suspense 対応、将来の TanStack Query 統合 | 複雑な派生状態でボイラープレート発生 | **選択**         |
| Zustand Slices    | ドメイン別に slice を分割、単一 store に結合 | DevTools 連携が成熟                                             | Suspense 対応が限定的                | 次点候補         |
| Redux Toolkit     | 業界標準、エコシステム充実                   | 実績豊富                                                        | ボイラープレート多、バンドルサイズ大 | オーバースペック |
| Context + Reducer | React 標準                                   | 依存なし                                                        | パフォーマンス課題、DevTools なし    | 要件未達         |

## Design Decisions

### Decision: Jotai を状態管理ライブラリとして採用

- **Context**: 状態の可視化・デバッグ容易性が主目的、将来のサーバー状態統合も視野
- **Alternatives Considered**:
  1. Zustand — DevTools 連携成熟だが Suspense 対応限定的
  2. Redux Toolkit — 機能豊富だがボイラープレート多
  3. Context + useReducer — 標準だがパフォーマンス課題
- **Selected Approach**: Jotai + jotai-devtools
- **Rationale**:
  - 軽量（~3KB）で既存バンドルへの影響最小
  - TypeScript 完全対応で型推論が効く
  - Redux DevTools でタイムトラベルデバッグ可能（`useAtomsDevtools`）
  - 将来フェーズで jotai-tanstack-query による Suspense + サーバー状態統合が可能
- **Trade-offs**:
  - (+) 将来の Suspense/TanStack Query 統合が容易
  - (+) Atom ベースで細粒度の状態分割が可能
  - (-) Zustand より DevTools 連携のセットアップがやや複雑

### Decision: Atom モデルによる状態分割

- **Context**: 既存 hooks からの段階的移行
- **Alternatives Considered**:
  1. 単一巨大 atom — シンプルだが再レンダリング最適化困難
  2. 機能別 atom 群 — 適切な粒度で分割
- **Selected Approach**: 機能別 atom 群（selection, upload, path, ui）
- **Rationale**:
  - 既存の hooks 単位（selection, upload, path 等）と対応
  - 必要な atom のみを購読して再レンダリング最適化
  - atom 単位でのテスト・開発が可能
- **Trade-offs**:
  - (+) 関心の分離
  - (+) 細粒度の再レンダリング制御
  - (-) atom 間の依存関係管理が必要

### Decision: 既存 hooks のファサードレイヤー維持

- **Context**: 段階的移行中の後方互換性
- **Alternatives Considered**:
  1. 一括移行 — 全 hooks を同時に atom 化
  2. ファサード維持 — hooks のシグネチャは維持し内部を atom に切替
- **Selected Approach**: ファサードレイヤー維持
- **Rationale**:
  - コンポーネント側の変更を最小化
  - 移行中も既存テストがパス
  - 問題発生時に切り戻し容易
- **Trade-offs**:
  - (+) 移行リスク最小化
  - (+) テスト互換性維持
  - (-) 一時的に冗長なレイヤー発生

## Risks & Mitigations

| Risk                    | Mitigation                                           |
| ----------------------- | ---------------------------------------------------- |
| atom 間の循環依存       | 依存グラフを設計段階で明確化、派生 atom で一方向依存 |
| パフォーマンス退行      | 必要な atom のみ購読、移行前後でプロファイリング     |
| 既存テスト破損          | ファサードフック維持で段階移行、CI で継続検証        |
| DevTools のバンドル混入 | jotai-devtools は開発依存、本番ビルド除外            |

## References

- [Jotai 公式ドキュメント](https://jotai.org/) — 公式サイト
- [jotai-devtools](https://github.com/jotaijs/jotai-devtools) — DevTools 連携
- [jotai-tanstack-query](https://jotai.org/docs/extensions/query) — TanStack Query 統合（将来フェーズ）
- [Jotai Testing Guide](https://jotai.org/docs/guides/testing) — テスト戦略
