# Requirements Document

## Project Description (Input)

ファイルの並び順を新しい順、古い順、名前の昇順、名前の降順で選択できるようにする。現在の並び順は cookie とかに保持しておく。デフォルトは新しい順。

## Introduction

本機能は、AWS S3 Photo Browser のメディアブラウザにファイル・フォルダの並び替え機能を追加します。ユーザーは複数のソート順から選択でき、選択した設定は永続化されて次回アクセス時にも維持されます。これにより、大量のメディアファイルの中から目的のファイルを効率的に見つけることができます。

## Requirements

### Requirement 1: ソート順の選択

**Objective:** ユーザーとして、ファイル・フォルダの並び順を選択したい。これにより、目的のファイルを素早く見つけることができる。

#### Acceptance Criteria

1. When ユーザーがソート順セレクタをクリックした時, the MediaBrowser shall ソートオプションのドロップダウンを表示する
2. The MediaBrowser shall 以下の4つのソートオプションを提供する: 新しい順（日時降順）、古い順（日時昇順）、名前順（A→Z）、サイズ順（大きい順）
3. When ユーザーがソートオプションを選択した時, the MediaBrowser shall 選択したソート順でファイル・フォルダ一覧を即座に再並び替えする
4. The MediaBrowser shall 現在選択されているソート順をUIに明示的に表示する

### Requirement 2: ソート設定の永続化

**Objective:** ユーザーとして、選択したソート順を次回アクセス時にも維持したい。これにより、毎回ソート順を選び直す手間を省くことができる。

#### Acceptance Criteria

1. When ユーザーがソート順を変更した時, the MediaBrowser shall 選択したソート順をブラウザのローカルストレージまたはCookieに保存する
2. When ユーザーがアプリケーションにアクセスした時, the MediaBrowser shall 保存されたソート順を読み込み適用する
3. If 保存されたソート順が存在しない場合, then the MediaBrowser shall デフォルトとして「新しい順（日時降順）」を適用する
4. The MediaBrowser shall ソート設定をユーザーのブラウザに少なくとも30日間保持する

### Requirement 3: ソート適用ルール

**Objective:** ユーザーとして、フォルダとファイルが適切にソートされた状態で表示されたい。これにより、階層構造を維持しながら目的のアイテムを見つけやすくなる。

#### Acceptance Criteria

1. The MediaBrowser shall フォルダを常にファイルより先に表示する（フォルダ優先表示）
2. The MediaBrowser shall フォルダ群とファイル群のそれぞれに対して選択されたソート順を適用する
3. When 名前でソートする場合, the MediaBrowser shall ロケール対応の自然順ソート（数字を正しく扱う）を適用する
4. When 日時でソートする場合, the MediaBrowser shall ファイルの最終更新日時を基準とする
5. When サイズでソートする場合, the MediaBrowser shall ファイルサイズ（バイト数）を基準とし大きい順に表示する

### Requirement 4: UIアクセシビリティ

**Objective:** ユーザーとして、ソート機能に簡単にアクセスしたい。これにより、操作性が向上する。

#### Acceptance Criteria

1. The MediaBrowser shall ソート選択UIをファイル一覧の上部に配置する
2. The MediaBrowser shall ソート選択UIをキーボード操作可能にする
3. The MediaBrowser shall 適切なARIAラベルを提供しスクリーンリーダーに対応する
