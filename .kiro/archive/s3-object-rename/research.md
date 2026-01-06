# Research & Design Decisions

## Summary

- **Feature**: `s3-object-rename`
- **Discovery Scope**: Extension（既存システムへの機能追加）
- **Key Findings**:
  - Amplify Storage は `copy` API を提供しており、S3 オブジェクトのコピーが可能
  - S3 にはネイティブなリネーム操作がないため、copy + remove パターンで実装する
  - 既存の `useStorageOperations` フックに `renameItem` / `renameFolder` メソッドを追加する設計が最適
  - 既存の `CreateFolderDialog` パターンを踏襲した `RenameDialog` コンポーネントを作成

## Research Log

### Amplify Storage copy API

- **Context**: S3 オブジェクトのリネームには copy + remove が必要
- **Sources Consulted**:
  - [Amplify Docs - Copy Files](https://docs.amplify.aws/react/build-a-backend/storage/copy-files/)
  - Context7 MCP による公式ドキュメント検索
- **Findings**:
  - `copy` API は `source.path` と `destination.path` を指定して使用
  - 5GB までのオブジェクトをサポート
  - 特殊文字を含むパスは URI エンコードが必要
  - 成功時はコピー先のパスを返却
- **Implications**:
  - 既存の `aws-amplify/storage` からの import に `copy` を追加
  - リネーム = copy → remove の2ステップで実装

### 既存コードベース分析

- **Context**: 統合ポイントと既存パターンの特定
- **Sources Consulted**: プロジェクト内ソースコード
- **Findings**:
  - `useStorageOperations` フック: list, remove, uploadData, getUrl を使用中
  - `CreateFolderDialog`: バリデーション、ローディング状態、キーボード操作をサポート
  - `DeleteConfirmDialog`: 複数アイテム対応、フォルダ配下の一括削除
  - `StorageItem` 型: key, name, type, size, lastModified を持つ
  - `FileList`: 選択モード、チェックボックス対応済み
- **Implications**:
  - `useStorageOperations` に `renameItem`, `renameFolder` メソッドを追加
  - `CreateFolderDialog` のパターンを踏襲した `RenameDialog` を新規作成
  - 既存のダイアログスタイル（`CreateFolderDialog.css`）を再利用

### ディレクトリリネームの実装戦略

- **Context**: フォルダ配下の全オブジェクトのキー変更が必要
- **Sources Consulted**: 既存の `removeItems` 実装
- **Findings**:
  - `listFolderContents` で配下オブジェクトを取得するパターンが既存
  - `Promise.allSettled` で並列処理しエラーを個別に捕捉
  - 進捗表示には処理済み/総数のカウントが必要
- **Implications**:
  - 配下オブジェクトを list → 各オブジェクトを copy → 成功したものを remove
  - 部分失敗時はロールバック不要（コピー成功分は新パスに存在、元パスも残る）

## Architecture Pattern Evaluation

| Option    | Description                                  | Strengths        | Risks / Limitations                | Notes                              |
| --------- | -------------------------------------------- | ---------------- | ---------------------------------- | ---------------------------------- |
| Hook 拡張 | 既存 useStorageOperations に rename 機能追加 | 一貫性、低リスク | フックが肥大化する可能性           | 選択：既存パターンとの整合性を優先 |
| 別フック  | useRename 専用フック作成                     | 関心の分離       | 状態管理の重複、refresh 連携が複雑 | 不採用                             |

## Design Decisions

### Decision: Hook 拡張パターンの採用

- **Context**: リネーム機能をどこに実装するか
- **Alternatives Considered**:
  1. `useStorageOperations` を拡張
  2. `useRename` 専用フックを新規作成
- **Selected Approach**: `useStorageOperations` に `renameItem`, `renameFolder` メソッドを追加
- **Rationale**:
  - 既存の `fetchItems` (refresh) との連携が容易
  - 既存の `listFolderContents` を再利用可能
  - 状態管理（loading, error）の一元化
- **Trade-offs**: フックのコード量が増加するが、凝集度は維持される
- **Follow-up**: フックが大きくなりすぎた場合は将来的に分割を検討

### Decision: copy → remove の2ステップ実装

- **Context**: S3 にはネイティブなリネーム API がない
- **Alternatives Considered**:
  1. copy → remove（成功時のみ削除）
  2. move API（存在しない）
- **Selected Approach**: copy 成功後に remove を実行
- **Rationale**:
  - コピー失敗時は元ファイルを維持できる（安全）
  - 削除失敗時はユーザーに通知し手動対応を促す
- **Trade-offs**: 一時的に同一ファイルが2つ存在する状態が発生
- **Follow-up**: 削除失敗時のエラーメッセージを明確に

### Decision: サムネイルは Lambda に委任

- **Context**: リネーム時にサムネイルをどう扱うか
- **Alternatives Considered**:
  1. UI から直接サムネイルも copy する
  2. Lambda に任せる（S3 イベントトリガーで生成）
- **Selected Approach**: Lambda に委任
- **Rationale**:
  - UI にはサムネイルパスへの Write 権限がない
  - 既存の S3 イベントトリガー（オブジェクト作成時のサムネイル生成）をそのまま活用できる
  - 削除も既存のクリーンアップ処理で対応
- **Trade-offs**: リネーム直後は一時的にサムネイルが表示されない（Lambda 処理待ち）
- **Follow-up**: 既存の ThumbnailImage コンポーネントは error 時にフォールバックアイコンを表示するため UX 上問題なし

### Decision: RenameDialog コンポーネントの新規作成

- **Context**: リネーム用 UI の実装方法
- **Alternatives Considered**:
  1. CreateFolderDialog を汎用化
  2. RenameDialog を新規作成
- **Selected Approach**: `RenameDialog` を新規作成し、既存スタイルを再利用
- **Rationale**:
  - バリデーションルールが異なる（既存名のチェック、拡張子の扱い）
  - 初期値の設定が必要（現在の名前をデフォルト表示）
  - 関心の分離を維持
- **Trade-offs**: コンポーネント数が増加
- **Follow-up**: なし

### Decision: 2層重複チェック（UI + S3 API）

- **Context**: 重複チェックをどこで実行するか
- **Alternatives Considered**:
  1. UI の items 状態のみでチェック（即時フィードバック優先）
  2. S3 API のみでチェック（整合性優先）
  3. 両方でチェック（2層構成）
- **Selected Approach**: **両方でチェック**（2層構成）
- **Rationale**:
  - **UI 層**: UX 向上のための即時フィードバック（early return で無駄な API 呼び出しを削減）
  - **フック層**: データ整合性保証（UI の items 状態は古くなっている可能性があるため、S3 上の実際の状態を確認）
  - 両方の目的は異なり、相互に補完的
- **Trade-offs**:
  - UI 層のチェックは古い可能性があるが、ほとんどのケースで有効な early return を提供
  - フック層で最終確認するため、データ安全性は保証される
- **Follow-up**: なし

### Decision: フォルダリネーム時は事前に全重複チェック

- **Context**: フォルダリネーム時に配下オブジェクトが新プレフィックス配下の既存オブジェクトと重複する場合の対応
- **Alternatives Considered**:
  1. 重複オブジェクトをスキップして続行
  2. 重複オブジェクトを上書き
  3. 1件でも重複があればリネーム全体を中止
- **Selected Approach**: 1件でも重複があればリネーム全体を中止
- **Rationale**:
  - 部分的にリネームされた状態は混乱を招く
  - 上書きはデータ損失のリスク
  - ユーザーに重複ファイル一覧を提示し、対処を委ねる
- **Trade-offs**: ユーザーが手動で重複を解消する必要がある
- **Follow-up**: 重複解消のためのヘルプメッセージを検討

### Decision: フォルダリネーム重複チェックのアルゴリズム最適化

- **Context**: フォルダリネーム時の重複チェック処理のパフォーマンス
- **Alternatives Considered**:
  1. 各ソースオブジェクトごとに S3 API を呼び出してチェック（O(n) API calls）
  2. 先にリネーム先のパス一覧を取得し、Set で比較（O(n+m) time, 2 API calls）
- **Selected Approach**: 先にリネーム先のパス一覧を取得し、Set で比較
- **Rationale**:
  - API 呼び出し回数を最小化（2回のみ）
  - リネーム先が空の場合は重複チェックをスキップ可能（高速パス）
  - Set を使用した O(1) ルックアップで効率的な比較
- **Trade-offs**: リネーム先に大量のオブジェクトがある場合はメモリ使用量が増加
- **Follow-up**: なし

### Decision: フォルダリネームのファイル数制限（1000件）

- **Context**: 配下に大量のファイルがあるフォルダのリネーム
- **Alternatives Considered**:
  1. 制限なし（処理時間がかかっても実行）
  2. ソフトリミット（警告表示後に続行可能）
  3. ハードリミット（1000件超でエラー）
- **Selected Approach**: ハードリミット（1000件超でエラー）
- **Rationale**:
  - 処理時間・安定性の観点（1000件 × copy + remove は長時間処理）
  - 部分失敗時のリカバリが困難になる
  - S3 API のスロットリングリスク
- **Trade-offs**: 大量ファイルのフォルダはリネーム不可（手動対応が必要）
- **Follow-up**: 将来的にバックグラウンド処理やバッチ処理の検討

### Decision: 大文字小文字は区別する（case-sensitive）

- **Context**: リネーム時の名前比較ルール
- **Alternatives Considered**:
  1. case-sensitive（S3 準拠）
  2. case-insensitive（ユーザーフレンドリー）
- **Selected Approach**: case-sensitive
- **Rationale**:
  - S3 オブジェクトキーは case-sensitive
  - `Photo.jpg` と `photo.jpg` は S3 上で別オブジェクトとして存在可能
  - 既存動作との一貫性を維持
- **Trade-offs**: ユーザーが大文字小文字違いを認識しにくい可能性
- **Follow-up**: なし

### Decision: 拡張子変更は許可する

- **Context**: ファイルリネーム時の拡張子変更可否
- **Alternatives Considered**:
  1. 拡張子変更を禁止（安全優先）
  2. 拡張子変更時に警告を表示
  3. 拡張子変更を許可（制限なし）
- **Selected Approach**: 拡張子変更を許可
- **Rationale**:
  - S3 オブジェクトは Content-Type で MIME タイプを保持しており、拡張子は表示名としての意味のみ
  - ユーザーの意図を尊重
  - 警告を出すほどのリスクではない
- **Trade-offs**: 誤って拡張子を変更しても警告されない
- **Follow-up**: なし

### Decision: バリデーション関数を独立ユーティリティとして実装

- **Context**: バリデーションロジックの配置場所
- **Alternatives Considered**:
  1. RenameDialog 内にインライン実装（CreateFolderDialog と同様）
  2. 独立したユーティリティ関数として実装
- **Selected Approach**: 独立したユーティリティ関数（`validateRename`）として実装
- **Rationale**:
  - 単体テストが容易
  - 将来的に他のコンポーネントから再利用可能
  - CreateFolderDialog のインライン実装は重複チェックがないため単純だったが、リネームはロジックが複雑
- **Trade-offs**: ファイル数が増加
- **Follow-up**: CreateFolderDialog も将来的に同様のパターンに統一することを検討

## Risks & Mitigations

- **削除失敗時のデータ不整合**: コピー成功・削除失敗の場合、新旧両方のファイルが存在 → ユーザーに明確なエラーメッセージで通知
- **大量ファイルのディレクトリリネーム**: 配下に多数のファイルがある場合の処理時間 → **1000件超はエラーで拒否**、1000件以下は進捗表示で対応
- **同名ファイルの上書き**: 既存ファイル名と同じ名前への変更 → **2層バリデーション**（UI 層で即時フィードバック + フック層で S3 API チェック）で事前に検出・拒否

## References

- [Amplify Storage - Copy Files](https://docs.amplify.aws/react/build-a-backend/storage/copy-files/) — Amplify copy API 公式ドキュメント
- プロジェクト内 `src/hooks/useStorageOperations.ts` — 既存ストレージ操作パターン
- プロジェクト内 `src/components/MediaBrowser/CreateFolderDialog.tsx` — ダイアログ UI パターン
