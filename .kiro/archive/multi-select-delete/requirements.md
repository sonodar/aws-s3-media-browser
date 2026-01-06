# Requirements Document

## Project Description (Input)

メディアリストで複数選択の UI を実装して、複数ファイルの削除とディレクトリの削除を実装して

## Introduction

本仕様は、AWS S3 Photo Browser アプリケーションにおいて、メディアリストでの複数選択機能と一括削除機能を実装するための要件を定義します。これにより、ユーザーは複数のファイルやフォルダを効率的に選択し、一括で削除操作を実行できるようになります。

## Requirements

### Requirement 1: 選択モードの有効化・無効化

**Objective:** As a ユーザー, I want メディアリストで選択モードに切り替える機能, so that 複数のアイテムを選択して一括操作を実行できる

#### Acceptance Criteria

1. When ユーザーが選択モードボタンをクリックした時, the MediaBrowser shall 選択モードを有効化し、各アイテムにチェックボックスを表示する
2. While 選択モードが有効な間, the FileList shall 各アイテムの左側にチェックボックスを表示する
3. When ユーザーが選択モード中にキャンセルボタンをクリックした時, the MediaBrowser shall 選択モードを終了し、選択状態をクリアする
4. While 選択モードが有効な間, the FileList shall アイテムクリック時にプレビューやフォルダ移動ではなく選択状態の切り替えを行う

### Requirement 2: アイテムの個別選択

**Objective:** As a ユーザー, I want 個々のファイルやフォルダを選択・選択解除する機能, so that 削除対象を柔軟に指定できる

#### Acceptance Criteria

1. When ユーザーがチェックボックスをクリックした時, the FileList shall 対象アイテムの選択状態をトグルする
2. When アイテムが選択された時, the FileList shall 視覚的に選択状態を示すスタイル（ハイライト）を適用する
3. When アイテムの選択が解除された時, the FileList shall 通常のスタイルに戻す
4. The FileList shall ファイルとフォルダの両方を選択可能にする

### Requirement 3: 一括選択操作

**Objective:** As a ユーザー, I want すべてのアイテムを一括で選択・選択解除する機能, so that 大量のアイテムを効率的に操作できる

#### Acceptance Criteria

1. While 選択モードが有効な間, the MediaBrowser shall 「すべて選択」ボタンを表示する
2. When ユーザーが「すべて選択」をクリックした時, the MediaBrowser shall 現在表示中のすべてのアイテムを選択状態にする
3. When すべてのアイテムが選択されている状態で「すべて選択」をクリックした時, the MediaBrowser shall すべてのアイテムの選択を解除する
4. The MediaBrowser shall 現在の選択件数を表示する

### Requirement 4: 複数アイテムの一括削除

**Objective:** As a ユーザー, I want 選択した複数のアイテムを一括で削除する機能, so that ファイル整理を効率的に行える

#### Acceptance Criteria

1. While 1つ以上のアイテムが選択されている間, the MediaBrowser shall 削除ボタンを有効化する
2. When ユーザーが削除ボタンをクリックした時, the MediaBrowser shall 確認ダイアログを表示し、削除対象のアイテム数を提示する
3. When ユーザーが確認ダイアログで削除を承認した時, the useStorageOperations shall 選択されたすべてのアイテムを S3 から削除する
4. While 削除処理が実行中の間, the MediaBrowser shall 進捗状態を表示し、ユーザー操作をブロックする
5. When 削除処理が完了した時, the MediaBrowser shall 選択モードを終了し、リストを更新する
6. If 削除処理中にエラーが発生した場合, then the MediaBrowser shall エラーメッセージを表示し、失敗したアイテムを通知する

### Requirement 5: フォルダの削除（再帰的削除）

**Objective:** As a ユーザー, I want フォルダを選択して削除した時に中身も含めて削除される機能, so that フォルダごとファイルを整理できる

#### Acceptance Criteria

1. When ユーザーがフォルダを含む選択を削除しようとした時, the DeleteConfirmDialog shall フォルダ内のコンテンツも削除される旨の警告を表示する
2. When ユーザーがフォルダ削除を承認した時, the useStorageOperations shall フォルダ配下のすべてのファイルとサブフォルダを再帰的に削除する
3. The useStorageOperations shall フォルダ削除時に、まずフォルダ内のコンテンツをリストアップし、すべてを削除する

### Requirement 6: 選択状態の視覚的フィードバック

**Objective:** As a ユーザー, I want 現在の選択状態を明確に把握できる UI, so that 操作対象を誤認しない

#### Acceptance Criteria

1. While 選択モードが有効な間, the Header shall 選択モード用のツールバーを表示する
2. The Header shall 選択件数（例：「3件選択中」）を表示する
3. While アイテムが選択されている間, the FileList shall 選択アイテムに背景色を適用して視覚的に区別する
4. The MediaBrowser shall 選択モードと通常モードで異なるアクションボタンを表示する

### Requirement 7: アクセシビリティ対応

**Objective:** As a ユーザー, I want キーボードやスクリーンリーダーで複数選択操作を行える機能, so that アクセシビリティ要件を満たせる

#### Acceptance Criteria

1. The FileList shall チェックボックスに適切な aria-label を設定する
2. The FileList shall キーボード（Space/Enter）でチェックボックスを操作可能にする
3. The MediaBrowser shall 選択件数の変更を aria-live 領域で通知する
4. The DeleteConfirmDialog shall フォーカストラップを実装し、ダイアログ外へのフォーカス移動を防ぐ
