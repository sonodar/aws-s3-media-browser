# Implementation Plan

## Requirements Coverage

| 要件 ID            | 要件名                                  | カバータスク       |
| ------------------ | --------------------------------------- | ------------------ |
| 1                  | モーダル/ダイアログコンポーネントの移行 | 3.1-3.4            |
| 2                  | ボタンコンポーネントの移行              | 2.1-2.3            |
| 3                  | フォーム入力コンポーネントの移行        | 2.4                |
| 4                  | レイアウトコンポーネントの導入          | 1.1-1.2            |
| 5                  | ファイルリストのグリッドレイアウト移行  | 1.3, 2.5           |
| 6                  | ソートセレクターの移行                  | 2.6                |
| 7                  | サムネイル画像コンポーネントの移行      | 5.1                |
| 8（進捗表示）      | 進捗表示コンポーネントの導入            | 4.1-4.2            |
| 9（エラー・成功）  | エラー・成功メッセージの改善            | 4.3-4.4            |
| 10（実装順序）     | 実装順序の制約                          | 全タスク順序       |
| 11（既存機能維持） | 既存機能の維持                          | 各フェーズ末テスト |
| 12（hooks）        | Mantine フックによる useEffect 削減     | 3.1-3.4, 5.1       |

---

## Tasks

### Phase 1: レイアウトコンポーネント導入

- [ ] 1. ダイアログ内レイアウトを Mantine Stack/Group に移行
- [ ] 1.1 (P) CreateFolderDialog のレイアウト移行
  - フォーム内の縦並びレイアウトを Stack コンポーネントでラップ
  - ボタン群（キャンセル・作成）を Group コンポーネントで水平配置
  - Group に justify="flex-end" を適用してボタンを右寄せ
  - gap プロパティで統一した間隔を設定
  - 既存の機能とスタイルが維持されることを確認
  - _Requirements: 4_

- [ ] 1.2 (P) DeleteConfirmDialog, RenameDialog, MoveDialog のレイアウト移行
  - 各ダイアログのコンテンツを Stack コンポーネントでラップ
  - ボタン群を Group コンポーネントで水平配置
  - MoveDialog の移動先表示エリアとフォルダブラウザは既存構造を維持
  - 既存テストがパスすることを確認
  - _Requirements: 4_

- [ ] 1.3 FileList のグリッドレイアウトを SimpleGrid に移行
  - ul 要素を SimpleGrid コンポーネントに置き換え
  - レスポンシブな列数設定（base: 2, sm: 3, md: 4）を適用
  - 空状態表示を Center と Text コンポーネントで実装
  - 既存の useLongPress フック動作を維持
  - グリッド関連の CSS を削除し、Mantine のスタイルを使用
  - _Requirements: 5_

- [ ] 1.4 Phase 1 の動作確認とテスト実行
  - 全ての既存テストがパスすることを確認
  - 各ダイアログの表示・操作が正常に動作することを手動確認
  - レスポンシブ動作の確認（複数画面サイズ）
  - _Requirements: 10, 11_

---

### Phase 2: シンプルなコンポーネント置き換え

- [ ] 2. フォーム要素とボタンを Mantine コンポーネントに移行
- [ ] 2.1 (P) ダイアログ内ボタンを Mantine Button に移行
  - キャンセルボタンを Button variant="default" に置き換え
  - 送信・作成ボタンを Button に置き換え
  - 処理中状態で loading プロパティを使用してスピナー表示
  - disabled 状態の視覚的・機能的な無効化を確認
  - _Requirements: 2_

- [ ] 2.2 (P) DeleteConfirmDialog の削除ボタンを危険表示に対応
  - 削除ボタンに color="red" を適用
  - 削除中状態で loading プロパティを使用
  - アクセシビリティ属性（aria-label）を維持
  - _Requirements: 2_

- [ ] 2.3 (P) Header のアイコンボタンを ActionIcon に移行
  - 戻るボタン、選択モードボタン、全選択ボタンを ActionIcon に置き換え
  - 移動ボタン、削除ボタンを ActionIcon に置き換え（削除は color="red"）
  - variant="subtle" でアイコンのみの表示を実現
  - disabled 状態と aria-label を適切に設定
  - Header.css から .icon-button スタイルを削除
  - _Requirements: 2_

