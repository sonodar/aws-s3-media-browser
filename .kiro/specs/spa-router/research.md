# Research & Design Decisions

## Summary
- **Feature**: spa-router
- **Discovery Scope**: Extension（既存システムへの機能追加）
- **Key Findings**:
  - 現在の useStorage フックで currentPath を React state として管理
  - ルーティングライブラリ未導入（依存関係なし）
  - シンプルな単一パス同期のためフルルーターは過剰

## Research Log

### ルーティングアプローチの検討
- **Context**: SPA でのページリロード時に currentPath を保持する方法
- **Sources Consulted**:
  - History API (MDN)
  - React Router v7 documentation
  - Wouter documentation
- **Findings**:
  - このアプリは単一画面（MediaBrowser）でパス状態のみを管理
  - 複数ページルーティングは不要
  - History API の pushState/popstate で十分対応可能
- **Implications**:
  - 外部ライブラリ不要
  - useStorage フックの拡張で実装可能

### URL 形式の検討
- **Context**: フォルダパスを URL に反映する形式の選定
- **Sources Consulted**: Amplify Hosting documentation, SPA routing best practices
- **Findings**:
  - **クエリパラメータ** (`?path=folder1/folder2`): サーバー設定不要、エンコード容易
  - **ハッシュベース** (`#/folder1/folder2`): SPA 向きだが非標準的
  - **パスベース** (`/browse/folder1/folder2`): 美しいが Amplify Hosting のリダイレクト設定が必要
- **Implications**:
  - Amplify Hosting との互換性を考慮し、クエリパラメータ形式を採用
  - 将来的にパスベースへの移行も可能（設計で拡張性確保）

### 既存コード統合ポイント
- **Context**: 変更対象ファイルの特定
- **Sources Consulted**: 既存コードベース分析（Grep/Read）
- **Findings**:
  - `useStorage.ts`: currentPath state 管理、navigate/goBack 関数
  - `MediaBrowser/index.tsx`: useStorage を消費
  - `Header.tsx`: currentPath 表示（パンくずリスト）
- **Implications**:
  - useStorage フックへの URL 同期ロジック追加が最小影響
  - 新規 hook (useUrlSync) 抽出も検討可能

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Native History API | pushState/popstate 直接利用 | 依存関係ゼロ、最小バンドル | 手動実装が必要 | 採用: シンプルな要件に最適 |
| React Router v7 | フル機能ルーター | 豊富な機能、大きなコミュニティ | ~15KB 追加、過剰な機能 | 不採用: 単一パス同期には過剰 |
| Wouter | 軽量ルーター (~1.5KB) | 小さなフットプリント | 機能限定 | 不採用: 依存追加を避ける |

## Design Decisions

### Decision: Native History API 採用
- **Context**: URL とパス状態を同期する実装方式の選定
- **Alternatives Considered**:
  1. React Router v7 — フル機能だが過剰
  2. Wouter — 軽量だが外部依存追加
  3. Native History API — 依存なし、必要十分
- **Selected Approach**: Native History API (pushState, popstate)
- **Rationale**:
  - 単一のパス状態同期のみが要件
  - 外部依存追加を最小化
  - バンドルサイズ影響なし
- **Trade-offs**:
  - 手動実装が必要（ただしコード量は少ない）
  - 将来複雑なルーティングが必要になった場合は再検討
- **Follow-up**: テストで popstate イベント処理を検証

### Decision: クエリパラメータ形式 URL
- **Context**: フォルダパスの URL エンコード形式
- **Alternatives Considered**:
  1. Path-based `/browse/folder1/folder2` — サーバー設定必要
  2. Hash-based `#/folder1/folder2` — 非標準的
  3. Query parameter `?path=folder1/folder2` — 設定不要
- **Selected Approach**: クエリパラメータ (`?path=...`)
- **Rationale**:
  - Amplify Hosting で追加設定不要
  - encodeURIComponent で日本語対応容易
  - S3 キー形式との互換性維持
- **Trade-offs**:
  - URL の見た目がやや長くなる
  - 将来的にパスベースへ移行可能（設計で抽象化）
- **Follow-up**: 日本語フォルダ名のエンコード/デコードテスト

### Decision: useStorage への URL 同期ロジック追加
- **Context**: URL 同期ロジックの配置場所
- **Alternatives Considered**:
  1. useStorage 内に直接実装 — 既存フックの責務増大だが最小変更
  2. useUrlPath 新規フック作成 — 単一責務の原則に従う
  3. useStorage リファクタリング + URL 同期 — スコープ過大
- **Selected Approach**: useStorage 内に直接実装
- **Rationale**:
  - 最小変更で機能を実現できる
  - 新規フック追加よりシンプル
  - 将来のリファクタリングで責務分離を検討
- **Trade-offs**:
  - useStorage の責務がさらに増える
  - 将来的に分離が必要になる可能性
- **Follow-up**: useStorage のリファクタリングは別タスクとして実施

## Risks & Mitigations
- **ブラウザ履歴汚染**: 頻繁な pushState でブラウザ履歴が肥大化 → replaceState との使い分けを検討
- **初期ロード競合**: URL パース前に fetchItems が発動 → 初期化順序の制御が必要
- **日本語パス文字化け**: エンコード/デコード不一致 → encodeURIComponent/decodeURIComponent を一貫使用

## References
- [History API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/History_API)
- [AWS Amplify Hosting - Single Page App Rewrites](https://docs.aws.amazon.com/amplify/latest/userguide/redirects.html)
