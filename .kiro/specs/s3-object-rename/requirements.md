# Requirements Document

## Introduction

本ドキュメントは、AWS S3 Photo Browser アプリケーションにおけるファイル・ディレクトリのリネーム機能の要件を定義する。S3 はオブジェクトストレージであり、実際の「リネーム」操作は存在しないため、新しいキーへのコピーと元オブジェクトの削除によって実現する。ディレクトリ（プレフィックス）のリネーム時は、配下のすべてのオブジェクトのキーを一括で変更する必要がある。

## Requirements

### Requirement 1: ファイルリネーム機能

**Objective:** As a ユーザー, I want アップロード済みファイルの名前を変更できること, so that ファイルを整理しやすくなる

#### Acceptance Criteria

1. When ユーザーがファイルを選択してリネームを実行する, the Media Browser shall 新しいファイル名の入力ダイアログを表示する
2. When ユーザーが新しいファイル名を入力して確定する, the Media Browser shall ファイルを新しいキーにコピーし元のファイルを削除する
3. When リネーム処理が完了する, the Media Browser shall ファイル一覧を更新して新しいファイル名を反映する
4. While リネーム処理中, the Media Browser shall ローディング状態を表示する
5. If ユーザーがリネームをキャンセルする, the Media Browser shall 元のファイル名を維持してダイアログを閉じる

### Requirement 2: ディレクトリリネーム機能

**Objective:** As a ユーザー, I want ディレクトリ（フォルダ）の名前を変更できること, so that フォルダ構成を整理できる

#### Acceptance Criteria

1. When ユーザーがディレクトリを選択してリネームを実行する, the Media Browser shall 新しいディレクトリ名の入力ダイアログを表示する
2. When ユーザーが新しいディレクトリ名を入力して確定する, the Media Browser shall 配下のすべてのオブジェクトのキーを新しいプレフィックスに変更する
3. When ディレクトリ配下に複数のファイルが存在する, the Media Browser shall すべてのファイルを順次リネームする
4. While ディレクトリリネーム処理中, the Media Browser shall 処理進捗を表示する
5. When ディレクトリリネーム処理が完了する, the Media Browser shall ディレクトリ一覧を更新して新しいディレクトリ名を反映する

### Requirement 3: リネームバリデーション

**Objective:** As a システム, I want 不正なファイル名・ディレクトリ名を防止すること, so that S3 オブジェクトキーとして有効な名前のみが使用される

#### Acceptance Criteria

1. The Media Browser shall 空のファイル名・ディレクトリ名を許可しない
2. If ユーザーが既存のファイル名・ディレクトリ名と同じ名前を入力する, the Media Browser shall エラーメッセージを表示する
3. If ユーザーが無効な文字を含む名前を入力する, the Media Browser shall エラーメッセージを表示して入力を拒否する
4. The Media Browser shall ファイル名・ディレクトリ名の前後の空白をトリムする

### Requirement 4: エラーハンドリング

**Objective:** As a システム, I want リネーム処理中のエラーを適切に処理すること, so that ユーザーが問題を認識して対処できる

#### Acceptance Criteria

1. If S3 へのコピー操作が失敗する, the Media Browser shall エラーメッセージを表示して元のファイル状態を維持する
2. If S3 からの削除操作が失敗する, the Media Browser shall エラーメッセージを表示してユーザーに通知する
3. If ネットワークエラーが発生する, the Media Browser shall エラーメッセージを表示してリトライオプションを提供する
4. If ディレクトリリネーム中に一部のファイルで失敗する, the Media Browser shall 失敗したファイルの一覧を表示する

### Requirement 5: UI/UX 要件

**Objective:** As a ユーザー, I want 直感的にリネーム操作を行えること, so that 効率的にファイル管理ができる

#### Acceptance Criteria

1. The Media Browser shall ファイル・ディレクトリの右クリックメニューまたはアクションボタンからリネームを実行できる
2. When リネームダイアログが表示される, the Media Browser shall 現在の名前をデフォルト値として入力フィールドに設定する
3. When リネームダイアログが表示される, the Media Browser shall 入力フィールドにフォーカスを設定する
4. The Media Browser shall Enter キーでリネーム確定、Escape キーでキャンセルをサポートする