- [ ] 2.4 (P) テキスト入力を Mantine TextInput に移行
  - CreateFolderDialog のフォルダ名入力を TextInput に置き換え
  - RenameDialog の名前入力を TextInput に置き換え
  - label プロパティでアクセシブルなラベルを設定
  - placeholder プロパティで入力ヒントを表示
  - error プロパティでバリデーションエラーをインライン表示
  - disabled 状態で処理中の入力無効化
  - data-autofocus で初期フォーカスを設定
  - _Requirements: 3_

- [ ] 2.5 (P) FileList のチェックボックスを Mantine Checkbox に移行
  - 選択モード時のチェックボックスを Checkbox コンポーネントに置き換え
  - 選択状態のスタイリングを Mantine テーマカラーで実装
  - アイテムの hover/active 状態を維持
  - _Requirements: 5_

- [ ] 2.6 (P) SortSelector を NativeSelect に移行
  - select 要素を NativeSelect コンポーネントに置き換え
  - data プロパティでソートオプションを定義
  - value と onChange で現在の選択状態を制御
  - aria-label でアクセシビリティを確保
  - SortSelector.css を削除
  - _Requirements: 6_

- [ ] 2.7 Phase 2 の動作確認とテスト実行
  - 全ての既存テストがパスすることを確認
  - ボタン、入力フィールド、セレクトの操作確認
  - キーボードナビゲーションの確認
  - _Requirements: 10, 11_

---

### Phase 3: Modal 移行と hooks 対応

- [ ] 3. ダイアログを Mantine Modal に移行
- [ ] 3.1 CreateFolderDialog を Modal に移行
  - dialog-overlay 構造を Modal コンポーネントに置き換え
  - opened プロパティで表示状態を制御
  - title プロパティでダイアログタイトルを設定
  - centered プロパティで中央配置
  - closeOnClickOutside と closeOnEscape で処理中以外の閉じる動作を設定
  - withCloseButton で処理中の×ボタン非表示
  - Modal のフォーカストラップ機能を使用（手動実装不要）
  - _Requirements: 1, 12_

- [ ] 3.2 DeleteConfirmDialog を Modal に移行
  - useEffect によるフォーカス設定を削除（data-autofocus で代替）
  - handleKeyDown の Escape 検知を削除（Modal が処理）
  - role="alertdialog" は Modal でも指定可能なため維持を検討
  - 削除中は閉じる操作を無効化
  - _Requirements: 1, 12_

- [ ] 3.3 RenameDialog を Modal に移行
  - key ベースの状態リセットパターンは維持
  - IME 対応の handleKeyDown は維持（Modal の Escape 処理と共存）
  - 処理中は閉じる操作を無効化
  - Modal size プロパティでダイアログサイズを調整
  - _Requirements: 1, 12_

- [ ] 3.4 MoveDialog を Modal に移行
  - dialog-content-large を Modal size="lg" に置き換え
  - FolderBrowser コンポーネントはそのまま維持
  - 移動中は閉じる操作を無効化
  - _Requirements: 1, 12_

- [ ] 3.5 ダイアログ共通 CSS の削除
  - CreateFolderDialog.css の dialog-overlay, dialog-backdrop, dialog-content スタイルを削除
  - 他のダイアログで共有されていたスタイルを整理
  - 不要になった CSS ファイルを削除
  - _Requirements: 10_

- [ ] 3.6 Phase 3 の動作確認とテスト実行
  - 全ての既存テストがパスすることを確認
  - Escape キーでのダイアログ閉じる動作確認
  - オーバーレイクリックでの閉じる動作確認
  - フォーカストラップの動作確認（Tab キーでダイアログ内に留まる）
  - 処理中の閉じる操作無効化確認
  - _Requirements: 10, 11_

---

### Phase 4: 新規要素の追加

