# Requirements Document

## 概要

ファイルのフォルダ移動機能を実装し、ユーザーがS3ストレージ内のファイルやフォルダを別のフォルダへ移動できるようにする。既存の複数選択機能と統合し、一括移動にも対応する。

## Requirements

### Requirement 1: ファイル/フォルダ移動の基本操作

**Objective:** ユーザーとして、選択したファイルやフォルダを別のフォルダへ移動したい。ストレージ内のコンテンツを整理できるようにするため。

#### Acceptance Criteria

1. When ユーザーがファイルを選択して移動ボタンをクリック, the MediaBrowser shall 移動先選択UIを表示する
2. When ユーザーが移動先フォルダを選択して確定, the MediaBrowser shall 選択されたアイテムを指定フォルダへ移動する
3. When フォルダを移動対象として選択, the MediaBrowser shall そのフォルダ配下の全オブジェクトを移動先へ移動する
4. When 複数のファイル/フォルダを選択して移動, the MediaBrowser shall 選択された全アイテムを一括で移動する
5. The MediaBrowser shall 移動操作完了後にS3ストレージ上のファイル構造を正しく更新する

### Requirement 2: 移動先選択UI

**Objective:** ユーザーとして、フォルダ構造をナビゲートして移動先を選択したい。直感的に移動先を指定できるようにするため。

#### Acceptance Criteria

1. The MediaBrowser shall フォルダ階層をナビゲート可能な移動先選択ダイアログを提供する
2. When ダイアログ内でフォルダをクリック, the MediaBrowser shall そのフォルダを移動先として選択状態にする
3. When ダイアログ内でフォルダをダブルクリック, the MediaBrowser shall そのフォルダの中に移動してサブフォルダを表示する
4. While 移動先選択ダイアログ表示中, the MediaBrowser shall 移動元フォルダ（選択中アイテムの現在地）への移動を無効化する
5. While 移動先選択ダイアログ表示中, the MediaBrowser shall 移動対象のサブフォルダへの移動を無効化する（循環移動防止）
6. The MediaBrowser shall ダイアログ内で親フォルダへ戻るナビゲーションを提供する

### Requirement 3: 移動処理と進捗表示

**Objective:** ユーザーとして、移動処理の進捗状況を把握したい。処理完了まで待機できるようにするため。

#### Acceptance Criteria

1. While ファイル移動処理中, the MediaBrowser shall 進捗インジケーターを表示する
2. When 複数アイテムを移動中, the MediaBrowser shall 移動完了数と総数を表示する
3. While 移動処理中, the MediaBrowser shall ユーザーの他の操作を適切に制限する
4. The MediaBrowser shall 移動処理を非同期で実行し、UIをブロックしない

### Requirement 4: エラーハンドリング

**Objective:** ユーザーとして、移動操作で問題が発生した場合に明確なフィードバックを得たい。適切に対処できるようにするため。

#### Acceptance Criteria

1. If 移動先に同名のファイルまたはフォルダが既に存在, the MediaBrowser shall エラーメッセージを表示し移動操作を中止する
2. If 移動処理中にネットワークエラーが発生, the MediaBrowser shall エラーメッセージを表示する
3. If 一括移動中に一部のアイテムで失敗が発生, the MediaBrowser shall 失敗したアイテムの一覧を表示する
4. If 移動操作が失敗, the MediaBrowser shall 元のファイル構造を保持する（部分的な移動を防ぐ）

### Requirement 5: 移動完了後の状態更新

**Objective:** ユーザーとして、移動完了後に最新のファイル一覧を確認したい。操作結果を即座に把握できるようにするため。

#### Acceptance Criteria

1. When 移動操作が正常に完了, the MediaBrowser shall 現在のフォルダのファイル一覧を更新する
2. When 移動操作が正常に完了, the MediaBrowser shall 選択状態をクリアする
3. When 移動操作が正常に完了, the MediaBrowser shall 成功メッセージを表示する
4. When 移動操作が正常に完了, the MediaBrowser shall サムネイル表示を維持する（移動先でも同じサムネイルが利用可能）
