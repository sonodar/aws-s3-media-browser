# Implementation Tasks

## Overview

gesture-navigation-ux 機能の実装タスク一覧。各タスクは設計ドキュメントと要件トレーサビリティに基づいて定義。

**依存関係の凡例**:

- `→` 順次依存（前のタスクの完了が必要）
- `||` 並列実行可能

## Task 1: @use-gesture/react パッケージのインストール

### Description

ジェスチャー検出に必要な @use-gesture/react パッケージをプロジェクトに追加する。

### Requirements Covered

- 3.4: 水平スワイプのみを検出
- 6.3: タッチ/ポインター両対応

### Acceptance Criteria

- [x] @use-gesture/react ^10.x がインストールされている
- [x] package.json に依存関係が追加されている
- [x] TypeScript 型定義が正しく認識される

### Dependencies

なし（最初のタスク）

---

## Task 2: useLongPress フックの実装

### Description

長押しジェスチャーを検出するカスタムフックを実装する。タイマーベースで400ms以上のタッチを検出し、移動量が閾値を超えた場合はキャンセルする。

### Requirements Covered

- 4.1: 長押しでアクションメニュー表示（300-500ms）
- 4.2: 触覚/ビジュアルフィードバック
- 4.3: 移動時の長押しキャンセル

### Acceptance Criteria

- [x] `src/hooks/useLongPress.ts` が作成されている
- [x] PointerEvent ベースのハンドラを返す
- [x] delay オプション（デフォルト 400ms）が動作する
- [x] moveThreshold オプション（デフォルト 10px）が動作する
- [x] Vibration API による触覚フィードバック（サポートデバイスのみ）
- [x] 単体テストが作成されている

### Dependencies

Task 1 → Task 2

---

## Task 3: useSwipeNavigation フックの実装

### Description

水平スワイプを検出し、左スワイプ時に戻るナビゲーションを実行するカスタムフックを実装する。@use-gesture/react の useDrag を活用。

### Requirements Covered

- 3.1: 左スワイプで親ディレクトリに移動
- 3.2: ルートでのスワイプ無効化
- 3.4: 縦スクロール中の誤発動防止
- 6.2: スクロール競合回避
- 6.3: タッチ/ポインター両対応

### Acceptance Criteria

- [x] `src/hooks/useSwipeNavigation.ts` が作成されている
- [x] bind 関数、offsetX、isSwiping を返す
- [x] 左スワイプ（swipe[0] === -1）検出時に onSwipeBack を呼び出す
- [x] isAtRoot が true の場合はスワイプを無効化
- [x] threshold オプションによる閾値設定が動作する
- [x] axis: 'x' による水平スワイプのみ検出
- [x] 単体テストが作成されている

### Dependencies

Task 1 → Task 3

---

## Task 4: ContextMenu コンポーネントの実装

### Description

長押し時に表示されるアクションメニューコンポーネントを新規作成する。FileActionMenu の機能を継承しつつ、ポップオーバー形式で指定位置に表示する。

### Requirements Covered

- 4.1: 長押しでアクションメニュー表示
- 4.4: フォルダの長押し対応

### Acceptance Criteria

- [x] `src/components/MediaBrowser/ContextMenu.tsx` が作成されている
- [x] 指定された position（x, y）に表示される
- [x] リネーム、移動、削除のアクションを表示
- [x] 外部クリックで閉じる
- [x] アクション実行後に自動で閉じる
- [x] 画面端での位置調整（オーバーフロー防止）
- [x] アニメーション付きの表示/非表示

### Dependencies

なし（並列実行可能）

---

## Task 5: FileList コンポーネントの長押し対応

### Description

FileList コンポーネントに useLongPress フックを統合し、各アイテムの長押しでアクションメニューを表示する。FileActionMenu への参照を削除する。

### Requirements Covered

- 4.1: 長押しでアクションメニュー表示
- 4.3: 移動時の長押しキャンセル
- 4.4: フォルダの長押し対応
- 4.5: メニューアイコン削除

