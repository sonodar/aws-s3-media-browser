# Implementation Plan

## Task Overview

| Phase | Description                                 | Requirements |
| ----- | ------------------------------------------- | ------------ |
| 1     | 依存関係追加と MantineProvider セットアップ | 2, 8, 9      |
| 2     | DevTools UI → useAtomsDevtools 移行         | 1            |
| 3     | FileListItem の useLongPress 移行【最優先】 | 3, 6         |
| 4     | ContextMenu の Mantine Menu 移行            | 4, 6, 7      |
| 5     | Header の Burger + Menu 移行                | 5, 6, 7      |
| 6     | クリーンアップと最終検証                    | 6, 7         |

---

## Tasks

- [ ] 1. 依存関係追加と MantineProvider セットアップ

- [ ] 1.1 Mantine パッケージと npm overrides を設定する
  - @mantine/core と @mantine/hooks をバージョン 8 で追加する
  - npm overrides で jotai-devtools の Mantine 7 依存を上書きする
  - npm install を実行して Mantine 8 のみがインストールされることを確認する
  - Mantine 7 のパッケージが存在しないことを検証する
  - _Requirements: 2_

- [ ] 1.2 (P) MantineProvider をアプリケーションルートに配置する
  - main.tsx で @mantine/core/styles.css を最初に読み込む
  - App.tsx で MantineProvider を JotaiProvider の外側にラップする
  - 既存のアプリ固有スタイルが Mantine スタイルの後に読み込まれることを確認する
  - _Requirements: 2, 8, 9_

- [ ] 1.3 (P) modern-normalize.min.css を削除する
  - index.html から modern-normalize.min.css の link タグを削除する
  - public/modern-normalize.min.css ファイルを削除する
  - Mantine の最小 CSS リセットで代替されることを確認する
  - _Requirements: 8_

- [ ] 1.4 ビルドとテストの動作を検証する
  - npm run build が正常に完了することを確認する
  - npm run test が既存テストをパスすることを確認する
  - アプリケーションが正常に起動することを確認する
  - _Requirements: 2_

---

- [ ] 2. DevTools UI から useAtomsDevtools への移行

- [ ] 2.1 AtomsDevtools ラッパーコンポーネントを作成する
  - jotai-devtools/utils から useAtomsDevtools をインポートする
  - Provider 直下で useAtomsDevtools フックを呼び出すラッパーコンポーネントを実装する
  - アプリケーション名として "aws-s3-photo-browser" を設定する
  - _Requirements: 1_

- [ ] 2.2 JotaiProvider を修正して AtomsDevtools を使用する
  - DevTools コンポーネントのインポートと使用を削除する
  - jotai-devtools/styles.css のインポートを削除する
  - 開発環境でのみ AtomsDevtools でラップするよう条件分岐を実装する
  - 本番環境では children をそのままレンダリングする
  - _Requirements: 1_

- [ ] 2.3 Redux DevTools との連携を検証する
  - 開発環境でアプリケーションを起動する
  - Redux DevTools 拡張機能で全アトムの状態が表示されることを確認する
  - アトムの値変更がアクションとして記録されることを確認する
  - Redux DevTools がインストールされていない環境でもエラーなく動作することを確認する
  - _Requirements: 1_

---

- [ ] 3. FileListItem の useLongPress 移行【最優先バグ修正】

- [ ] 3.1 FileList コンポーネントで Mantine useLongPress を導入する
  - @mantine/hooks から useLongPress フックをインポートする
  - threshold を 400ms に設定する
  - onFinish コールバックでコンテキストメニューを表示する処理を実装する
  - 長押し完了後に onClick を抑制するフラグ制御を実装する
  - _Requirements: 3_

- [ ] 3.2 (P) iOS/Android ネイティブメニュー抑制の CSS を追加する
  - FileList.css に -webkit-touch-callout: none を追加する
  - -webkit-user-select: none と user-select: none を追加する
  - touch-action: manipulation を追加する
  - _Requirements: 3_

- [ ] 3.3 長押しとタップの分離動作を検証する
  - 400ms 以上の長押しでコンテキストメニューが表示されることを確認する
  - 400ms 未満のタップで通常のナビゲーション動作が実行されることを確認する
  - 長押し後にポインタを離してもナビゲーションが発生しないことを確認する
  - 選択モード時に長押し操作が無効化されることを確認する
  - iOS/Android でネイティブメニューが表示されないことを確認する
  - _Requirements: 3_

---

- [ ] 4. ContextMenu の Mantine Menu 移行

