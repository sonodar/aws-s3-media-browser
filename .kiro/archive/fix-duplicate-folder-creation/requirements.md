# Requirements Document

## Introduction

本ドキュメントは、CreateFolderDialog における同名フォルダ作成の重複チェック機能に関する要件を定義する。現状では同じ名前のフォルダを作成しようとした場合、S3 上では `/` オブジェクトが再生成されるだけで挙動的な問題はないが、不必要な API 呼び出しが発生する。この問題を解決するため、クライアントサイドで同名フォルダの重複を検知し、作成前にエラーとして表示する機能を実装する。

## Requirements

### Requirement 1: 同名フォルダの重複検証

**Objective:** ユーザーとして、既存のフォルダと同じ名前でフォルダを作成しようとした際にエラーメッセージを確認したい。これにより、不要な API 呼び出しを防ぎ、意図しない操作を事前に検知できる。

#### Acceptance Criteria

1. When ユーザーがフォルダ名を入力した際、the CreateFolderDialog shall 入力されたフォルダ名が現在のディレクトリ内の既存フォルダ名と一致するかをリアルタイムで検証する
2. If 入力されたフォルダ名が既存のフォルダ名と完全一致する場合、then the CreateFolderDialog shall エラーメッセージ「同じ名前のフォルダが既に存在します」を表示する
3. While フォルダ名が重複している状態では、the CreateFolderDialog shall 作成ボタンを無効化する
4. When フォルダ名の重複が解消された場合、the CreateFolderDialog shall エラーメッセージを非表示にし、作成ボタンを有効化する

### Requirement 2: クライアントサイド検証の実装

**Objective:** 開発者として、重複チェックをクライアントサイドのみで完結させたい。これにより、追加の API 呼び出しなしで即座にフィードバックを提供できる。

#### Acceptance Criteria

1. The CreateFolderDialog shall 重複チェックにおいてサーバーへの追加リクエストを発行しない
2. The CreateFolderDialog shall 現在のディレクトリのフォルダ一覧（既にキャッシュ済みのデータ）を使用して重複チェックを行う
3. When フォルダ名の比較を行う際、the CreateFolderDialog shall 大文字・小文字を区別して完全一致で比較する

### Requirement 3: 既存のファイル名重複チェックとの一貫性

**Objective:** ユーザーとして、フォルダ作成時の重複チェックがファイルアップロード時の重複チェックと一貫した体験を提供してほしい。

#### Acceptance Criteria

1. The CreateFolderDialog shall 既存のファイル名重複チェック機能と同様のエラー表示パターンを採用する
2. The CreateFolderDialog shall フォルダ名のバリデーション（空文字、無効な文字等）と重複チェックを統合したフォームバリデーションとして実装する
