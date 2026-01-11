# Technical Design Document

## Overview

本設計は、AWS S3 Photo Browser の UI コンポーネントを Mantine UI ライブラリに移行するための技術仕様を定義する。カスタム CSS で実装された既存コンポーネント（モーダル、ダイアログ、ボタン、フォーム、グリッドレイアウト等）を Mantine UI コンポーネントに置き換え、アクセシビリティと保守性を向上させる。

### Feature Type

**Extension** - 既存システムの UI コンポーネントを置き換える修正拡張。

### Implementation Strategy

- **段階的移行**: リスク最小化のため、見た目のみの変更 → シンプルな置き換え → hooks 対応 → 新規機能 → 複雑なコンポーネントの順で実装
- **既存テスト維持**: 各フェーズでテストがパスすることを確認
- **Amplify UI 非対応**: PasskeySettingsModal は移行対象外（リスク回避）

---

## Component Designs

### Component 1: Modal/Dialog コンポーネント群

#### 1.1 共通 Modal パターン

**目的**: CreateFolderDialog, DeleteConfirmDialog, RenameDialog, MoveDialog のカスタムダイアログを Mantine Modal に統一

**現在の実装**:

```tsx
// 共通パターン（CreateFolderDialog.css を共有）
<div className="dialog-overlay">
  <div className="dialog-backdrop" onClick={handleClose} />
  <div className="dialog-content" role="dialog" aria-labelledby="dialog-title">
    ...
  </div>
</div>
```

**移行後の実装**:

```tsx
import { Modal, Stack, Group, TextInput, Button, Text, Alert, Progress } from "@mantine/core";

<Modal
  opened={isOpen}
  onClose={handleClose}
  title="新しいフォルダを作成"
  centered
  closeOnClickOutside={!isProcessing}
  closeOnEscape={!isProcessing}
  withCloseButton={!isProcessing}
>
  <Stack gap="md">
    <TextInput
      label="フォルダ名"
      placeholder="フォルダ名を入力"
      value={folderName}
      onChange={(e) => setFolderName(e.target.value)}
      disabled={isProcessing}
      error={error}
      data-autofocus
    />
    <Group justify="flex-end" gap="sm">
      <Button variant="default" onClick={handleClose} disabled={isProcessing}>
        キャンセル
      </Button>
      <Button type="submit" loading={isProcessing} disabled={!folderName.trim()}>
        作成
      </Button>
    </Group>
  </Stack>
</Modal>;
```

**Mantine コンポーネント対応**:

| 既存要素                             | Mantine コンポーネント | 備考                        |
| ------------------------------------ | ---------------------- | --------------------------- |
| `dialog-overlay` + `dialog-backdrop` | `Modal` (内蔵)         | オーバーレイ自動管理        |
| `dialog-content`                     | `Modal.Body` (内蔵)    | centered プロップで中央配置 |
| カスタム Escape 検知                 | `closeOnEscape`        | Modal の標準機能            |
| カスタム外側クリック                 | `closeOnClickOutside`  | Modal の標準機能            |
| フォーカストラップ（手動）           | Modal 内蔵             | 自動フォーカス管理          |
| `autoFocus` 属性                     | `data-autofocus`       | Modal の initialFocus 連携  |

#### 1.2 CreateFolderDialog

**ファイル**: `src/components/MediaBrowser/CreateFolderDialog.tsx`

**変更内容**:

- `<div className="dialog-overlay">` → `<Modal>`
- `<input type="text">` → `<TextInput>`
- `<button className="cancel-button">` → `<Button variant="default">`
- `<button className="submit-button">` → `<Button>`
- `<p className="error-message">` → TextInput の `error` プロップ
- `dialog-actions` div → `<Group justify="flex-end">`
- form 内レイアウト → `<Stack>`

**削除対象**:

- `CreateFolderDialog.css` のインポート（共有スタイルは他コンポーネント移行後に削除）

#### 1.3 DeleteConfirmDialog

**ファイル**: `src/components/MediaBrowser/DeleteConfirmDialog.tsx`

**変更内容**:

- `role="alertdialog"` は維持（Modal でも role 指定可能）
- `useEffect` によるフォーカス設定 → 削除（Modal の `data-autofocus` で代替）
- `handleKeyDown` の Escape 検知 → 削除（Modal が処理）
- 削除ボタン → `<Button color="red">`

**特殊対応**:

