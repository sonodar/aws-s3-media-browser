# Requirements Document - Phase 3

## Introduction

本ドキュメントは、S3 メディアブラウザ Phase 3 の要件を定義する。Phase 2 で Out of Scope とされた「サムネイル自動生成」機能を中心に実装する。

## Background from Previous Phases

### Phase 1

- Amplify Gen2 と Cognito 認証を使用した基本的なメディアブラウザを構築
- StorageBrowser コンポーネントによるファイル操作

### Phase 2

- カスタムファイルブラウザを実装（モバイルファーストUI）
- 画像・動画プレビュー機能を実装
- Out of Scope: サムネイル自動生成（Phase 3 で対応予定）

## Requirements

### Requirement 1: サムネイル自動生成

**Objective:** As a ユーザー, I want 画像・動画をアップロードした際に自動でサムネイルを生成したい, so that ファイル一覧で内容を素早く確認できる

#### Acceptance Criteria

1. When ユーザーが画像ファイル（jpg, png, gif, webp）をアップロードした場合, the メディアブラウザ shall サムネイル画像を自動生成して S3 に保存する
2. When ユーザーが動画ファイル（mp4, webm, mov）をアップロードした場合, the メディアブラウザ shall 動画から代表的なフレームを抽出してサムネイル画像を自動生成し S3 に保存する（黒いフレームが続く場合は最初の非黒フレームを使用）
3. The メディアブラウザ shall サムネイルを `thumbnails/{entity_id}/` パスに保存し、オリジナルファイルと同じアクセス制御を適用する
4. The メディアブラウザ shall サムネイルのサイズを最大 400x400 ピクセルに制限し、アスペクト比を維持する（iPhone 16e で 3 カラム表示時に Retina 対応で鮮明に表示）
5. If サムネイル生成に失敗した場合, the メディアブラウザ shall デフォルトアイコンを表示し、ユーザー操作には影響を与えない

### Requirement 2: ファイル一覧でのサムネイル表示

**Objective:** As a ユーザー, I want ファイル一覧でサムネイルを表示したい, so that ファイルの内容を視覚的に識別できる

#### Acceptance Criteria

1. When ファイル一覧を表示する場合, the メディアブラウザ shall 画像・動画ファイルに対応するサムネイルを表示する
2. While サムネイルを読み込み中の場合, the メディアブラウザ shall プレースホルダーを表示する
3. If サムネイルが存在しない場合, the メディアブラウザ shall ファイルタイプに応じたデフォルトアイコンを表示する
4. The メディアブラウザ shall サムネイル画像を遅延読み込み（Lazy Loading）で表示し、初期表示を高速化する

### Requirement 3: サムネイル管理

**Objective:** As a ユーザー, I want サムネイルがオリジナルファイルと連動して管理されたい, so that 不要なサムネイルが残らない

#### Acceptance Criteria

1. When ユーザーがオリジナルファイルを削除した場合, the メディアブラウザ shall 対応するサムネイルも自動的に削除する
2. When ユーザーがフォルダを削除した場合, the メディアブラウザ shall フォルダ内の全ファイルに対応するサムネイルも削除する
3. The メディアブラウザ shall サムネイルの保存パスをオリジナルファイルのパスと対応付けて管理する

## Technical Constraints

### AWS Lambda を使用したサムネイル生成

サムネイル生成には AWS Lambda を使用する。以下の制約を考慮する：

- Lambda のメモリ: 最小 512MB（画像処理のため）
- Lambda のタイムアウト: 最大 30 秒
- サポート画像形式: jpg, jpeg, png, gif, webp
- サポート動画形式: mp4, webm, mov
- 動画サムネイル生成には FFmpeg Lambda Layer を使用

### ストレージ構造

```
media/
└── {entity_id}/
    ├── photos/
    │   └── image.jpg
    └── videos/
        └── video.mp4

thumbnails/
└── {entity_id}/
    ├── photos/
    │   └── image.jpg.thumb.jpg
    └── videos/
        └── video.mp4.thumb.jpg
```

## Out of Scope

以下の機能は本フェーズの対象外とする：

- サムネイルの手動再生成
- サムネイルサイズのカスタマイズ
- サムネイル品質の調整
- 既存ファイルの一括サムネイル生成（Migration）
- PDF や Office ドキュメントのサムネイル生成
