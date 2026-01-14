# Implementation Plan

セッション開始時に必ず `.kiro/steering/dev-rules.md` を読み込んでから作業してください。

## Task Overview

本タスクリストは、`identityId` を認証済みコンテキスト内で常に `string` 型として提供するリファクタリングを実装する。Props drilling パターンにより、HybridAuthApp で identityId を取得し、下位コンポーネントに伝播する。

## Tasks

- [x] 1. useIdentityId フックに enabled オプションを追加
  - フックのオプション引数として `enabled` を受け取れるようにする
  - TanStack Query の `enabled` オプションに渡し、認証状態に応じたクエリ制御を可能にする
  - 既存のキャッシュ戦略（staleTime: Infinity, gcTime: Infinity, retry: false）を維持
  - _Requirements: 2.3_

- [x] 2. HybridAuthApp で identityId を取得し Props で伝播
- [x] 2.1 identityId 取得ロジックの実装
  - 認証状態（isPasskeyAuthenticated または authStatus === "authenticated"）を判定
  - useIdentityId を enabled オプション付きで呼び出し
  - 認証済みかつ identityId 取得完了後に AuthenticatedApp をレンダリング
  - _Requirements: 1.1, 1.4_

- [x] 2.2 ローディング状態とエラー状態の UI 実装
  - identityId 取得中はローディング UI を表示
  - 取得失敗時はエラーメッセージと再試行・サインアウトボタンを表示
  - _Requirements: 1.2, 1.3_

- [x] 2.3 AuthenticatedApp の Props 変更
  - identityId を Props として受け取るように変更
  - MediaBrowser に identityId を Props で渡す
  - _Requirements: 1.4_

- [ ] 3. ストレージフックの型変更
- [ ] 3.1 (P) useStorageItems の型変更と null ガード削除
  - パラメータ型を `identityId: string | null` から `identityId: string` に変更
  - `enabled: !!identityId` を削除（常に有効）
  - queryKey の `identityId ?? ""` フォールバックを削除
  - queryFn 内の `if (!identityId) return []` ガードを削除
  - _Requirements: 3.1_

- [ ] 3.2 (P) useStorageOperations の型変更と null ガード削除
  - Props 型の `identityId: string | null` を `identityId: string` に変更
  - 内部の `identityId ?? ""` ガードを削除
  - `!identityId` チェックを削除
  - _Requirements: 3.1_

- [ ] 4. UI コンポーネントの型変更
- [x] 4.1 MediaBrowser の型変更
  - Props に `identityId: string` を追加
  - `useIdentityId()` 呼び出しを削除
  - identityLoading, identityError の aggregation を削除
  - `if (!identityId) return null` ガードを削除
  - _Requirements: 3.2_

- [ ] 4.2 (P) FileActions の型変更
  - Props の `identityId: string | null` を `identityId: string` に変更
  - `if (!identityId) return null` ガードを削除
  - _Requirements: 3.2_

- [ ] 4.3 (P) MoveDialog の型変更
  - Props の `identityId: string | null` を `identityId: string` に変更
  - _Requirements: 3.2_

- [ ] 4.4 (P) FolderBrowser の型変更
  - Props の `identityId: string | null` を `identityId: string` に変更
  - `enabled ? identityId : null` のロジックを簡素化
  - _Requirements: 3.2_

- [x] 5. テストファイルの修正
  - 既存の MediaBrowser テストで identityId を Props として渡すように修正
  - TestProvider から identityId モック機能を削除（不要になった場合）
  - 新しい Props インターフェースに合わせてテストを更新
  - _Requirements: 3.4_

## Requirements Coverage

| Requirement | Tasks                             |
| ----------- | --------------------------------- |
| 1.1         | 2.1                               |
| 1.2         | 2.2                               |
| 1.3         | 2.2                               |
| 1.4         | 2.1, 2.3                          |
| 2.1         | N/A（Props 方式のため不要）       |
| 2.2         | N/A（Props 方式のため不要）       |
| 2.3         | 1                                 |
| 3.1         | 3.1, 3.2                          |
| 3.2         | 4.1, 4.2, 4.3, 4.4                |
| 3.3         | N/A（既に非 null のため変更不要） |
| 3.4         | 5                                 |

## Notes

- Task 3.1, 3.2 は並列実行可能（異なるファイル、依存関係なし）
- Task 4.2, 4.3, 4.4 は並列実行可能（異なるコンポーネント）
- Task 4.1 は Task 2 完了後に実行（Props drilling の受け取り側）
- 要件 3.3 のユーティリティ（storagePathUtils, queryKeys, mutations/types, invalidationUtils）は既に `identityId: string` を期待しているため変更不要