- [ ] 4.1 ContextMenu を Mantine Menu ベースに書き換える
  - @mantine/core から Menu コンポーネントをインポートする
  - 既存の Props インターフェース（isOpen, item, position, onClose, onRename, onMove, onDelete）を維持する
  - Menu.Target と Menu.Dropdown を使用して制御されたメニューを実装する
  - position 座標に基づいてメニューを配置する
  - _Requirements: 4, 7_

- [ ] 4.2 メニューアイテムを実装する
  - 「名前を変更」アイテムに Pencil アイコンと onRename コールバックを設定する
  - 「移動」アイテムに FolderInput アイコンと onMove コールバックを設定する
  - 「削除」アイテムに Trash2 アイコン、color="red"、onDelete コールバックを設定する
  - _Requirements: 4, 7_

- [ ] 4.3 独自実装のロジックを削除する
  - 外部クリック検出の useEffect を削除する
  - Escape キー処理の useEffect を削除する
  - adjustedPosition 位置調整計算を削除する（Mantine 組み込み機能を使用）
  - 内部 MenuButton コンポーネントを削除する
  - ContextMenu.css を削除する
  - _Requirements: 4, 6_

- [ ] 4.4 ContextMenu の動作を検証する
  - 右クリックでメニューが表示されることを確認する
  - 長押しでメニューが表示されることを確認する
  - 各アクションが正しいダイアログを開くことを確認する
  - 外部クリックと Escape キーでメニューが閉じることを確認する
  - キーボードナビゲーション（矢印キー、Enter）が動作することを確認する
  - _Requirements: 4, 7_

---

- [ ] 5. Header の Burger + Menu 移行

- [ ] 5.1 Header に Mantine Burger と Menu を実装する
  - @mantine/core から Burger と Menu コンポーネントをインポートする
  - menuOpened 状態を useState で管理する
  - Menu.Target 内に Burger を配置し、opened prop と onClick を接続する
  - Burger に aria-label="メニューを開く" を設定する
  - _Requirements: 5_

- [ ] 5.2 グローバルメニューアイテムを実装する
  - 「設定」アイテムに Settings アイコンと onOpenSettings コールバックを設定する
  - 「サインアウト」アイテムに LogOut アイコン、color="red"、onSignOut コールバックを設定する
  - _Requirements: 5, 7_

- [ ] 5.3 独自 DropdownMenu コンポーネントを削除する
  - Header.tsx から DropdownMenu のインポートと使用を削除する
  - DropdownMenu.tsx ファイルを削除する
  - DropdownMenu.css ファイルを削除する
  - _Requirements: 5, 6_

- [ ] 5.4 Header メニューの動作を検証する
  - Burger クリックでメニューが開閉することを確認する
  - Burger のアニメーション（☰ ↔ ✕）が動作することを確認する
  - 設定アクションが設定ダイアログを開くことを確認する
  - サインアウトアクションが正しく動作することを確認する
  - 外部クリックと Escape キーでメニューが閉じることを確認する
  - _Requirements: 5, 7_

---

- [ ] 6. クリーンアップと最終検証

- [ ] 6.1 カスタム useLongPress フックを削除する
  - src/hooks/useLongPress.ts を削除する
  - src/hooks/useLongPress.test.ts を削除する
  - useLongPress への参照が残っていないことを確認する
  - _Requirements: 3, 6_

- [ ] 6.2 最終ビルドとテストを実行する
  - npm run check-all がパスすることを確認する
  - TypeScript の型エラーがないことを確認する
  - 全テストがパスすることを確認する
  - _Requirements: 2, 6_

- [ ] 6.3 全体動作の最終検証を実施する
  - PC: マウスクリック、右クリックの動作確認
  - iOS: 長押し動作、ネイティブメニュー抑制の確認
  - Android: 長押し動作、ネイティブメニュー抑制の確認
  - 開発環境: Redux DevTools でアトム状態が確認できること
  - コンテキストメニューの全アクション（リネーム、移動、削除）が動作すること
  - Header メニューの全アクション（設定、サインアウト）が動作すること
  - _Requirements: 1, 2, 3, 4, 5, 6, 7, 8_

---

## Requirements Coverage

| Requirement | Tasks                        |
| ----------- | ---------------------------- |
| 1           | 2.1, 2.2, 2.3, 6.3           |
| 2           | 1.1, 1.2, 1.4, 6.2, 6.3      |
| 3           | 3.1, 3.2, 3.3, 6.1, 6.3      |
| 4           | 4.1, 4.2, 4.3, 4.4, 6.3      |
| 5           | 5.1, 5.2, 5.3, 5.4, 6.3      |
| 6           | 4.3, 5.3, 6.1, 6.2, 6.3      |
| 7           | 4.1, 4.2, 4.4, 5.2, 5.4, 6.3 |
| 8           | 1.2, 1.3, 6.3                |
| 9           | 1.2                          |