### Acceptance Criteria

- [x] FileList.tsx が useLongPress を使用している
- [x] 長押し時に onShowActionMenu を呼び出す
- [x] FileActionMenu のインポートと使用を削除
- [x] 既存の onRename, onMove props を onShowActionMenu に統合
- [x] 選択モード中は長押しを無効化
- [x] タップとの区別が正しく動作する

### Dependencies

Task 2 → Task 5
Task 4 || Task 5（並列実行可能だが、統合テストには両方必要）

---

## Task 6: FileActionMenu コンポーネントの削除

### Description

FileActionMenu コンポーネントとその関連コードを削除する。

### Requirements Covered

- 4.5: メニューアイコン削除

### Acceptance Criteria

- [x] `src/components/MediaBrowser/FileActionMenu.tsx` が削除されている
- [x] `src/components/MediaBrowser/FileActionMenu.css` が削除されている（存在する場合）
- [x] 関連するインポート文が全て削除されている
- [x] ビルドエラーがない

### Dependencies

Task 5 → Task 6

---

## Task 7: MediaBrowser のスワイプナビゲーション統合

### Description

MediaBrowser コンポーネントに useSwipeNavigation フックを統合し、コンテンツ領域での左スワイプで親ディレクトリへ戻る機能を実装する。

### Requirements Covered

- 3.1: 左スワイプで親ディレクトリに移動
- 3.2: ルートでのスワイプ無効化/フィードバック
- 3.3: スワイプ中のフィードバック
- 3.5: 既存戻るボタン維持
- 6.1: ブラウザジェスチャー抑制
- 6.2: スクロール競合回避

### Acceptance Criteria

- [x] MediaBrowser が useSwipeNavigation を使用している
- [x] main.media-browser-content に bind() がスプレッドされている
- [x] CSS で touch-action: pan-y を設定
- [x] CSS で overscroll-behavior: none を設定
- [x] スワイプ中の offsetX によるビジュアルフィードバック（transform）
- [x] ルートディレクトリでは goBack を呼ばない
- [x] 既存の戻るボタンが引き続き動作する

### Dependencies

Task 3 → Task 7

---

## Task 8: MediaBrowser の ContextMenu 統合

### Description

MediaBrowser コンポーネントに ContextMenu の状態管理を追加し、FileList からの長押しイベントを処理する。

### Requirements Covered

- 4.1: 長押しでアクションメニュー表示
- 4.4: フォルダの長押し対応

### Acceptance Criteria

- [x] ContextMenuState の状態管理が追加されている
- [x] FileList に onShowActionMenu prop を渡している
- [x] ContextMenu コンポーネントが適切に配置されている
- [x] メニューからのアクション（リネーム、移動、削除）が動作する
- [x] アクション後にメニューが閉じる

### Dependencies

Task 4 → Task 8
Task 5 → Task 8

---

## Task 9: PreviewModal の複数スライド対応

### Description

PreviewModal コンポーネントを単一ファイル表示から複数ファイルスライド対応に変更する。Lightbox の標準スワイプナビゲーションと下スワイプクローズを有効化する。

### Requirements Covered

- 1.1: 左スワイプで次ファイル
- 1.2: 右スワイプで前ファイル
- 1.3: 最初のファイルでの右スワイプ無効化
- 1.4: 最後のファイルでの左スワイプ無効化
- 1.5: スワイプ中のフィードバック
- 2.1: 下スワイプでクローズ
- 2.2: 下スワイプ中のフィードバック
- 2.3: 閾値未達時の復帰
- 2.4: スワイプ方向判定
- 2.5: 閉じるボタン維持

### Acceptance Criteria

- [x] Props が items: StorageItem[], currentIndex, onIndexChange に変更されている
- [x] slides 配列に全プレビュー可能ファイルを含める
- [x] Lightbox の index prop で現在のスライドを制御
- [x] on.view コールバックで onIndexChange を呼び出す
- [x] controller.closeOnPullDown: true が設定されている
- [x] carousel.finite: true が維持されている（端でのスワイプ制限）
- [x] 既存の閉じるボタンが動作する
- [x] 削除/リネーム/移動は現在のインデックスのファイルに対して動作