```tsx
<Modal
  opened={items.length > 0}
  onClose={onClose}
  title="削除の確認"
  centered
  closeOnClickOutside={!isDeleting}
  closeOnEscape={!isDeleting}
>
  <Stack gap="md">
    <Text>{getMessage()}</Text>
    {hasFolder && (
      <Text fw={700} c="dimmed">
        フォルダ内のすべてのファイルも削除されます。
      </Text>
    )}
    <Group justify="flex-end" gap="sm">
      <Button variant="default" onClick={onClose} disabled={isDeleting} data-autofocus>
        キャンセル
      </Button>
      <Button color="red" onClick={handleDelete} loading={isDeleting}>
        削除
      </Button>
    </Group>
  </Stack>
</Modal>
```

#### 1.4 RenameDialog

**ファイル**: `src/components/MediaBrowser/RenameDialog.tsx`

**変更内容**:

- 既存の `key` ベース状態リセットパターンは維持
- IME 対応の `handleKeyDown` は維持（Modal の Escape 処理と共存）
- Progress 表示 → Mantine `<Progress>` コンポーネント
- エラー詳細表示 → Mantine `<Alert>`

**進捗表示**:

```tsx
{
  progress && (
    <Stack gap="xs">
      <Progress value={(progress.current / progress.total) * 100} />
      <Text size="sm" c="dimmed">
        {progress.current} / {progress.total} 件処理中...
      </Text>
    </Stack>
  );
}
```

#### 1.5 MoveDialog

**ファイル**: `src/components/MediaBrowser/MoveDialog.tsx`

**変更内容**:

- `dialog-content-large` → Modal の `size="lg"`
- FolderBrowser コンポーネントはそのまま維持
- 成功メッセージ → Mantine `<Alert color="green">`
- エラーメッセージ → Mantine `<Alert color="red">`
- 進捗表示 → Mantine `<Progress>`

**成功時の自動クローズ**:

```tsx
// 既存の setTimeout は useTimeout フックに置き換え可能だが、
// シンプルな用途のため既存実装を維持
setTimeout(() => {
  onClose();
}, 1500);
```

---

### Component 2: Header ボタン群

**ファイル**: `src/components/MediaBrowser/Header.tsx`

**現状**: Menu/Burger は既に Mantine。カスタム CSS のアイコンボタンを移行。

**変更内容**:

- `<button className="icon-button">` → `<ActionIcon>`
- 削除ボタン → `<ActionIcon color="red">`

**移行後の実装**:

```tsx
import { ActionIcon, Group } from "@mantine/core";

// 選択モード時のヘッダー
<Group gap="xs">
  <ActionIcon variant="subtle" onClick={onExitSelectionMode} aria-label="キャンセル">
    <X size={20} />
  </ActionIcon>
  <ActionIcon variant="subtle" onClick={onToggleSelectAll} aria-label={getSelectAllLabel()}>
    {getSelectAllIcon()}
  </ActionIcon>
  <ActionIcon variant="subtle" onClick={onMoveSelected} disabled={selectedCount === 0} aria-label="移動">
    <FolderInput size={20} />
  </ActionIcon>
  <ActionIcon variant="subtle" color="red" onClick={onDeleteSelected} disabled={selectedCount === 0} aria-label="削除">
    <Trash2 size={20} />
  </ActionIcon>
</Group>

// 通常モード
<ActionIcon variant="subtle" onClick={onBack} aria-label="戻る">
  <ArrowLeft size={20} />
</ActionIcon>
```

**Header.css への影響**:

- `.icon-button` スタイルは削除可能
- レイアウト用 CSS（`.header-left`, `.header-right` 等）は維持

---

### Component 3: FileList グリッドレイアウト

**ファイル**: `src/components/MediaBrowser/FileList.tsx`

**現状**:

```css
.file-list {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
```

**変更内容**:

- `<ul className="file-list">` → `<SimpleGrid cols={3}>`
- `<li className="file-list-item">` → `<Paper>` or `<UnstyledButton>`
- `<input type="checkbox">` → `<Checkbox>`

**移行後の実装**:

```tsx
import { SimpleGrid, Paper, Checkbox, Center, Text, UnstyledButton } from "@mantine/core";

<SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="md">
  {items.map((item) => (
    <FileListItem key={item.key} ... />
  ))}
</SimpleGrid>

// 空状態
{items.length === 0 && (
  <Center py="xl">
    <Text c="dimmed">ファイルがありません</Text>
  </Center>
)}
```

**FileListItem 内部**:

