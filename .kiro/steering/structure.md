# Project Structure

## Organization Philosophy

**Feature-first + Layer分離**: 機能単位でコンポーネントをグループ化し、共有ロジックは hooks/utils に分離。
バックエンドは Amplify のリソース定義パターンに従う。

## Directory Patterns

### Frontend Source (`/src/`)

**Location**: `/src/`
**Purpose**: React アプリケーションのソースコード
**Structure**:

- `components/[Feature]/` - 機能単位のコンポーネント群
- `hooks/[domain]/` - ドメイン別カスタムフック（identity, passkey, path, storage, ui）
- `stores/` - 状態管理（Jotai アトム、TanStack Query クライアント）
- `types/` - 共有型定義
- `utils/` - ユーティリティ関数
- `test/` - テスト設定・ヘルパー

### Feature Components (`/src/components/[Feature]/`)

**Location**: `/src/components/MediaBrowser/`
**Purpose**: 機能を構成するコンポーネント群を同一ディレクトリに配置
**Pattern**:

- `index.tsx` - メインコンポーネント（エクスポートハブ）
- `[Component].tsx` - サブコンポーネント
- `[Component].css` - コンポーネント固有スタイル
- `[Component].test.tsx` - テスト（同一ディレクトリ）

### Hooks Organization (`/src/hooks/[domain]/`)

**Location**: `/src/hooks/`
**Purpose**: ドメイン別に整理されたカスタムフック
**Pattern**:

- `identity/` - 認証セッション・Identity ID 管理（TanStack Query）
- `passkey/` - WebAuthn パスキー操作（登録、削除、認証情報取得）
- `path/` - ストレージパス・URL 同期管理（Jotai atoms）
- `storage/` - S3 ストレージ操作（TanStack Query: アイテム取得、プレビューURL、フォルダ一覧）
- `ui/` - UI 状態管理（選択、ソート、ダイアログ、スワイプジェスチャー）
- `types.ts` - フック共通型定義（QueryReturn等）

### State Management (`/src/stores/`)

**Location**: `/src/stores/`
**Purpose**: 状態管理の中央集約
**Pattern**:

- `atoms/[domain].ts` - ドメイン単位の Jotai アトム定義（path, selection, sort, deleteConfirm）
- `atoms/index.ts` - アトムのエクスポートハブ
- `queryClient.ts` - TanStack Query クライアント設定
- `queryKeys.ts` - クエリキー定義（型安全・一元管理）
- `JotaiProvider.tsx` - Jotai プロバイダー（開発時のみ AtomsDevtools）
- `QueryProvider.tsx` - TanStack Query プロバイダー（開発時のみ ReactQueryDevtools）
- `AtomsDevtools.tsx` - Redux DevTools 連携ラッパー
- `TestProvider.tsx` - テスト用プロバイダー
- `index.ts` - stores モジュールのエクスポート

### Amplify Backend (`/amplify/`)

**Location**: `/amplify/`
**Purpose**: AWS Amplify Gen2 バックエンド定義
**Pattern**:

- `backend.ts` - バックエンドエントリポイント
- `auth/resource.ts` - 認証リソース定義
- `storage/resource.ts` - ストレージリソース定義

## Naming Conventions

- **Files**: PascalCase（コンポーネント）、camelCase（hooks/utils）
- **Components**: PascalCase（例: `MediaBrowser`, `FileList`）
- **Hooks**: `use` プレフィックス + 単一責任
  - TanStack Query hooks: `useIdentityId`, `useStorageItems`, `useFolderList`, `usePreviewUrls`, `usePasskey`, `usePasskeyCredentials`, `useRegisterPasskey`, `useDeletePasskey`
  - Jotai hooks: `useStoragePath`, `useSelection`, `useSortOrder`, `useMoveDialog`, `useDeleteConfirm`
  - UI hooks: `useSwipeNavigation`, `useUploadTracker`, `useWebAuthnSupport`
  - Operation hooks: `useStorageOperations`（複合操作のファサード）
- **Atoms**: ドメイン名（例: `path`, `selection`, `sort`）+ アトム/アクション（`pathAtom`, `currentPathAtom`, `selectionAtom`, `toggleSelectionAtom`）
- **Utils**: 純粋関数ユーティリティ（例: `fileTypes`, `pathUtils`, `validateRename`, `generateUniqueFilename`, `sortStorageItems`, `parseStorageItems`）
- **CSS**: コンポーネント名と同名（例: `Header.css`）

## Import Organization

```typescript
// 1. React/外部ライブラリ
import { useState, useEffect } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import { useQuery } from "@tanstack/react-query";

// 2. 内部モジュール（相対パス）
import { useStorageOperations } from "../../hooks/storage";
import { useStoragePath } from "../../hooks/path";
import { isPreviewable } from "../../utils/fileTypes";

// 3. ローカルコンポーネント
import { Header } from "./Header";
import "./MediaBrowser.css";
```

**Path Pattern**: 相対パス（`../../`）を使用。パスエイリアス未設定。

## Code Organization Principles

- **Co-location**: テストとスタイルはコンポーネントと同一ディレクトリ
- **Single Export Point**: 機能フォルダは `index.tsx` で公開 API を制御
- **Single Responsibility Hooks**: 各フックは単一の責務を持つ（認証、パス管理、操作など）
- **Domain-Driven Hook Organization**: フックはドメイン別サブディレクトリに整理（identity, passkey, path, storage, ui）
- **Two-Tier State Management**: サーバー状態（TanStack Query）/ クライアント状態（Jotai）の明確な分離
- **Atomic State Management**: 共有状態は Jotai アトムで管理、ドメイン単位でファイル分割
- **Type Co-location**: 型定義は使用箇所に近い場所、共有型は `types/` に配置
- **Pure Function Extraction**: テスト可能な純粋関数は hooks/ 内にユーティリティとして配置可

---

_Document patterns, not file trees. New files following patterns shouldn't require updates_