### Dependencies

なし（並列実行可能）

---

## Task 10: MediaBrowser の PreviewModal 統合

### Description

MediaBrowser コンポーネントで previewableItems と currentPreviewIndex を管理し、PreviewModal に渡す。

### Requirements Covered

- 1.1-1.5: プレビュー画面スワイプナビゲーション

### Acceptance Criteria

- [x] sortedItems から isPreviewable でフィルタした previewableItems を計算
- [x] previewItem の代わりに currentPreviewIndex（null または数値）を管理
- [x] handleFileClick でクリックしたファイルのインデックスを設定
- [x] PreviewModal に items, currentIndex, onIndexChange を渡す
- [x] スワイプナビゲーションで前後ファイルに移動できる
- [x] 削除後は適切なインデックスに調整（または閉じる）

### Dependencies

Task 9 → Task 10

---

## Task 11: CSS スタイル調整とブラウザジェスチャー制御

### Description

ジェスチャー操作に必要な CSS スタイルを追加し、ブラウザのデフォルトジェスチャーとの競合を回避する。

### Requirements Covered

- 5.1: 完了時アニメーション
- 5.2: キャンセル時アニメーション
- 6.1: ブラウザジェスチャー抑制

### Acceptance Criteria

- [x] MediaBrowser.css に touch-action: pan-y を追加
- [x] MediaBrowser.css に overscroll-behavior: none を追加
- [x] スワイプ中の transform アニメーション用スタイル
- [x] ContextMenu の表示アニメーション
- [x] iOS Safari のエッジスワイプ競合が発生しない

### Dependencies

Task 7 || Task 8（CSS は各コンポーネント実装と並行可能）

---

## Task 12: 統合テストと動作確認

### Description

全機能の統合テストと手動での動作確認を行う。

### Requirements Covered

全要件（1.1-6.3）

### Acceptance Criteria

- [x] プレビュー画面で左右スワイプが動作する
- [x] プレビュー画面で下スワイプクローズが動作する
- [x] ファイルリストで左スワイプ戻るが動作する
- [x] ファイルアイテム長押しでメニューが表示される
- [x] フォルダアイテム長押しでメニューが表示される
- [x] ルートディレクトリでスワイプ戻るが無効化される
- [x] 端のファイルでスワイプナビゲーションが制限される
- [x] 既存の戻るボタン、閉じるボタンが動作する
- [x] スクロールとジェスチャーが競合しない
- [x] ビルドが成功する

### Dependencies

Task 6 → Task 12
Task 10 → Task 12
Task 11 → Task 12

---

## Dependency Graph

```
Task 1 (@use-gesture インストール)
    ├─→ Task 2 (useLongPress)
    │       └─→ Task 5 (FileList 長押し対応)
    │               └─→ Task 6 (FileActionMenu 削除)
    │               └─→ Task 8 (MediaBrowser ContextMenu 統合)
    │
    └─→ Task 3 (useSwipeNavigation)
            └─→ Task 7 (MediaBrowser スワイプナビゲーション)

Task 4 (ContextMenu) ─────────────┬─→ Task 8
                                  │
Task 9 (PreviewModal 複数スライド) ─┴─→ Task 10 (MediaBrowser PreviewModal 統合)

Task 11 (CSS 調整) ──────────────────→ Task 12 (統合テスト)
                                              ↑
Task 6, Task 10 ─────────────────────────────┘
```

## Parallel Execution Opportunities

以下のタスクグループは並列実行可能:

**Group A**: Task 2, Task 3（両方 Task 1 の後）
**Group B**: Task 4, Task 9（依存関係なし）
**Group C**: Task 5, Task 7（それぞれ Task 2, Task 3 の後）
**Group D**: Task 8, Task 10, Task 11（前提タスク完了後）
