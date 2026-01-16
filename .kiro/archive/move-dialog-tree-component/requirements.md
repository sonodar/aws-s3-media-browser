# Requirements Document

## Introduction

本仕様は、MoveDialog コンポーネントのディレクトリ選択 UI を現在の FolderBrowser（フラットリスト表示 + ナビゲーション）から Mantine の Tree コンポーネントを使用した階層ツリー表示に置き換えることを定義します。

これにより、ユーザーはフォルダ階層全体を視覚的に把握しながら移動先を選択できるようになり、深い階層への移動時のナビゲーション回数を削減し、UX を向上させます。

## Requirements

### Requirement 1: ツリー形式のフォルダ選択 UI

**Objective:** ユーザーとして、移動ダイアログでフォルダ階層をツリー形式で表示・選択できるようにしたい。これにより、フォルダ構造を一目で把握し、目的のフォルダに効率的にアクセスできる。

#### Acceptance Criteria

1. When MoveDialog が開かれたとき, the MoveDialog shall ルートフォルダを起点としたフォルダ階層をツリー形式で表示する
2. When ユーザーがフォルダノードをクリックしたとき, the MoveDialog shall そのフォルダを移動先として選択状態にする
3. When フォルダノードが選択されたとき, the MoveDialog shall 選択されたフォルダのパスを「移動先」表示領域に反映する
4. The MoveDialog shall Mantine の Tree コンポーネントを使用してフォルダ階層を表示する

### Requirement 2: ツリーノードの展開・折りたたみ

**Objective:** ユーザーとして、フォルダツリーのノードを展開・折りたたみできるようにしたい。これにより、必要なフォルダ階層のみを表示し、ツリーの視認性を維持できる。

#### Acceptance Criteria

1. When ユーザーがフォルダノードの展開アイコンをクリックしたとき, the MoveDialog shall そのフォルダの子フォルダを表示する
2. When ユーザーが展開済みフォルダノードの展開アイコンをクリックしたとき, the MoveDialog shall そのフォルダの子フォルダを非表示にする（折りたたみ）
3. When フォルダが展開されたとき, the MoveDialog shall S3 から子フォルダ一覧を非同期で取得する
4. While 子フォルダの取得中, the MoveDialog shall ローディング状態を表示する
5. The MoveDialog shall 子フォルダが存在しないノードに対して展開アイコンを表示しない

### Requirement 3: 循環移動防止

**Objective:** ユーザーとして、フォルダを自身の配下に移動しようとした場合にエラーを防止したい。これにより、無効な移動操作によるデータ不整合を回避できる。

#### Acceptance Criteria

1. While 移動対象がフォルダを含む場合, the MoveDialog shall 移動対象フォルダ自身をツリー内で無効状態（選択不可）として表示する
2. While 移動対象がフォルダを含む場合, the MoveDialog shall 移動対象フォルダの配下のフォルダをツリー内で無効状態（選択不可）として表示する
3. When ユーザーが無効状態のフォルダを選択しようとしたとき, the MoveDialog shall 選択を無視する
4. The MoveDialog shall 無効状態のフォルダを視覚的に区別可能なスタイルで表示する（グレーアウト等）

### Requirement 4: 移動元フォルダの除外

**Objective:** ユーザーとして、現在のフォルダ（移動元）を移動先として選択できないようにしたい。これにより、無意味な移動操作を防止できる。

#### Acceptance Criteria

1. The MoveDialog shall 移動元フォルダ（現在のフォルダ）をツリー内で無効状態（選択不可）として表示する
2. When ユーザーが移動元フォルダを選択しようとしたとき, the MoveDialog shall 選択を無視する
3. The MoveDialog shall 移動元フォルダを視覚的に区別可能なスタイルで表示する（グレーアウト等）

### Requirement 5: 既存機能との互換性

**Objective:** 開発者として、既存の MoveDialog の機能を維持しつつ UI を置き換えたい。これにより、リグレッションなく改善を実現できる。

#### Acceptance Criteria

1. The MoveDialog shall 移動処理中のプログレス表示機能を維持する
2. The MoveDialog shall 移動成功時の成功メッセージ表示と自動クローズ機能を維持する
3. The MoveDialog shall 移動失敗時のエラーメッセージ表示と失敗アイテム一覧表示機能を維持する
4. The MoveDialog shall useMoveDialog フックのインターフェースを変更しない
5. The MoveDialog shall 既存の Props インターフェース（MoveDialogProps）を維持する
