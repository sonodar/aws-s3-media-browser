# Research & Design Decisions

---

## Summary

- **Feature**: `fix-duplicate-folder-creation`
- **Discovery Scope**: Extension（既存システムの拡張）
- **Key Findings**:
  - `validateRename.ts` に既存の重複チェックパターンが存在し、再利用可能
  - `useStorageItems` フックが TanStack Query でキャッシュされた StorageItem 一覧を提供
  - CreateFolderDialog は現在 `existingItems` を受け取っておらず、props の追加が必要

## Research Log

### 既存のバリデーションパターン分析

- **Context**: フォルダ名の重複チェックを実装するにあたり、既存のバリデーションパターンを調査
- **Sources Consulted**: `src/utils/validateRename.ts`, `src/components/MediaBrowser/CreateFolderDialog.tsx`
- **Findings**:
  - `validateRename` 関数が以下のバリデーションルールを実装済み:
    1. 空文字チェック
    2. 無効文字チェック（スラッシュ）
    3. 長さ制限（100文字）
    4. 同一名チェック
    5. 重複チェック（タイプ別）
  - CreateFolderDialog には独自の `validateFolderName` 関数があるが、重複チェックロジックは含まれていない
  - エラーメッセージは日本語で統一されている
- **Implications**:
  - `validateRename` の重複チェックロジックを流用可能
  - フォルダ作成用に新しいバリデーション関数を作成するか、既存関数を拡張するか選択が必要

### CreateFolderDialog のデータフロー分析

- **Context**: 重複チェックに必要な既存フォルダ一覧をどのように取得するか
- **Sources Consulted**: `src/hooks/storage/useStorageItems.ts`, `src/components/MediaBrowser/CreateFolderDialog.tsx`
- **Findings**:
  - `useStorageItems` が `StorageItem[]` を返す（フォルダとファイルの両方を含む）
  - 現在の CreateFolderDialog は `isOpen`, `onClose`, `onCreate` のみを props として受け取る
  - 親コンポーネントから `existingItems` を渡す必要がある
- **Implications**:
  - props に `existingFolders: string[]` または `existingItems: StorageItem[]` を追加
  - シンプルさを優先し、`existingFolderNames: string[]` として文字列配列を渡す方式を採用

## Architecture Pattern Evaluation

| Option                           | Description                                                | Strengths                          | Risks / Limitations                                       | Notes    |
| -------------------------------- | ---------------------------------------------------------- | ---------------------------------- | --------------------------------------------------------- | -------- |
| Props 経由でフォルダ名一覧を渡す | 親から `existingFolderNames: string[]` を props として渡す | シンプル、既存パターンと一貫性あり | props の追加が必要                                        | **選択** |
| useStorageItems を直接呼び出す   | ダイアログ内で `useStorageItems` を呼び出す                | コンポーネントの自己完結性         | 同じデータを二重取得、identityId/currentPath の伝播が必要 | 不採用   |
| Context 経由で共有               | StorageContext で既存アイテムを共有                        | グローバルアクセス                 | 過度な結合、既存パターンからの逸脱                        | 不採用   |

## Design Decisions

### Decision: 共通バリデーションロジックの抽出

- **Context**: フォルダ作成時の重複チェック機能を実装する必要がある
- **Alternatives Considered**:
  1. `validateRename` を拡張して新規作成にも対応させる（item をオプショナルに）
  2. CreateFolderDialog 内で独自のバリデーション関数を維持（重複コード発生）
  3. 共通ロジックを抽出し、用途別関数は各コンポーネントに配置
- **Selected Approach**: 共通ロジックを `validateItemName.ts` に抽出
- **Rationale**:
  - `validateRename` をそのまま使えない理由:
    - `item` パラメータが必須だが、新規作成時には対象アイテムが存在しない
    - 同一名チェック（`normalizedName === item.name`）は新規作成では不要
    - 重複チェックで `existing.key !== item.key` で自分自身を除外するが、新規作成では除外対象がない
  - 共通ロジック（空文字、スラッシュ、長さ）を一元管理してルールの一貫性を保証
  - 用途別関数（validateRename, validateNewFolderName）は各コンポーネントに配置し責務を分離
- **Trade-offs**:
  - ファイル構成の変更が必要（validateRename.ts → validateItemName.ts）
  - 既存テストの移動・更新が必要
- **Follow-up**: validateRename.test.ts も適切に分割・移動

### Decision: StorageItem[] を props で渡す

- **Context**: 重複チェックに必要な既存アイテム情報の伝達方法
- **Alternatives Considered**:
  1. `StorageItem[]` 全体を渡す
  2. `string[]` としてフォルダ名のみを渡す
- **Selected Approach**: `existingItems: StorageItem[]` として渡す
- **Rationale**:
  - validateNewFolderName が validateItemName を呼び出す際に StorageItem 形式が必要
  - 親コンポーネントでのフィルタリング処理が不要になる
  - 将来的にファイルとの重複チェックが必要になった場合も対応可能
- **Trade-offs**: コンポーネントが StorageItem 型に依存する

## Risks & Mitigations

- **Risk 1**: 既存テストへの影響 — **Mitigation**: props が optional でない場合、呼び出し元の修正が必要。テストでも適切なモック値を提供
- **Risk 2**: 空配列が渡された場合の挙動 — **Mitigation**: 空配列でも正常に動作することをテストで確認

## References

- [Mantine TextInput](https://mantine.dev/core/text-input/) — エラー表示パターンの確認
- [TanStack Query](https://tanstack.com/query/latest) — キャッシュされたデータの取得方法
