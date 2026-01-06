# Requirements Document

## Project Description (Input)

リロードしたときにトップディレクトリに戻ってしまうので、SPA だけどルーターがほしい。

## Introduction

本仕様は、AWS S3 Photo Browser における SPA ルーター機能の要件を定義します。
現状、ページリロード時にユーザーが閲覧していたフォルダ位置がリセットされトップディレクトリに戻ってしまう問題があります。
この機能により、URL とフォルダパスを同期させ、リロードやブラウザナビゲーションでも状態を保持できるようにします。

## Requirements

### Requirement 1: URL パス同期

**Objective:** ユーザーとして、現在閲覧中のフォルダパスが URL に反映されることで、ページリロード後も同じ場所に戻れるようにしたい

#### Acceptance Criteria

1. When ユーザーがフォルダをクリックしてナビゲートした時, the MediaBrowser shall ブラウザの URL を現在のフォルダパスを反映した形式に更新する
2. When ページがリロードされた時, the MediaBrowser shall URL に含まれるパス情報を解析し、該当するフォルダを表示する
3. While フォルダ内を閲覧している間, the MediaBrowser shall URL が現在のフォルダパスと常に同期した状態を維持する
4. When ユーザーがルートディレクトリに戻った時, the MediaBrowser shall URL をベースパス（パスパラメータなし）にリセットする

### Requirement 2: ブラウザナビゲーション対応

**Objective:** ユーザーとして、ブラウザの戻る・進むボタンでフォルダ間を移動できるようにしたい

#### Acceptance Criteria

1. When ユーザーがブラウザの戻るボタンをクリックした時, the MediaBrowser shall 直前に閲覧していたフォルダを表示する
2. When ユーザーがブラウザの進むボタンをクリックした時, the MediaBrowser shall 「戻る」で離れたフォルダに再度移動する
3. When ブラウザ履歴による移動が発生した時, the MediaBrowser shall UI の現在パス表示（パンくずリスト等）を URL と同期させる

### Requirement 3: URL 設計

**Objective:** 開発者として、直感的で保守しやすい URL 構造を持つことで、将来の拡張に対応したい

#### Acceptance Criteria

1. The MediaBrowser shall フォルダパスを URL のクエリパラメータまたはパスセグメントとしてエンコードする
2. The MediaBrowser shall URL エンコーディングにより日本語フォルダ名を含むパスを正しく処理する
3. The MediaBrowser shall AWS S3 のオブジェクトキー形式（スラッシュ区切り）と互換性のある URL 構造を採用する
4. If URL に不正なエンコーディングが含まれる場合, the MediaBrowser shall デコードエラーを適切にハンドリングしルートにフォールバックする
