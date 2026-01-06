# Research & Design Decisions

## Summary

- **Feature**: multi-select-delete
- **Discovery Scope**: Extension（既存システムへの機能追加）
- **Key Findings**:
  - 既存の `useStorageOperations` フックは単一アイテム削除のみ対応、複数削除 API の拡張が必要
  - AWS Amplify Storage の `remove` API は単一パス削除のため、複数アイテムは `Promise.all` で並列処理
  - フォルダ削除: `list({ listAll: true })` でサブパス含む全オブジェクト取得可能、再帰処理不要

## Research Log

### AWS Amplify Storage 複数削除パターン

- **Context**: 複数ファイルの一括削除 API の有無を確認
- **Sources Consulted**:
  - AWS Amplify Storage ドキュメント
  - 既存コード `src/hooks/useStorageOperations.ts`
- **Findings**:
  - Amplify Storage v6 には `remove` 関数のみ（単一パス）
  - バッチ削除 API は存在しない
  - 複数削除は `Promise.all(items.map(item => remove({ path: item.key })))` パターンで実装
- **Implications**:
  - 並列削除で効率化
  - エラーハンドリングは `Promise.allSettled` で部分失敗対応が望ましい

### フォルダ削除（プレフィックス一括削除）

- **Context**: S3 のフォルダ（プレフィックス）削除の実装方法
- **Sources Consulted**:
  - AWS Amplify Storage 公式ドキュメント
  - 既存コード `list` 使用パターン
- **Findings**:
  - S3 には「フォルダ」概念はなく、プレフィックスでのグルーピング
  - `list` API はデフォルトでネストされたサブパスのオブジェクトも含む（"By default, it includes objects in nested subpaths"）
  - `list({ path: folderPath, options: { listAll: true } })` で**サブフォルダ内のファイルも含めて一度に全オブジェクト取得可能**
  - JavaScript には `removeMany` API はなく、`Promise.all` + `remove` パターンが公式推奨
- **Implications**:
  - **再帰処理は不要**
  - フォルダ削除 = `list` で全オブジェクト取得 → `Promise.all` で並列削除

### 選択状態管理パターン

- **Context**: React での複数選択 UI パターン
- **Sources Consulted**:
  - React ベストプラクティス
  - 既存プロジェクトパターン
- **Findings**:
  - `Set<string>` による選択キー管理が効率的
  - 選択モード状態は親コンポーネント（MediaBrowser）で管理
  - 選択状態の変更は `useCallback` でメモ化
- **Implications**:
  - 新規カスタムフック `useSelection` で選択状態をカプセル化
  - MediaBrowser から FileList へ props で選択状態を伝播

## Architecture Pattern Evaluation

| Option                         | Description                         | Strengths                  | Risks / Limitations      | Notes        |
| ------------------------------ | ----------------------------------- | -------------------------- | ------------------------ | ------------ |
| 選択状態を MediaBrowser で管理 | 親コンポーネントで Set<string> 管理 | シンプル、既存パターン踏襲 | コンポーネントサイズ増加 | 採用         |
| 専用 useSelection フック       | 選択ロジックを独立フック化          | 再利用性、テスト容易性     | ファイル増加             | 採用（推奨） |
| Context API                    | グローバル選択状態                  | 深いネスト対応             | 過剰設計                 | 不採用       |

## Design Decisions

### Decision: 選択状態管理に useSelection フックを採用

- **Context**: 複数選択の状態管理をどこで行うか
- **Alternatives Considered**:
  1. MediaBrowser 内で直接 useState 管理
  2. 専用 useSelection フック作成
  3. Context API でグローバル管理
- **Selected Approach**: 専用 useSelection フック作成
- **Rationale**:
  - 既存パターン（useIdentityId, useStoragePath 等）との一貫性
  - テスト容易性の向上
  - 将来の複数選択機能（移動、コピー等）への拡張性
- **Trade-offs**: ファイル増加 vs 保守性向上
- **Follow-up**: フックのユニットテスト追加

### Decision: 削除処理に Promise.allSettled を使用

- **Context**: 複数削除時のエラーハンドリング
- **Alternatives Considered**:
  1. Promise.all（1つでも失敗で全体失敗）
  2. Promise.allSettled（部分成功許容）
  3. 逐次処理（遅いが確実）
- **Selected Approach**: Promise.allSettled
- **Rationale**: 一部失敗でも成功分は反映、失敗分のみユーザーに通知
- **Trade-offs**: 複雑なエラーハンドリング vs ユーザー体験向上
- **Follow-up**: 失敗アイテムの表示 UI 設計

### Decision: 選択モード用ツールバーを Header に統合

- **Context**: 選択モード時のアクション UI 配置
- **Alternatives Considered**:
  1. Header に選択モードツールバー追加
  2. 別コンポーネント SelectionToolbar 作成
  3. フローティングアクションバー
- **Selected Approach**: Header に選択モードツールバー追加
- **Rationale**:
  - 既存 Header パターン活用
  - コンポーネント増加抑制
  - モバイル UI での自然な配置
- **Trade-offs**: Header の複雑化 vs コンポーネント数抑制
- **Follow-up**: Header props インターフェース拡張

## Risks & Mitigations

- **大量ファイル削除時のパフォーマンス**: 進捗表示 + 並列処理上限設定（将来対応）
- **フォルダ削除の誤操作**: 確認ダイアログでフォルダ内コンテンツ数表示
- **ネットワークエラー時の中途半端な状態**: allSettled で部分成功対応、リフレッシュ推奨

## References

- [AWS Amplify Storage - Remove files](https://docs.amplify.aws/gen2/build-a-backend/storage/remove-files/) — 単一ファイル削除 API
- [AWS Amplify Storage - List files](https://docs.amplify.aws/gen2/build-a-backend/storage/list-files/) — ファイルリスト取得 API
