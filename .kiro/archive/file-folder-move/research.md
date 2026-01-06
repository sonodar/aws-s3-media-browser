# Research & Design Decisions

## Summary

- **Feature**: `file-folder-move`
- **Discovery Scope**: Extension（既存システムへの機能追加）
- **Key Findings**:
  - Amplify Storage の `copy` + `remove` API でファイル移動を実現可能（既に `renameItem`/`renameFolder` で実績あり）
  - 既存の `useSelection` フックで複数選択管理が実装済み（Set ベース、O(1) チェック）
  - 循環移動防止には移動対象のプレフィックスと移動先の比較が必要

## Research Log

### Amplify Storage API での移動実装

- **Context**: S3 にはネイティブの「移動」操作がないため、copy + delete で実現する必要がある
- **Sources Consulted**:
  - 既存コード: `src/hooks/useStorageOperations.ts`
  - Amplify Storage ドキュメント（Context7）
- **Findings**:
  - `copy({ source: { path }, destination: { path } })` でオブジェクトをコピー
  - `remove({ path })` で元オブジェクトを削除
  - 既存の `renameItem`/`renameFolder` が同じパターンを使用済み
  - 日本語パスには `encodePathForCopy` ユーティリティが必要（既存実装あり）
- **Implications**: 既存パターンを踏襲し、`moveItems` 関数を `useStorageOperations` に追加

### 循環移動防止ロジック

- **Context**: フォルダを自身のサブフォルダに移動しようとすると論理矛盾が発生
- **Sources Consulted**: ファイルシステムの一般的な制約
- **Findings**:
  - 移動先パスが移動元プレフィックスで開始する場合は循環移動
  - 例: `2024/` を `2024/January/` に移動 → 禁止
  - 判定ロジック: `destinationPath.startsWith(sourcePrefix)`
- **Implications**: 移動先選択UIで該当フォルダを無効化、移動実行前にもバリデーション

### 既存の選択管理フック

- **Context**: 複数選択・一括操作のための選択状態管理
- **Sources Consulted**: `src/hooks/useSelection.ts`
- **Findings**:
  - `selectedKeys: ReadonlySet<string>` で選択状態を管理
  - `toggleSelection`, `toggleSelectAll`, `clearSelection` が実装済み
  - `isSelectionMode` で選択モードの有効/無効を管理
- **Implications**: 移動機能も既存の選択フローに統合可能

### 移動先選択UIのパターン

- **Context**: ユーザーが移動先フォルダを選択するためのUI
- **Sources Consulted**: 既存の `CreateFolderDialog`, `RenameDialog` のパターン
- **Findings**:
  - 既存ダイアログはモーダル形式
  - フォルダブラウジングには `list` API を使用して動的にフォルダ一覧を取得
  - ナビゲーション状態は独立した useState で管理
- **Implications**: `MoveDialog` コンポーネントを新規作成、フォルダナビゲーション機能を内包

## Architecture Pattern Evaluation

| Option                       | Description                   | Strengths            | Risks / Limitations | Notes                    |
| ---------------------------- | ----------------------------- | -------------------- | ------------------- | ------------------------ |
| useStorageOperations 拡張    | 既存フックに moveItems を追加 | 一貫性維持、再利用性 | フックが肥大化      | 推奨：既存パターンに従う |
| 新規 useMoveOperation フック | 移動専用フックを作成          | 責務分離             | 依存関係が増加      | 過剰な分離               |

## Design Decisions

### Decision: 移動操作を useStorageOperations に追加

- **Context**: ファイル移動は既存のストレージ操作（削除、リネーム）と同じカテゴリ
- **Alternatives Considered**:
  1. `useStorageOperations` に `moveItems` を追加
  2. 新規 `useMoveOperation` フックを作成
- **Selected Approach**: `useStorageOperations` に追加
- **Rationale**:
  - 既存の `renameItem`/`renameFolder` が同様のパターン
  - 依存関係の簡素化
  - 一貫した API 設計
- **Trade-offs**: フックのサイズが増加するが、責務は「ストレージ操作」として一貫
- **Follow-up**: 将来的にフックが肥大化した場合は分割を検討

### Decision: 移動先選択UIは独立したダイアログコンポーネント

- **Context**: 移動先選択は複雑なナビゲーションを必要とする
- **Alternatives Considered**:
  1. 独立した `MoveDialog` コンポーネント
  2. 既存の `FileList` を再利用したインライン選択
- **Selected Approach**: 独立した `MoveDialog` コンポーネント
- **Rationale**:
  - 責務の分離（メインブラウザと移動先選択は独立）
  - 循環移動防止ロジックをダイアログ内にカプセル化
  - 既存の `CreateFolderDialog`, `RenameDialog` パターンとの一貫性
- **Trade-offs**: 新規コンポーネント追加、フォルダリスト取得ロジックの一部重複
- **Follow-up**: 共通化可能な部分はユーティリティ抽出を検討

### Decision: 同名ファイル存在時は移動中止（上書き・スキップ選択なし）

- **Context**: 要件 4.1 で同名ファイル存在時はエラーとして移動中止
- **Alternatives Considered**:
  1. 即時中止（エラー表示）
  2. 上書き確認ダイアログ
  3. スキップして続行
- **Selected Approach**: 即時中止
- **Rationale**:
  - 初期実装のシンプルさ
  - データ損失リスクの最小化
  - 要件に明記された振る舞い
- **Trade-offs**: ユーザーは手動で既存ファイルを削除/リネームする必要あり
- **Follow-up**: 将来的に上書き確認オプションを追加可能

## Risks & Mitigations

- **Risk 1**: 大量ファイル移動時のタイムアウト
  - **Mitigation**: 既存の `renameFolder` と同様、進捗表示 + 逐次処理
  - **Note**: 既存実装で 1000 件上限を設けている（`MAX_FOLDER_RENAME_ITEMS`）

- **Risk 2**: 移動中の部分失敗によるデータ不整合
  - **Mitigation**: 要件 4.4 に従い、失敗時は元の構造を保持（copy 成功後のみ delete）

- **Risk 3**: 循環移動の見落とし
  - **Mitigation**: UI 側での無効化 + 移動実行前のバックエンドバリデーション（二重チェック）

## References

- [Amplify Storage Copy API](https://docs.amplify.aws/react/build-a-backend/storage/copy/) - 公式ドキュメント
- 既存実装: `src/hooks/useStorageOperations.ts` - renameItem/renameFolder のパターン
- 既存実装: `src/hooks/useSelection.ts` - 選択状態管理
