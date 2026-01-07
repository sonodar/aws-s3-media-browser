# Research & Design Decisions

## Summary

- **Feature**: `file-sort-order`
- **Discovery Scope**: Extension（既存システムへの機能追加）
- **Key Findings**:
  - 既存の `parseStorageItems.ts` に名前昇順ソートが実装済み（line 53-56）
  - `StorageItem` 型には `size` と `lastModified` が既に定義されている
  - ソート順の永続化には `localStorage` が最適（Cookie より容量・API の観点で優位）

## Research Log

### 既存ソートロジックの分析

- **Context**: 現在のソート実装と拡張ポイントを特定
- **Sources Consulted**: `src/hooks/parseStorageItems.ts`
- **Findings**:
  - 現在は `parseStorageItems` 関数内で固定のソートロジックを適用
  - フォルダ優先 + 名前昇順（`localeCompare`）が実装済み
  - ソートロジックを外部から注入可能にする必要がある
- **Implications**:
  - ソートロジックを純粋関数として分離し、`parseStorageItems` から呼び出す形に変更
  - または `useStorageOperations` の戻り値をソート前の状態にし、呼び出し側でソートを適用

### StorageItem 型の確認

- **Context**: ソート基準に必要なプロパティの存在確認
- **Sources Consulted**: `src/types/storage.ts`
- **Findings**:
  - `size?: number` - ファイルサイズ（オプショナル）
  - `lastModified?: Date` - 最終更新日時（オプショナル）
  - 両フィールドが `undefined` の可能性があるため、ソート時のフォールバックが必要
- **Implications**:
  - `size` が `undefined` の場合は 0 として扱う
  - `lastModified` が `undefined` の場合は最も古い日付として扱う

### 永続化方式の選定

- **Context**: ソート設定の永続化に最適なストレージ方式を決定
- **Sources Consulted**: MDN Web Docs（localStorage, Cookie）
- **Findings**:
  - `localStorage`: 5MB 容量、同期API、簡潔なインターフェース
  - `Cookie`: 4KB 制限、リクエストに含まれるオーバーヘッド、有効期限管理必要
  - `sessionStorage`: タブ単位でリセット（要件を満たさない）
- **Implications**:
  - `localStorage` を採用（シンプルで十分な容量）
  - フォールバックとしてデフォルト値を返す

### 自然順ソートの実装方式

- **Context**: 名前ソートで数字を正しく扱う方法
- **Sources Consulted**: JavaScript `Intl.Collator` API
- **Findings**:
  - `Intl.Collator` に `{ numeric: true }` オプションを指定することで自然順ソートが可能
  - 例: "file2" < "file10" の順序が保証される
  - ブラウザサポート: 全モダンブラウザで利用可能
- **Implications**:
  - `new Intl.Collator('ja', { numeric: true, sensitivity: 'base' }).compare` を使用

## Architecture Pattern Evaluation

| Option           | Description                                     | Strengths                                | Risks / Limitations            | Notes    |
| ---------------- | ----------------------------------------------- | ---------------------------------------- | ------------------------------ | -------- |
| Hook-based State | `useSortOrder` カスタムフックでソート状態を管理 | 単一責任、テスト容易、既存パターンと整合 | 追加フック導入                 | 推奨     |
| Context-based    | React Context でグローバル管理                  | コンポーネント間共有が容易               | 過剰設計、再レンダリングリスク | 不採用   |
| URL Query Param  | URLにソート順を含める                           | ブックマーク可能、共有可能               | 要件外の複雑さ追加             | 将来検討 |

## Design Decisions

### Decision: ソートロジックの分離

- **Context**: 現在 `parseStorageItems` 内に埋め込まれているソートロジックを柔軟に変更可能にする
- **Alternatives Considered**:
  1. `parseStorageItems` にソート引数を追加
  2. 別の純粋関数 `sortStorageItems` を作成
- **Selected Approach**: `sortStorageItems` を独立した純粋関数として作成
- **Rationale**: 単一責任原則、テスト容易性、既存コードへの影響最小化
- **Trade-offs**: 関数呼び出しが1つ増える vs 柔軟性と保守性の向上
- **Follow-up**: 既存テストが引き続きパスすることを確認

### Decision: UI コンポーネント配置

- **Context**: ソート選択UIの配置場所
- **Alternatives Considered**:
  1. Header コンポーネント内に追加
  2. FileList の上部に専用コンポーネントを配置
  3. ファイル一覧とヘッダーの間にツールバーを新設
- **Selected Approach**: FileList の直上に `SortSelector` コンポーネントを配置
- **Rationale**:
  - Header は選択モード時に別のUIに切り替わるため、ソートUIが消える問題がある
  - ソート対象（ファイル一覧）の近くに配置することでUXが向上
- **Trade-offs**: 新規コンポーネント追加 vs Header の複雑化回避
- **Follow-up**: レスポンシブデザインの確認

### Decision: 永続化キー名

- **Context**: localStorage に保存するキー名の決定
- **Selected Approach**: `s3-photo-browser:sort-order` をキー名として使用
- **Rationale**: アプリケーション固有のプレフィックスで他のアプリとの衝突を回避

## Risks & Mitigations

- `lastModified` / `size` が `undefined` のケース → デフォルト値でソート継続（ユーザー体験を損なわない）
- localStorage が無効化されている環境 → try-catch でエラーをキャッチし、デフォルト値を使用
- 既存の `parseStorageItems` との互換性 → 既存テストを維持し、新機能は追加テストでカバー

## References

- [MDN: localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
- [MDN: Intl.Collator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Collator)
- [React Hooks Pattern](https://react.dev/reference/react/hooks)
