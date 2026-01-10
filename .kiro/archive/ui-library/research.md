# Research Log: Mantine UI ライブラリ導入

## 調査日時

2026-01-10（更新）

## 調査目的

1. **最優先**: useLongPress フックの Mantine 移行による長押し操作バグ修正
2. ContextMenu と DropdownMenu の Mantine Menu コンポーネントへの移行

---

## 1. 既存コンポーネント分析

### useLongPress.ts（カスタムフック）【最優先移行対象】

| 項目     | 内容                                        |
| -------- | ------------------------------------------- |
| 場所     | `src/hooks/useLongPress.ts`                 |
| 行数     | 108 行                                      |
| 使用箇所 | FileList.tsx の FileListItem コンポーネント |

**現在の実装パターン:**

- `useRef` でタイマー、開始位置、キャンセル状態を管理
- PointerEvent ベースのイベントハンドラ（onPointerDown, onPointerUp, onPointerMove, onPointerLeave）
- delay（デフォルト 400ms）と moveThreshold（デフォルト 10px）をサポート
- 触覚フィードバック（navigator.vibrate）

**既知のバグ:**

1. **長押し後の誤ナビゲーション**: 長押し完了後に onClick が発火し、フォルダ内に入ってしまう
2. **削除ボタン動作不良**: コンテキストメニューの削除ボタンが反応しない
3. **iOS ネイティブメニュー**: iOS で長押し時に OS のコンテキストメニューが表示される

**問題の根本原因:**

- 長押し完了後のイベント伝播制御が不完全
- `onClick` と `onPointerUp` の競合
- iOS の `-webkit-touch-callout` や `user-select` の制御が未実装

### FileList.tsx / FileListItem

| 項目              | 内容                                       |
| ----------------- | ------------------------------------------ |
| 場所              | `src/components/MediaBrowser/FileList.tsx` |
| useLongPress 使用 | FileListItem 内で使用                      |

**現在の実装:**

- `useLongPress` フックから handlers を取得
- `onClick` で通常ナビゲーション
- 長押し時に `onShowActionMenu` コールバック

### ContextMenu.tsx

| 項目      | 内容                                          |
| --------- | --------------------------------------------- |
| 場所      | `src/components/MediaBrowser/ContextMenu.tsx` |
| 行数      | 161 行                                        |
| useEffect | 2 箇所（外部クリック検出、Escape キー処理）   |

**現在の実装パターン:**

- `useRef<HTMLDivElement>` でメニュー DOM 参照
- ボタン押下処理は標準の onClick で実装
- `useState` なし（親コンポーネントで状態管理）
- Props: `isOpen`, `item`, `position`, `onClose`, `onRename`, `onMove`, `onDelete`

**独自ロジック:**

1. 外部クリック検出 (`mousedown` イベント)
2. Escape キー処理 (`keydown` イベント)
3. 画面端でのオーバーフロー調整 (`adjustedPosition`)

### DropdownMenu.tsx

| 項目      | 内容                                           |
| --------- | ---------------------------------------------- |
| 場所      | `src/components/MediaBrowser/DropdownMenu.tsx` |
| 行数      | 148 行                                         |
| useEffect | 2 箇所（外部クリック検出、Escape キー処理）    |

**現在の実装パターン:**

- `useState` でメニュー開閉状態管理
- `useRef<HTMLDivElement>` でメニュー DOM 参照
- Props: `items`, `triggerIcon`, `triggerLabel`, `position`
- アイテム型: `DropdownMenuItem { label, icon, onClick, danger? }`

**独自ロジック:**

1. 外部クリック検出 (`mousedown` イベント)
2. Escape キー処理 (`keydown` イベント)
3. `danger` フラグによるスタイル分岐

---

## 2. Mantine useLongPress フック調査

### インターフェース

