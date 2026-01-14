# Requirements Document

## Introduction

本仕様は、`useIdentityId` フックが `null` を返す設計を見直し、認証ガードを App レベルで行うことで、各コンポーネントでの `null` チェックを不要にするリファクタリングを定義する。

現在の設計では、認証されていない場合に `useIdentityId` が `null` を返し、この `null` 値が各コンポーネントに伝播するため、すべての箇所で `null` チェックが必要になっている。しかし、認証されていない状態ではアプリケーション自体が使用できないため、`identityId` が `null` という状態が存在しない設計が本来正しい。

本リファクタリングにより、認証済みコンテキスト内では `identityId` が常に `string` 型であることが型レベルで保証され、コードの簡素化と型安全性の向上を実現する。

## Requirements

### Requirement 1: 認証済みコンテキストの分離

**Objective:** 開発者として、認証済みのコンポーネント内では `identityId` が必ず存在することを型レベルで保証したい。これにより null チェックのボイラープレートを排除し、コードを簡素化できる。

#### Acceptance Criteria

1. When ユーザーが認証に成功した場合, the App shall `identityId` を取得してから認証済みコンポーネントをレンダリングする
2. While `identityId` の取得中, the App shall ローディング状態を表示する
3. If `identityId` の取得に失敗した場合, the App shall エラーメッセージを表示し、再試行またはサインアウトのオプションを提供する
4. The 認証済みコンテキスト shall `identityId` を `string` 型（非 null）として提供する

### Requirement 2: useIdentityId の戻り値型の変更

**Objective:** 開発者として、認証済みコンテキスト内で使用する `useIdentityId` フックが常に `string` 型を返すことを期待する。これにより、型ガードや null チェックが不要になる。

#### Acceptance Criteria

1. When 認証済みコンテキスト内で `useIdentityId` を呼び出した場合, the フック shall `string` 型の `identityId` を返す（`null` ではない）
2. If 認証済みコンテキスト外で `useIdentityId` を呼び出した場合, the フック shall エラーをスローする
3. The `useIdentityId` shall 既存の TanStack Query キャッシュ戦略を維持する（staleTime: Infinity, gcTime: Infinity）

### Requirement 3: identityId を受け取るすべての箇所の型変更

**Objective:** 開発者として、`identityId` を受け取るすべてのフック・コンポーネント・ユーティリティの型を `string | null` から `string` に変更し、null チェックを除去したい。

#### Acceptance Criteria

1. The ストレージ関連フック shall `identityId` パラメータを `string` 型（非 null）として受け取る
   - useStorageItems
   - useStorageOperations
   - 各 mutation フック（useUploadMutation, useDeleteMutation, useMoveMutation, useRenameMutation, useCreateFolderMutation）
2. The コンポーネント shall `identityId` を `string` 型として受け取る
   - MediaBrowser
   - FileActions
   - MoveDialog
   - FolderBrowser
3. The ユーティリティ関数・型定義 shall `identityId` を `string` 型として扱う
   - storagePathUtils
   - queryKeys
   - mutations/types
   - mutations/invalidationUtils
4. The 関連するテストファイル shall 更新された型定義に合わせて修正される
