# Implementation Plan

## Tasks

- [ ] 1. useFolderTree フックの実装
- [ ] 1.1 (P) ツリーデータ構造と型定義の作成
  - StorageItem から TreeNodeData への変換ユーティリティを実装
  - useFolderTree フックの基本インターフェースを定義
  - ルートフォルダから初期ツリーデータを構築するロジックを実装
  - _Requirements: 1.1, 1.4_
  - _Contracts: UseFolderTreeOptions, UseFolderTreeReturn_

- [ ] 1.2 ノード展開・折りたたみ機能の実装
  - Mantine useTree フックを統合し、展開状態を管理
  - ノード展開時に useStorageItems で子フォルダを非同期取得するロジックを実装
  - 取得した子フォルダをツリーデータに追加する更新処理を実装
  - ローディング中のパスを追跡する loadingPaths 状態を管理
  - TanStack Query のキャッシュを活用し、既取得パスの再フェッチを回避
  - _Requirements: 2.1, 2.2, 2.3_
  - _Contracts: toggleExpanded, loadingPaths_

- [ ] 1.3 ノード選択と無効化ロジックの実装
  - フォルダノード選択時に selectedPath を更新するハンドラを実装
  - disabledPaths と currentPath に基づく無効判定ロジックを実装
  - 無効ノードの選択を防止するガード処理を追加
  - _Requirements: 1.2, 3.3, 4.2_
  - _Contracts: selectNode, isDisabled_

- [ ] 1.4 useFolderTree フックのユニットテスト作成
  - ルートフォルダからの初期ツリー構築をテスト
  - ノード展開時の子フォルダ取得と状態更新をテスト
  - 無効ノードの選択防止ロジックをテスト
  - ローディング状態の追跡をテスト
  - _Requirements: 2.1, 2.2, 2.3, 3.3, 4.2_

- [ ] 2. FolderTree コンポーネントの実装
- [ ] 2.1 FolderTree 基本コンポーネントの作成
  - Mantine Tree コンポーネントを使用したフォルダ階層表示を実装
  - useFolderTree フックと連携してツリーデータを表示
  - Props インターフェース（identityId, rootPath, disabledPaths, currentPath, onSelect）を定義
  - _Requirements: 1.1, 1.4_
  - _Contracts: FolderTreeProps_

- [ ] 2.2 カスタムノードレンダリングの実装
  - renderNode で Folder アイコン（lucide-react）を表示
  - 展開アイコン（ChevronRight/ChevronDown）を子フォルダ有無に応じて表示
  - ローディング中のノードにスピナーを表示
  - 子フォルダが存在しないノードでは展開アイコンを非表示
  - _Requirements: 2.4, 2.5_

- [ ] 2.3 無効ノードのスタイリング
  - disabledPaths に含まれるノードをグレーアウト表示
  - 移動元フォルダ（currentPath）を視覚的に区別
  - 無効ノードのカーソルを not-allowed に設定
  - クリックイベントを無効ノードで無視
  - _Requirements: 3.4, 4.3_

- [ ] 2.4 ノード選択・展開イベントハンドリング
  - ノードクリック時に onSelect コールバックを呼び出し
  - 展開アイコンクリック時に toggleExpanded を呼び出し
  - 選択状態のノードをハイライト表示
  - _Requirements: 1.2, 1.3, 2.1, 2.2_

- [ ] 2.5 FolderTree コンポーネントのテスト作成
  - ツリー形式でフォルダが表示されることをテスト
  - ノード展開・折りたたみ動作をテスト
  - 無効ノードのスタイリングと選択不可をテスト
  - フォルダ選択時の onSelect 呼び出しをテスト
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 3.4, 4.3_

- [ ] 3. MoveDialog コンポーネントの修正
- [ ] 3.1 FolderBrowser から FolderTree への置き換え
  - FolderBrowser のインポートを FolderTree に変更
  - handleNavigate を FolderTree の onSelect に接続
  - browsePath 状態を選択されたパスで更新するロジックを調整
  - 「上へ」「ホーム」ボタンを削除（ツリー表示で不要）
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 3.2 循環移動防止ロジックの統合
  - 既存の disabledPaths 計算ロジックを維持
  - 移動対象フォルダ自身と配下のパスを disabledPaths に含める
  - 移動元フォルダ（currentPath）を disabledPaths に追加
  - FolderTree に disabledPaths を渡す
  - _Requirements: 3.1, 3.2, 4.1_

- [ ] 3.3 既存機能の維持確認
  - MoveDialogProps インターフェースが変更されていないことを確認
  - 移動処理中のプログレス表示が動作することを確認
  - 移動成功時の成功メッセージと自動クローズが動作することを確認
  - 移動失敗時のエラーメッセージと失敗アイテム一覧表示が動作することを確認
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 3.4 MoveDialog の統合テスト更新
  - ツリー形式でフォルダが表示されることをテスト
  - フォルダ選択時に移動先パスが更新されることをテスト
  - 循環移動対象フォルダが無効化されていることをテスト
  - 移動元フォルダが無効化されていることをテスト
  - 移動処理の成功・失敗シナリオをテスト
  - _Requirements: 1.1, 1.2, 1.3, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 5.1, 5.2, 5.3_

- [ ] 4. 最終検証と品質保証
- [ ] 4.1 全体統合テストの実行
  - MoveDialog を開いてツリー表示を確認
  - フォルダ展開・選択・移動の一連フローをテスト
  - 循環移動防止と移動元除外の動作を確認
  - npm run check-all による全体検証を実行
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 5.1, 5.2, 5.3, 5.4, 5.5_