```tsx
interface UseLongPressOptions {
  /** 長押し判定時間（デフォルト 400ms） */
  threshold?: number;
  /** 長押し開始時コールバック */
  onStart?: (event: React.MouseEvent | React.TouchEvent) => void;
  /** 長押し完了時コールバック */
  onFinish?: (event: React.MouseEvent | React.TouchEvent) => void;
  /** 長押しキャンセル時コールバック */
  onCancel?: (event: React.MouseEvent | React.TouchEvent) => void;
}

interface UseLongPressReturnValue {
  onMouseDown: (event: React.MouseEvent) => void;
  onMouseUp: (event: React.MouseEvent) => void;
  onMouseLeave: (event: React.MouseEvent) => void;
  onTouchStart: (event: React.TouchEvent) => void;
  onTouchEnd: (event: React.TouchEvent) => void;
}
```

### 主要機能

| 機能                   | Mantine 対応 | 備考                                       |
| ---------------------- | ------------ | ------------------------------------------ |
| 閾値設定               | ✅ サポート  | `threshold` オプション（デフォルト 400ms） |
| 開始コールバック       | ✅ サポート  | `onStart`                                  |
| 完了コールバック       | ✅ サポート  | `onFinish`                                 |
| キャンセルコールバック | ✅ サポート  | `onCancel`                                 |
| マウスイベント         | ✅ 組み込み  | onMouseDown/Up/Leave                       |
| タッチイベント         | ✅ 組み込み  | onTouchStart/End                           |

### 独自実装との比較

| 機能               | 独自実装         | Mantine            |
| ------------------ | ---------------- | ------------------ |
| イベント形式       | PointerEvent     | Mouse + Touch 分離 |
| 移動キャンセル     | ✅ moveThreshold | ❌ 未サポート      |
| 触覚フィードバック | ✅ 組み込み      | ❌ 手動実装必要    |
| iOS 対策           | ❌ 未実装        | ❌ 手動実装必要    |

### iOS ネイティブメニュー抑制

CSS による対策が必要:

```css
.file-list-item {
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
  touch-action: manipulation;
}
```

### 長押しとクリックの分離パターン

Mantine では `onFinish` コールバックで長押し完了を検知し、フラグを設定して `onClick` を抑制:

```tsx
const longPressTriggeredRef = useRef(false);

const handlers = useLongPress(
  () => {
    longPressTriggeredRef.current = true;
    onShowActionMenu({ item, position });
  },
  {
    threshold: 400,
    onFinish: () => {
      // 長押し完了後、次のクリックイベントを無視するためのフラグ
    },
    onCancel: () => {
      longPressTriggeredRef.current = false;
    },
  },
);

const handleClick = () => {
  if (longPressTriggeredRef.current) {
    longPressTriggeredRef.current = false;
    return; // 長押し後のクリックを無視
  }
  onItemClick(item);
};
```

---

## 3. Mantine Menu コンポーネント調査

### 基本構造

```tsx
import { Menu } from "@mantine/core";

<Menu opened={opened} onChange={setOpened} position="bottom-start">
  <Menu.Target>
    <Button>Toggle Menu</Button>
  </Menu.Target>
  <Menu.Dropdown>
    <Menu.Item leftSection={<Icon />}>アクション</Menu.Item>
    <Menu.Item color="red">危険なアクション</Menu.Item>
  </Menu.Dropdown>
</Menu>;
```

### 主要機能

| 機能             | Mantine 対応 | 備考                                    |
| ---------------- | ------------ | --------------------------------------- |
| 外部クリック検出 | ✅ 組み込み  | `closeOnClickOutside` (デフォルト true) |
| Escape キー処理  | ✅ 組み込み  | `closeOnEscape` (デフォルト true)       |
| 位置調整         | ✅ 組み込み  | `position` prop + Floating UI           |
| 制御状態         | ✅ サポート  | `opened` + `onChange`                   |
| 危険アクション   | ✅ サポート  | `<Menu.Item color="red">`               |
| キーボードナビ   | ✅ 組み込み  | 矢印キー、Enter、Tab                    |
| アイコン         | ✅ サポート  | `leftSection`, `rightSection`           |
| ARIA             | ✅ 組み込み  | role, aria-expanded 等                  |

### コンテキストメニュー（右クリック）対応

Mantine Menu は右クリックトリガーを直接サポートしていないが、`opened` の制御により実現可能。

### position prop 値

- `bottom` (デフォルト)
- `bottom-start`, `bottom-end`
- `top`, `top-start`, `top-end`
- `left`, `left-start`, `left-end`
- `right`, `right-start`, `right-end`

