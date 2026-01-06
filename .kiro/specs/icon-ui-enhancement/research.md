# Research & Design Decisions

## Summary

- **Feature**: `icon-ui-enhancement`
- **Discovery Scope**: Extension（既存UIコンポーネントへのアイコンライブラリ統合）
- **Key Findings**:
  - Lucide React が React 19 + TypeScript + Vite に最適（tree-shaking、型安全、shadcn/ui採用実績）
  - 既存コンポーネントは絵文字/文字でアイコン表現しており、置き換え箇所は明確
  - ハンバーガーメニューは新規コンポーネント追加が必要（DropdownMenu）
  - ファイルアクションメニュー（3点リーダー）も DropdownMenu を再利用して実装可能

## Research Log

### アイコンライブラリ選定

- **Context**: React 19 + TypeScript + Vite 環境で使用可能な軽量アイコンライブラリを選定
- **Sources Consulted**:
  - [Lucide React 公式ドキュメント](https://lucide.dev/guide/packages/lucide-react)
  - [IconScout - 2025 Best Icon Libraries](https://iconscout.com/blog/best-react-icons-library)
  - [Medium - Top 10 Icon Libraries for React](https://medium.com/@reactjsbd/top-10-icon-libraries-for-react-development-a-comprehensive-guide-e7b4b6795027)
- **Findings**:
  - Lucide React: Feather Icons のフォーク、1000+ アイコン、完全な TypeScript 型定義
  - Tree-shaking 対応で使用するアイコンのみバンドルに含まれる
  - shadcn/ui がデフォルトアイコンセットとして採用
  - Props: `size`（数値、デフォルト24）、`color`（文字列、デフォルト'currentColor'）、`strokeWidth`（数値、デフォルト2）
- **Implications**: Lucide React を採用。軽量、型安全、プロジェクトの技術スタックと完全互換

### 既存UIコンポーネント分析

- **Context**: アイコン置き換え対象の特定と統合ポイントの把握
- **Sources Consulted**: プロジェクトソースコード
- **Findings**:
  - `FileList.tsx`: 絵文字アイコン（📁🖼️🎬📄）を `getFileIcon()` 関数で生成
  - `FileActions.tsx`: FAB ボタンに 📁+、⬆️、✕ を使用
  - `Header.tsx`: テキストボタン（選択、設定、サインアウト、キャンセル、削除、全選択/全解除）と ← 文字
  - CSSでは既に 44px タッチターゲット確保済み（.back-button, .close-button など）
- **Implications**: 各コンポーネントのレンダリング部分のみ変更で対応可能、ロジック変更不要

### ハンバーガーメニュー実装

- **Context**: 設定・サインアウトをドロップダウンメニューに移動
- **Findings**:
  - 新規 `DropdownMenu` コンポーネントが必要
  - 外部クリック検出: `useEffect` + `document.addEventListener`
  - キーボードナビゲーション: `onKeyDown` ハンドラで Tab/Enter/Escape 対応
  - アクセシビリティ: `aria-expanded`, `aria-haspopup`, `role="menu"`, `role="menuitem"`
- **Implications**: 軽量な自作実装で対応（外部ライブラリ不要）

### 3状態チェックボックス（全選択コントロール）

- **Context**: [WANT] 要件として全選択を3状態チェックボックスで実装
- **Findings**:
  - HTML チェックボックスの `indeterminate` プロパティで中間状態を表現可能
  - React では `ref` 経由で `indeterminate` を設定
  - Lucide には `Square`, `CheckSquare`, `MinusSquare` アイコンあり（アイコン代替も可能）
- **Implications**: ネイティブチェックボックス + ref で実装可能。難易度低

## Architecture Pattern Evaluation

| Option       | Description                   | Strengths                               | Risks / Limitations              | Notes  |
| ------------ | ----------------------------- | --------------------------------------- | -------------------------------- | ------ |
| Lucide React | モダン SVG アイコンライブラリ | Tree-shaking、TypeScript、React 19 互換 | 特になし                         | 採用   |
| React Icons  | 複数ライブラリ統合            | アイコン数最多                          | バンドルサイズ大、命名衝突リスク | 不採用 |
| MUI Icons    | Material Design アイコン      | MUI との統合                            | MUI 依存、プロジェクトに不要     | 不採用 |

## Design Decisions

### Decision: Lucide React の採用

- **Context**: プロジェクトに適したアイコンライブラリの選定
- **Alternatives Considered**:
  1. React Icons — 多様なアイコンセットを統合だがバンドルサイズ懸念
  2. MUI Icons — Material Design だが MUI 依存が発生
  3. Heroicons — Tailwind 向け最適化、アイコン数が少ない
- **Selected Approach**: Lucide React
- **Rationale**: Tree-shaking 対応、TypeScript 完全サポート、React 19 互換、shadcn/ui 採用実績
- **Trade-offs**: アイコン数は React Icons より少ないが、必要なアイコンは十分カバー
- **Follow-up**: 必要なアイコンがすべて揃っているか実装時に確認

### Decision: 自作 DropdownMenu コンポーネント

- **Context**: ハンバーガーメニュー機能の実装方法
- **Alternatives Considered**:
  1. Radix UI Dropdown — 高機能だが追加依存
  2. 自作実装 — 軽量、依存なし
- **Selected Approach**: 自作実装
- **Rationale**: メニュー項目が2つのみで単純、外部ライブラリは過剰
- **Trade-offs**: アクセシビリティ実装は自前で行う必要あり
- **Follow-up**: ARIA 属性とキーボードナビゲーションのテスト

### ファイルアクションメニュー設計

- **Context**: リネームボタンを3点リーダーメニュー化し、リネームと削除を統合
- **Sources Consulted**: 現在のコード（FileList.tsx、FileList.css）
- **Findings**:
  - 現在のリネームボタンは ✏️ 絵文字を使用、`rename-button` クラスで 28x28px
  - 3点リーダー（`Ellipsis` または `EllipsisHorizontal`）に置き換え
  - DropdownMenu を再利用可能（コンポジション）
  - メニュー位置は `position='bottom-right'` で既存UIと調和
  - イベント伝播の阻止が必要（親リストアイテムのクリックと干渉防止）
- **Implications**: FileActionMenu コンポーネントを新設し、DropdownMenu を内部で使用

## Risks & Mitigations

- **Risk 1**: Lucide に必要なアイコンがない → Mitigations: 類似アイコンで代替、最悪の場合カスタム SVG
- **Risk 2**: 既存テストの破損 → Mitigations: aria-label によるクエリで互換性維持
- **Risk 3**: DropdownMenu のアクセシビリティ不足 → Mitigations: WAI-ARIA パターン準拠の実装
- **Risk 4**: FileActionMenu のタッチターゲットサイズ不足 → Mitigations: ボタンサイズを最低 44x44px に設定

## References

- [Lucide React 公式ガイド](https://lucide.dev/guide/packages/lucide-react) — 使用方法と Props 仕様
- [IconScout - 2025 Best React Icon Libraries](https://iconscout.com/blog/best-react-icons-library) — ライブラリ比較
- [WAI-ARIA Menu Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menu/) — ドロップダウンメニューのアクセシビリティ
