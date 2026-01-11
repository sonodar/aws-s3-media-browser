# Research Document

## Discovery Findings

### Mantine UI コンポーネントマッピング

本調査では、既存のカスタム実装コンポーネントと Mantine UI コンポーネントの対応関係を整理した。

---

## Component Mapping

### Dialog/Modal 系

| 既存実装                  | Mantine コンポーネント | 備考                         |
| ------------------------- | ---------------------- | ---------------------------- |
| `div.dialog-overlay`      | `Modal`                | オーバーレイ内蔵             |
| `div.dialog-backdrop`     | `Modal` (内蔵)         | closeOnClickOutside プロップ |
| `div.dialog-content`      | `Modal` (内蔵)         | centered プロップで中央配置  |
| `role="dialog"`           | `Modal`                | 自動付与                     |
| `role="alertdialog"`      | `Modal`                | role プロップで指定可能      |
| `aria-labelledby`         | `Modal`                | title プロップで自動設定     |
| カスタム Escape 検知      | `closeOnEscape`        | Modal 標準機能               |
| カスタム外側クリック検知  | `closeOnClickOutside`  | Modal 標準機能               |
| フォーカストラップ (手動) | `Modal` (内蔵)         | 自動フォーカス管理           |
| `autoFocus` 属性          | `data-autofocus`       | Modal の initialFocus と連携 |

### フォーム入力系

| 既存実装                  | Mantine コンポーネント | 備考                               |
| ------------------------- | ---------------------- | ---------------------------------- |
| `<input type="text">`     | `TextInput`            | label, error, placeholder プロップ |
| `<select>`                | `NativeSelect`         | data プロップで options 定義       |
| `<input type="checkbox">` | `Checkbox`             | checked, onChange 対応             |
| `.error-message`          | `TextInput.error`      | インライン表示                     |

### ボタン系

| 既存実装                                        | Mantine コンポーネント      | 備考                       |
| ----------------------------------------------- | --------------------------- | -------------------------- |
| `<button className="submit-button">`            | `Button`                    | variant="filled" (default) |
| `<button className="cancel-button">`            | `Button variant="default"`  | アウトライン風             |
| `<button style={{backgroundColor: '#d32f2f'}}>` | `Button color="red"`        | danger 用途                |
| `<button className="icon-button">`              | `ActionIcon`                | アイコンのみのボタン       |
| `disabled` 状態                                 | `disabled` または `loading` | loading はスピナー付き     |

### レイアウト系

| 既存実装                                | Mantine コンポーネント                        | 備考                 |
| --------------------------------------- | --------------------------------------------- | -------------------- |
| `div.dialog-actions` (flex-end)         | `Group justify="flex-end"`                    | 水平配置             |
| form 内の縦並び                         | `Stack`                                       | 垂直配置             |
| `.file-list` (CSS Grid)                 | `SimpleGrid`                                  | レスポンシブ対応     |
| `grid-template-columns: repeat(3, 1fr)` | `cols={3}` または `cols={{ base: 2, sm: 3 }}` | ブレークポイント対応 |

### 状態表示系

| 既存実装                     | Mantine コンポーネント       | 備考             |
| ---------------------------- | ---------------------------- | ---------------- |
| `.progress-message` テキスト | `Progress` + `Text`          | バー + テキスト  |
| `.error-message`             | `Alert color="red"`          | インラインエラー |
| `.success-message`           | `Notification color="green"` | 成功通知         |
| ローディング状態             | `Skeleton`                   | プレースホルダー |

### 画像系

| 既存実装           | Mantine コンポーネント | 備考                        |
| ------------------ | ---------------------- | --------------------------- |
| `<img>`            | `Image`                | fit, loading プロップ       |
| ローディング中表示 | `Skeleton`             | height プロップ             |
| フォールバック表示 | カスタム実装維持       | fallbackSrc は URL のみ対応 |

---

## Mantine Hooks 対応

### useEffect 置換候補

| 既存 useEffect 用途 | Mantine Hook                   | 備考                   |
| ------------------- | ------------------------------ | ---------------------- |
| Escape キー検知     | Modal 内蔵 / `useHotkeys`      | Modal 使用時は不要     |
| 外側クリック検知    | Modal 内蔵 / `useClickOutside` | Modal 使用時は不要     |
| 初期フォーカス設定  | `data-autofocus`               | Modal が自動処理       |
| タイマー処理        | `useTimeout`                   | 宣言的なタイマー管理   |
| 長押し検知          | `useLongPress`                 | 既に使用中（FileList） |

### useTimeout の使用例

