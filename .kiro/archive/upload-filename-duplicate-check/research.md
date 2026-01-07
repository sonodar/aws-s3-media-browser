# Research & Design Decisions

## Summary

- **Feature**: `upload-filename-duplicate-check`
- **Discovery Scope**: Extension（既存システムへの機能追加）
- **Key Findings**:
  - FileUploader の `processFile` コールバックでアップロード前にキー（ファイル名）を変更可能
  - 既存の `validateRename.ts` のバリデーションルールを再利用可能
  - `useStorageOperations` の `items` ステートで現在のフォルダ内ファイル一覧を取得済み

## Research Log

### FileUploader processFile API

- **Context**: アップロード前にファイル名を変更する方法を調査
- **Sources Consulted**:
  - Amplify UI ドキュメント（Context7経由）
  - `@aws-amplify/ui-react-storage` FileUploader コンポーネント
- **Findings**:
  - `processFile` プロパティで `{ file, key }` を受け取り、変更後の `{ file, key }` を返却可能
  - 同期処理または Promise を返却可能
  - `key` を変更することでアップロード先のファイル名を変更できる
- **Implications**:
  - 既存の FileUploader コンポーネントを置き換えずに機能追加可能
  - `processFile` 内で重複チェックと自動リネームを実行

### 既存の重複チェック実装パターン

- **Context**: リネーム時の重複チェック実装を参考にする
- **Sources Consulted**:
  - `src/utils/validateRename.ts`
  - `src/hooks/useStorageOperations.ts`
- **Findings**:
  - UI層バリデーション: `existingItems` 配列から同名ファイルを検索
  - 大文字小文字を区別（S3の仕様に準拠）
  - 長さ制限100文字のバリデーション
  - `useStorageOperations` の `items` で現在フォルダのファイル一覧を保持
- **Implications**:
  - 同じパターンでアップロード時の重複チェックを実装
  - 既存バリデーションルールを関数として抽出・再利用

### 自動リネームのファイル名形式

- **Context**: 重複時の連番付与形式を決定
- **Sources Consulted**:
  - Windows/macOS のファイルコピー時の命名規則
  - 一般的なファイル管理アプリケーションの挙動
- **Findings**:
  - Windows: `filename (1).ext`, `filename (2).ext`
  - macOS: `filename copy.ext`, `filename copy 2.ext`
  - Google Drive: `filename (1).ext`
- **Implications**:
  - `ファイル名 (N).拡張子` 形式を採用（Windows/Google Drive準拠）
  - 拡張子がない場合は末尾に ` (N)` を追加

## Architecture Pattern Evaluation

| Option                   | Description                                            | Strengths                            | Risks / Limitations                                                | Notes  |
| ------------------------ | ------------------------------------------------------ | ------------------------------------ | ------------------------------------------------------------------ | ------ |
| processFile コールバック | FileUploader の processFile 内で重複チェック＆リネーム | 既存コンポーネント活用、最小限の変更 | processFile は各ファイルで呼ばれるため、ファイル間の重複考慮が必要 | 採用   |
| カスタムアップロード     | FileUploader を廃止し、独自アップロード UI             | 完全な制御                           | 大きな実装コスト、進捗表示の再実装                                 | 不採用 |
| プリチェックダイアログ   | アップロード前に全ファイルをチェックしダイアログ表示   | ユーザーに事前通知可能               | UXの複雑化、要件（自動リネーム）と不一致                           | 不採用 |

## Design Decisions

### Decision: processFile コールバックによる実装

- **Context**: 既存の FileUploader を維持しつつ重複チェックを追加
- **Alternatives Considered**:
  1. カスタムアップロード実装 — 進捗表示含め全て再実装
  2. onUploadStart イベント — Amplify UI では未提供
- **Selected Approach**: `processFile` で各ファイルのキーを重複チェック後に変更
- **Rationale**: 最小限の変更で要件を満たせる。Amplify UI の機能を活用。
- **Trade-offs**: processFile は各ファイルで個別に呼ばれるため、同時アップロードファイル間の重複は別途考慮が必要
- **Follow-up**: 同時アップロードファイル間の重複チェックは `processFile` 実行順序に依存するため、テストで動作確認

### Decision: 自動リネーム用ユーティリティ関数の新規作成

- **Context**: 連番付与ロジックをテスト可能な純粋関数として分離
- **Alternatives Considered**:
  1. processFile 内にロジックを直接記述
  2. validateRename を拡張
- **Selected Approach**: 新規ユーティリティ `generateUniqueFilename` を作成
- **Rationale**: 単一責任の原則。テスト容易性。リネームとアップロードで異なる要件。
- **Trade-offs**: ファイル追加
- **Follow-up**: なし

## Risks & Mitigations

- **同時アップロード時のレースコンディション**: 複数ファイル同時アップロード時、processFile が並行実行される可能性あり → 連番生成時に既にキューイングされたファイル名も考慮する必要あり。FileUploader が順次処理する場合は問題なし。テストで確認。
- **長いファイル名での連番付与**: 元ファイル名が100文字に近い場合、連番付与で上限超過 → 長さ制限バリデーションを連番生成後に適用、超過時はエラー扱い

## References

- [Amplify UI FileUploader processFile](https://ui.docs.amplify.aws/react/connected-components/storage/fileuploader) — キー変更の公式ドキュメント
- `src/utils/validateRename.ts` — 既存バリデーションロジック
- `src/hooks/useStorageOperations.ts` — 既存ストレージ操作パターン
