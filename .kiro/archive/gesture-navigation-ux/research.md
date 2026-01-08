# Research & Design Decisions

## Summary

- **Feature**: gesture-navigation-ux
- **Discovery Scope**: Extension（既存システムへの機能追加）
- **Key Findings**:
  - yet-another-react-lightbox は `closeOnPullDown`、スワイプナビゲーション、`index` + `on.view` による外部制御を標準サポート
  - @use-gesture/react の `useDrag` フックで `swipe` 属性を使い、閾値ベースのスワイプ検出が可能
  - 既存の FileActionMenu コンポーネントは長押しに置き換え可能な構造

## Research Log

### yet-another-react-lightbox のスワイプ機能

- **Context**: プレビュー画面での左右スワイプナビゲーションと下スワイプクローズの実装方法調査
- **Sources Consulted**: Context7 ドキュメント、公式 GitHub リポジトリ
- **Findings**:
  - `controller.closeOnPullDown: true` で下スワイプクローズが有効化
  - `controller.closeOnPullUp: true` で上スワイプクローズも可能
  - 標準でスワイプナビゲーションが有効（`disableSwipeNavigation: true` で無効化）
  - `index` prop と `on.view` コールバックで外部からスライドインデックスを制御可能
  - `carousel.finite: true` で端でのスワイプを制限（既に設定済み）
  - `render.buttonPrev/buttonNext` を null にしてもスワイプは動作する
- **Implications**:
  - Requirement 1, 2 は Lightbox の標準機能で実現可能
  - 新規ライブラリ追加不要でプレビュー画面のジェスチャー対応が可能

### @use-gesture/react ライブラリ

- **Context**: ファイルリスト画面でのスワイプ・長押し検出ライブラリ選定
- **Sources Consulted**: Context7 ドキュメント、pmndrs/use-gesture 公式ドキュメント
- **Findings**:
  - `useDrag` フックで `swipe` 属性を取得可能（-1, 0, 1 のベクトル）
  - `swipe.distance`、`swipe.velocity`、`swipe.duration` で閾値設定可能
  - `threshold` オプションで軸ごとに最小移動距離を設定可能
  - React 19 と互換性あり
  - バンドルサイズ: ~12KB gzipped（軽量）
- **Implications**:
  - Requirement 3（左スワイプで戻る）、4（長押し）の実装に最適
  - スクロールとの競合を `threshold` と `filterTaps` で制御可能

### 既存コンポーネント構造分析

- **Context**: 変更対象コンポーネントと統合ポイントの特定
- **Sources Consulted**: ソースコード分析（PreviewModal.tsx, FileList.tsx, index.tsx）
- **Findings**:
  - PreviewModal: 単一スライドのみ（`slides` は常に 1 要素）、複数スライド対応が必要
  - FileList: `onClick` ハンドラで全アイテム処理、長押し分岐の追加が必要
  - FileActionMenu: Ellipsis アイコンでドロップダウン表示、削除対象
  - useStoragePath: `goBack()` 関数で親ディレクトリへ移動、スワイプから呼び出し可能
  - MediaBrowser: `sortedItems` を `previewableItems` としてフィルタリングする必要あり
- **Implications**:
  - PreviewModal の slides 配列をプレビュー可能な全ファイルに拡張必要
  - FileList に長押し検出ロジックを追加
  - MediaBrowser コンテンツ領域にスワイプハンドラを追加

## Architecture Pattern Evaluation

| Option                              | Description                                                            | Strengths                                             | Risks / Limitations                     | Notes  |
| ----------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------- | --------------------------------------- | ------ |
| Lightbox 標準スワイプ + use-gesture | Lightbox の組み込みスワイプを活用し、リスト画面のみ use-gesture で実装 | 最小限の依存追加、Lightbox の最適化されたスワイプ体験 | Lightbox のスワイプ動作カスタマイズ制限 | 推奨   |
| 全て use-gesture で統一             | Lightbox にもカスタムスワイプハンドラを追加                            | 統一されたジェスチャー体験                            | Lightbox 内部との競合リスク、実装複雑化 | 不採用 |

## Design Decisions

### Decision: ジェスチャーライブラリ選定

- **Context**: ファイルリスト画面でのスワイプ・長押し検出に必要
- **Alternatives Considered**:
  1. @use-gesture/react — React 向け軽量ジェスチャーライブラリ
  2. Hammer.js — 汎用ジェスチャーライブラリ（大型）
  3. 手動実装 — Touch Events API を直接使用
- **Selected Approach**: @use-gesture/react
- **Rationale**:
  - React Hooks との親和性が高い
  - pmndrs（react-spring チーム）が開発・メンテナンス
  - バンドルサイズが小さい（~12KB gzipped）
  - swipe 検出が組み込み済み
- **Trade-offs**: 新規依存追加が必要だが、メンテナンス性と実装速度で優位
- **Follow-up**: package.json への追加、バージョン固定

### Decision: プレビュー画面のスライドナビゲーション

- **Context**: 複数ファイル間のスワイプナビゲーション実装
- **Alternatives Considered**:
  1. Lightbox 標準スワイプ — slides に全プレビュー可能ファイルを渡す
  2. カスタムスワイプハンドラ — use-gesture で独自実装
- **Selected Approach**: Lightbox 標準スワイプ
- **Rationale**:
  - 既に最適化されたスワイプ体験が提供される
  - アニメーション・閾値・端でのバウンス等が自動処理
  - 追加実装不要
- **Trade-offs**: Lightbox の動作に依存するが、カスタマイズ余地は十分
- **Follow-up**: slides 配列を全プレビュー可能ファイルに拡張

### Decision: 長押し検出の実装方式

- **Context**: ファイルアイテムの長押しでアクションメニュー表示
- **Alternatives Considered**:
  1. useDrag + delay — use-gesture の delay オプション活用
  2. useLongPress カスタムフック — setTimeout ベースの手動実装
- **Selected Approach**: カスタム useLongPress フック
- **Rationale**:
  - use-gesture の delay は長押し専用ではなくドラッグ開始遅延
  - 長押しはスクロール中のキャンセル・移動量チェックが必要
  - 専用フックで単一責任を維持
- **Trade-offs**: カスタム実装だが、ロジックはシンプル（50行程度）
- **Follow-up**: useLongPress フックの作成

## Risks & Mitigations

- **ブラウザのエッジスワイプ競合** — touch-action: pan-y で垂直スクロールのみ許可し、水平スワイプをアプリで処理
- **スクロール中の誤発動** — threshold 設定と移動量チェックで防止
- **Lightbox 内部との競合** — Lightbox 標準機能を使用し、外部からのジェスチャー追加を避ける
- **iOS Safari のプルリフレッシュ** — overscroll-behavior: none で抑制

## References

- [@use-gesture/react 公式ドキュメント](https://use-gesture.netlify.app/) — スワイプ検出オプション、閾値設定
- [yet-another-react-lightbox ドキュメント](https://yet-another-react-lightbox.com/) — controller props、スワイプ設定
- [MDN Touch Events](https://developer.mozilla.org/en-US/docs/Web/API/Touch_events) — ブラウザタッチイベント仕様
- [CSS touch-action](https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action) — ブラウザジェスチャー制御