---

## 4. MantineProvider セットアップ

### 必要なインストール

```bash
npm install @mantine/core @mantine/hooks
```

### 基本セットアップ

```tsx
import { MantineProvider, createTheme } from "@mantine/core";
import "@mantine/core/styles.css";

const theme = createTheme({
  // カスタムテーマ設定
});

function App() {
  return (
    <MantineProvider theme={theme}>
      <YourApplication />
    </MantineProvider>
  );
}
```

### スタイル読み込み

`@mantine/core/styles.css` を import する必要あり。

---

## 5. 移行戦略

### useLongPress 移行【最優先】

**Before (独自実装):**

- PointerEvent ベースの handlers オブジェクト
- 長押し完了時に直接 onShowActionMenu 呼び出し
- onClick との競合が発生

**After (Mantine):**

- Mouse + Touch イベント分離
- 長押し完了フラグで onClick を条件分岐
- iOS 対策 CSS を追加

**追加実装が必要:**

- 触覚フィードバック（navigator.vibrate）
- 移動キャンセル（PointerMove 検出）
- iOS ネイティブメニュー抑制 CSS

### ContextMenu 移行

**Before (独自実装):**

- 親が `isOpen`, `position` を管理
- 右クリック/長押しで `position` と `isOpen` を設定
- `onClose` で閉じる

**After (Mantine):**

- 親が `opened`, `position` を管理（変更なし）
- `Menu` の `opened` と `onChange` で制御
- 外部クリック、Escape は Mantine が自動処理

### DropdownMenu 移行

**Before (独自実装):**

- 内部で `isOpen` 状態管理
- トリガークリックで開閉
- `items` 配列をレンダリング

**After (Mantine):**

- `Menu` の内部状態を使用（uncontrolled）または `opened` で制御
- `Menu.Target` にトリガー要素
- `items` を `Menu.Item` にマッピング

---

## 6. 互換性確認

| 項目         | 状態    | 備考                     |
| ------------ | ------- | ------------------------ |
| React 19     | ✅ 対応 | Mantine v7.17+ で対応    |
| TypeScript   | ✅ 対応 | 型定義同梱               |
| Vite         | ✅ 対応 | 追加設定不要             |
| Lucide React | ✅ 互換 | `leftSection` で使用可能 |
| Jotai        | ✅ 互換 | 状態管理は独立           |

---

## 7. 懸念事項と対策

### バンドルサイズ

- Mantine core は比較的大きい
- Tree-shaking により実際の影響は限定的
- 必要なコンポーネントのみ import

### スタイル競合

- Mantine CSS と既存 CSS の競合可能性
- 対策: CSS モジュール化、CSS 変数活用
- `MantineProvider` の `cssVariablesSelector` で調整可能

### 既存デザインとの統一

- Mantine のデフォルトスタイルはモダン
- `createTheme` でカスタマイズ可能
- 必要に応じて個別スタイル上書き

### useLongPress 移行時の注意点

- 移動キャンセル機能は Mantine にないため、必要に応じて追加ロジック実装
- 触覚フィードバックは手動で追加
- iOS/Android のネイティブメニュー抑制は CSS で対応

---

## 8. 結論

### 最優先: useLongPress 移行

Mantine の `useLongPress` フックへの移行により 3 つのバグを解決:

1. **長押し後の誤ナビゲーション**: 長押し完了フラグで onClick を抑制
2. **削除ボタン動作不良**: イベント伝播の適切な制御
3. **iOS ネイティブメニュー**: CSS で抑制

カスタム useLongPress フック（108 行）を削除可能。

### Menu コンポーネント移行

Mantine Menu コンポーネントは ContextMenu と DropdownMenu の移行先として適切:

1. **useEffect 削減**: 外部クリック、Escape 処理が組み込み → 4 箇所の useEffect 削除可能
2. **コード削減**: 位置調整ロジック不要 → 各コンポーネント 50+ 行削減見込み
3. **品質向上**: アクセシビリティ、キーボードナビが標準対応
4. **互換性**: 既存の Lucide アイコン、Jotai 状態管理と共存可能
