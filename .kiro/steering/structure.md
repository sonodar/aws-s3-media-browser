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
- `hooks/` - 再利用可能なカスタムフック
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
- **Hooks**: `use` プレフィックス（例: `useStorage`）
- **CSS**: コンポーネント名と同名（例: `Header.css`）

## Import Organization

```typescript
// 1. React/外部ライブラリ
import { useState, useEffect } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';

// 2. 内部モジュール（相対パス）
import { useStorage } from '../../hooks/useStorage';
import { isPreviewable } from '../../utils/fileTypes';

// 3. ローカルコンポーネント
import { Header } from './Header';
import './MediaBrowser.css';
```

**Path Pattern**: 相対パス（`../../`）を使用。パスエイリアス未設定。

## Code Organization Principles

- **Co-location**: テストとスタイルはコンポーネントと同一ディレクトリ
- **Single Export Point**: 機能フォルダは `index.tsx` で公開 API を制御
- **Hook Abstraction**: 状態管理・副作用ロジックはカスタムフックに分離
- **Type Co-location**: 型定義は使用箇所に近い場所に配置

---
_Document patterns, not file trees. New files following patterns shouldn't require updates_