```tsx
<UnstyledButton
  component="div"
  onClick={handleClick}
  style={(theme) => ({
    backgroundColor: isSelected ? theme.colors.blue[1] : theme.colors.gray[0],
    border: isSelected ? `2px solid ${theme.colors.blue[6]}` : "none",
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    position: "relative",
  })}
  {...eventHandlers}
>
  {isSelectionMode && (
    <Checkbox
      checked={isSelected}
      onChange={() => {}}
      onClick={(e) => onCheckboxClick(e, item.key)}
      aria-label={`${item.name} を選択`}
      pos="absolute"
      top={8}
      left={8}
    />
  )}
  ...
</UnstyledButton>
```

**FileList.css への影響**:

- グリッドレイアウト CSS は削除
- `.file-list-item--selected` は Mantine スタイルに置換
- `.file-icon`, `.file-name` の基本スタイルは維持（または Mantine で再実装）

---

### Component 4: SortSelector

**ファイル**: `src/components/MediaBrowser/SortSelector.tsx`

**変更内容**:

- `<select>` → `<NativeSelect>`
- `SortSelector.css` を削除

**移行後の実装**:

```tsx
import { NativeSelect } from "@mantine/core";

const data = SORT_OPTIONS.map((order) => ({
  value: order,
  label: SORT_ORDER_LABELS[order],
}));

<NativeSelect
  value={currentOrder}
  onChange={(e) => onChange(e.target.value as SortOrder)}
  data={data}
  aria-label="並び順"
  size="sm"
/>;
```

---

### Component 5: ThumbnailImage（最後に実装）

**ファイル**: `src/components/MediaBrowser/ThumbnailImage.tsx`

**現状の useEffect**:

1. `initialDelay` タイマー管理
2. サムネイル URL フェッチ

**変更方針**:

- Mantine `<Image>` コンポーネントへの移行は複雑なため、最後に実施
- `useTimeout` フックで遅延処理を宣言的に記述可能か検討
- ローディング状態 → Mantine `<Skeleton>`

**移行後の実装案**:

```tsx
import { Image, Skeleton, Center } from "@mantine/core";
import { useTimeout } from "@mantine/hooks";

// 遅延処理
const { start: startDelay } = useTimeout(() => {
  setDelayComplete(true);
  setState("loading");
}, initialDelay ?? 0);

useEffect(() => {
  if (initialDelay) {
    startDelay();
  }
}, [initialDelay, startDelay]);

// 表示
{
  state === "loading" && <Skeleton height="100%" />;
}
{
  state === "loaded" && (
    <Image
      src={url}
      alt={fileName}
      fit="cover"
      loading="lazy"
      onLoad={handleLoad}
      onError={handleError}
    />
  );
}
{
  state === "error" && (
    <Center h="100%">
      <FallbackIcon fileType={fileType} />
    </Center>
  );
}
```

**注意**: Mantine Image の `fallbackSrc` は URL が必要なため、アイコンフォールバックには適さない。カスタム状態管理を維持。

---

### ~~Component 6: Progress 表示（新規追加）~~ (スコープアウト)

**対象**: RenameDialog, MoveDialog

**実装**:

```tsx
import { Progress, Text, Stack } from "@mantine/core";

{
  progress && (
    <Stack gap="xs">
      <Progress value={(progress.current / progress.total) * 100} animated />
      <Text size="sm" c="dimmed" ta="center">
        {progress.current} / {progress.total} 件処理中...
      </Text>
    </Stack>
  );
}
```

---

### Component 7: Alert/Notification

**インラインエラー（Alert）**:

```tsx
import { Alert } from "@mantine/core";
import { AlertCircle } from "lucide-react";

{
  error && (
    <Alert color="red" icon={<AlertCircle size={16} />}>
      {error}
    </Alert>
  );
}
```

**成功通知（Notification）**:

```tsx
import { Notification } from "@mantine/core";
import { CheckCircle } from "lucide-react";

{
  successMessage && (
    <Notification
      color="green"
      icon={<CheckCircle size={16} />}
      onClose={() => setSuccessMessage(null)}
      withCloseButton
    >
      {successMessage}
    </Notification>
  );
}
```

**注意**: `@mantine/notifications` パッケージなしでは `autoClose` 機能は使用不可。手動クローズまたは setTimeout で対応。

---

## Implementation Phases

### Phase 1: レイアウトコンポーネント導入（見た目のみ）

**対象**:

- Stack, Group の導入（ダイアログ内レイアウト）
- SimpleGrid の導入（FileList）

**変更ファイル**:

- `CreateFolderDialog.tsx`: form 内を Stack/Group でラップ
- `DeleteConfirmDialog.tsx`: 同上
- `RenameDialog.tsx`: 同上
- `MoveDialog.tsx`: 同上
- `FileList.tsx`: ul → SimpleGrid

**テスト確認**: 既存テストがパスすることを確認