- [ ] 4. Progress, Alert, Notification コンポーネントの導入
- [ ] 4.1 (P) RenameDialog に Progress コンポーネントを追加
  - フォルダリネーム時の進捗表示を Progress コンポーネントで実装
  - value プロパティで進捗率（current/total \* 100）を表示
  - animated プロパティでアニメーション効果を追加
  - Text コンポーネントで「X / Y 件処理中...」を併記
  - 既存の progress-message スタイルを Mantine に置き換え
  - _Requirements: 8_

- [ ] 4.2 (P) MoveDialog に Progress コンポーネントを追加
  - 移動処理時の進捗表示を Progress コンポーネントで実装
  - 進捗テキストを Text コンポーネントで表示
  - _Requirements: 8_

- [ ] 4.3 (P) ダイアログ内エラー表示を Alert に移行
  - RenameDialog のエラー詳細表示を Alert コンポーネントに置き換え
  - MoveDialog のエラーメッセージを Alert コンポーネントに置き換え
  - color="red" とアイコン（AlertCircle）でエラー状態を明示
  - フォルダリネーム失敗時の詳細情報（成功/失敗件数）を Alert 内に表示
  - _Requirements: 9_

- [ ] 4.4 (P) MoveDialog に成功通知を追加
  - 移動成功時に Notification コンポーネントで成功メッセージを表示
  - color="green" と CheckCircle アイコンで成功状態を明示
  - onClose でユーザーが手動で閉じられるようにする
  - 既存の setTimeout による自動クローズは維持
  - _Requirements: 9_

- [ ] 4.5 Phase 4 の動作確認とテスト実行
  - フォルダリネーム時の進捗表示確認
  - ファイル移動時の進捗表示確認
  - エラー発生時の Alert 表示確認
  - 成功時の Notification 表示確認
  - _Requirements: 10, 11_

---

### Phase 5: ThumbnailImage の移行（最後）

- [ ] 5. ThumbnailImage を Mantine コンポーネントに移行
- [ ] 5.1 ThumbnailImage を Mantine Image/Skeleton に移行
  - ローディング状態を Skeleton コンポーネントで表示
  - 読み込み完了後は Image コンポーネントで画像を表示
  - fit="cover" で画像のアスペクト比を制御
  - loading="lazy" で遅延読み込みを適用
  - エラー時のフォールバックはカスタム実装を維持（アイコン表示）
  - useTimeout フックで遅延処理の宣言的な記述を検討
  - URL フェッチの useEffect は維持（非同期処理のため）
  - _Requirements: 7, 12_

- [ ] 5.2 ThumbnailImage.css の削除
  - 移行完了後に ThumbnailImage.css を削除
  - FileList.css の関連スタイルを確認・整理
  - _Requirements: 10_

- [ ] 5.3 Phase 5 の動作確認と最終テスト
  - 全ての既存テストがパスすることを確認
  - サムネイル画像の読み込み・表示確認
  - ローディング状態とエラーフォールバックの確認
  - 新規アップロードファイルの遅延表示確認
  - _Requirements: 10, 11_

---

### Phase 6: 最終統合と品質確認

- [ ] 6. 最終統合テストと品質確認
- [ ] 6.1 全機能の統合テスト
  - フォルダ作成 → 削除 → リネーム → 移動のフロー確認
  - 複数ファイル選択・一括操作の確認
  - ソート順変更とファイル一覧更新の確認
  - _Requirements: 11_

- [ ] 6.2 アクセシビリティの最終確認
  - キーボードナビゲーション（Tab、Escape、Enter）の動作確認
  - スクリーンリーダーでのダイアログ認識確認
  - aria 属性の適切な設定確認
  - _Requirements: 1, 11_

- [ ] 6.3 モバイルデバイスでの動作確認
  - タッチ操作での長押しメニュー確認
  - レスポンシブレイアウトの確認
  - 仮想キーボード表示時の操作確認
  - _Requirements: 11_

- [ ] 6.4 不要コードとファイルの最終クリーンアップ
  - 使用されなくなった CSS クラスの削除
  - 不要なインポート文の削除
  - コメントアウトされたコードの削除
  - _Requirements: 10_