```tsx
import { useTimeout } from "@mantine/hooks";

const { start, clear } = useTimeout(() => {
  setDelayComplete(true);
}, delay);

// 手動開始
start();

// クリーンアップ時に自動 clear
```

---

## 既存 CSS ファイル分析

### CreateFolderDialog.css（共有スタイル）

```css
/* 複数ダイアログで共有 */
.dialog-overlay { ... }
.dialog-backdrop { ... }
.dialog-content { ... }
.dialog-actions { ... }
.cancel-button { ... }
.submit-button { ... }
.error-message { ... }
.progress-message { ... }
.success-message { ... }
```

**移行影響**: 全ダイアログを Modal に移行後、完全削除可能

### FileList.css

```css
.file-list {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
}
.file-list-item { ... }
.file-list-item--selected { ... }
.file-icon { ... }
.file-name { ... }
```

**移行影響**:

- グリッド定義 → SimpleGrid で置換
- 選択状態 → Mantine スタイルプロップで置換
- アイコン/名前スタイル → 部分的に維持 or Mantine Text/Center で置換

### SortSelector.css

```css
.sort-selector { ... }
.sort-selector-select { ... }
```

**移行影響**: NativeSelect 移行後、完全削除可能

### ThumbnailImage.css

```css
.thumbnail-container { ... }
.thumbnail-loading { ... }
.thumbnail-loaded { ... }
.thumbnail-fallback { ... }
```

**移行影響**: Image/Skeleton 移行後、完全削除可能

### Header.css

```css
.icon-button { ... }
.header-left { ... }
.header-right { ... }
```

**移行影響**:

- `.icon-button` → ActionIcon で置換、削除可能
- レイアウト CSS → 維持（Mantine 化は任意）

---

## Integration Points

### Mantine Theme との統合

現在のプロジェクトでは Mantine テーマのカスタマイズは最小限。
移行時は Mantine デフォルトテーマを使用し、必要に応じて後から調整。

### 既存 Mantine 使用箇所

| コンポーネント | 使用 Mantine     | 備考           |
| -------------- | ---------------- | -------------- |
| Header.tsx     | `Menu`, `Burger` | 既存実装済み   |
| FileList.tsx   | `useLongPress`   | hooks 使用済み |

---

## 技術的考慮事項

### IME 対応

RenameDialog の `handleKeyDown` は IME 変換中の Enter 確定を防ぐロジックを含む。
Modal の Escape 処理は IME と競合しないため、併用可能。

```tsx
const handleKeyDown = (e: React.KeyboardEvent) => {
  if (e.nativeEvent.isComposing) return; // IME 変換中は無視
  // ...
};
```

### key プロップによる状態リセット

RenameDialog, MoveDialog は親コンポーネントで `key` を変更することで状態をリセット。
Modal 移行後もこのパターンは維持。

```tsx
// MediaBrowser.tsx
<RenameDialog
  key={`rename-${renameDialogKey}`}
  // ...
/>
```

### Amplify UI との共存

PasskeySettingsModal は Amplify UI を使用しており、今回の移行対象外。
Mantine と Amplify UI のスタイル競合は現状発生していない。

---

## Alternatives Considered

### @mantine/notifications vs Notification コンポーネント

| 方式                          | メリット                | デメリット   |
| ----------------------------- | ----------------------- | ------------ |
| `@mantine/notifications`      | autoClose, スタック管理 | 追加依存関係 |
| `Notification` コンポーネント | 依存関係なし            | 手動管理必要 |

**決定**: Notification コンポーネントを使用。autoClose は不要（MoveDialog の成功表示は setTimeout で対応）。

### Image fallbackSrc vs カスタムフォールバック

| 方式             | メリット         | デメリット   |
| ---------------- | ---------------- | ------------ |
| `fallbackSrc`    | シンプル         | URL のみ対応 |
| カスタム状態管理 | アイコン表示可能 | 複雑         |

**決定**: カスタム状態管理を維持。lucide-react アイコンでのフォールバック表示を継続。

---

## References

- [Mantine Modal](https://mantine.dev/core/modal/)
- [Mantine TextInput](https://mantine.dev/core/text-input/)
- [Mantine Button](https://mantine.dev/core/button/)
- [Mantine ActionIcon](https://mantine.dev/core/action-icon/)
- [Mantine SimpleGrid](https://mantine.dev/core/simple-grid/)
- [Mantine Progress](https://mantine.dev/core/progress/)
- [Mantine Alert](https://mantine.dev/core/alert/)
- [Mantine Notification](https://mantine.dev/core/notification/)
- [Mantine Image](https://mantine.dev/core/image/)
- [Mantine Hooks](https://mantine.dev/hooks/getting-started/)