### Phase 2: シンプルなコンポーネント置き換え

**対象**:

- Button, ActionIcon
- TextInput
- NativeSelect
- Checkbox

**変更ファイル**:

- 全ダイアログ: button → Button
- Header.tsx: button.icon-button → ActionIcon
- CreateFolderDialog/RenameDialog: input → TextInput
- SortSelector.tsx: select → NativeSelect
- FileList.tsx: input[type=checkbox] → Checkbox

**CSS 削除**:

- `SortSelector.css`

### Phase 3: Modal 移行と hooks 対応

**対象**:

- Modal コンポーネントへの移行
- useEffect の削除（フォーカス、Escape キー、外側クリック）

**変更ファイル**:

- 全ダイアログ: dialog-overlay → Modal
- DeleteConfirmDialog.tsx: useEffect（フォーカス）削除
- 全ダイアログ: handleKeyDown（Escape）削除 or 簡略化

**CSS 削除**:

- `CreateFolderDialog.css`（全ダイアログ移行完了後）

### Phase 4: 新規要素の追加

**対象**:

- Progress コンポーネント
- Alert コンポーネント
- Notification コンポーネント

**変更ファイル**:

- RenameDialog.tsx: Progress, Alert 追加
- MoveDialog.tsx: Progress, Alert, Notification 追加

### Phase 5: ThumbnailImage の移行（最後）

**対象**:

- Mantine Image への移行
- useTimeout フックの検討
- Skeleton ローディング状態

**変更ファイル**:

- ThumbnailImage.tsx: 全面的なリファクタリング

**CSS 削除**:

- `ThumbnailImage.css`

---

## File Changes Summary

### 変更ファイル

| ファイル                  | Phase | 変更内容                                                          |
| ------------------------- | ----- | ----------------------------------------------------------------- |
| `CreateFolderDialog.tsx`  | 1-3   | レイアウト → コンポーネント → Modal                               |
| `DeleteConfirmDialog.tsx` | 1-3   | レイアウト → コンポーネント → Modal                               |
| `RenameDialog.tsx`        | 1-4   | レイアウト → コンポーネント → Modal → Progress/Alert              |
| `MoveDialog.tsx`          | 1-4   | レイアウト → コンポーネント → Modal → Progress/Alert/Notification |
| `Header.tsx`              | 2     | icon-button → ActionIcon                                          |
| `FileList.tsx`            | 1-2   | grid → SimpleGrid, checkbox → Checkbox                            |
| `SortSelector.tsx`        | 2     | select → NativeSelect                                             |
| `ThumbnailImage.tsx`      | 5     | img → Image, Skeleton 追加                                        |

### 削除ファイル

| ファイル                 | Phase | 備考                     |
| ------------------------ | ----- | ------------------------ |
| `SortSelector.css`       | 2     | 完全削除                 |
| `CreateFolderDialog.css` | 3     | 全ダイアログ移行後に削除 |
| `ThumbnailImage.css`     | 5     | 移行完了後に削除         |

### 維持ファイル（部分的変更）

| ファイル       | 変更内容                                           |
| -------------- | -------------------------------------------------- |
| `Header.css`   | `.icon-button` 削除、レイアウト CSS 維持           |
| `FileList.css` | グリッド/選択状態 CSS 削除、アイコン/名前 CSS 検討 |

---

## Dependencies

### 既存依存関係（維持）

```json
{
  "@mantine/core": "^8.0.0",
  "@mantine/hooks": "^8.0.0"
}
```

### 新規依存関係

なし（@mantine/notifications は使用しない）

---

## Testing Strategy

### 単体テスト

- 各コンポーネントの既存テストを Phase ごとに実行
- Modal 移行後は `@testing-library/react` での opened/closed 状態テスト

### 統合テスト

- フォルダ作成 → 削除 → リネーム → 移動のフロー確認
- キーボードナビゲーション（Escape、Tab フォーカス）

### アクセシビリティテスト

- `aria-labelledby` の維持確認
- フォーカストラップの動作確認
- スクリーンリーダーでのダイアログ認識

---

## Risks and Mitigations

| リスク                  | 軽減策                                     |
| ----------------------- | ------------------------------------------ |
| 既存テストの破損        | Phase ごとにテスト実行、破損時は即座に対応 |
| スタイル崩れ            | 段階的移行で視覚的確認を容易に             |
| IME 対応の問題          | RenameDialog の handleKeyDown は維持       |
| モバイル操作の問題      | タッチイベントの動作確認必須               |
| ThumbnailImage の複雑さ | 最後に実施、既存ロジック維持も選択肢       |
