# Requirements Document

## Project Description (Input)

現在ファイルのリネーム時に行っているファイル名の重複チェック、新規アップロード時にも行うようにする

## Introduction

本機能は、AWS S3 Photo Browser のファイルアップロード機能に重複チェックと自動リネームを追加するものです。現在、ファイルリネーム時には同一フォルダ内での重複チェックが実装されていますが、新規アップロード時には重複チェックが行われておらず、既存ファイルが無警告で上書きされる状態です。本機能により、アップロード時に重複を検知し、自動的にファイル名末尾に連番（例: `photo (1).jpg`）を付与することで、意図しないファイル上書きを防止します。

## Requirements

### Requirement 1: アップロード時重複検知

**Objective:** ユーザーとして、アップロード時に既存ファイルとの重複を自動検知してもらいたい。意図しないファイル上書きを防止するため。

#### Acceptance Criteria

1. When ユーザーがファイルをアップロードした, the Media Browser shall アップロード先フォルダ内の既存ファイル一覧と選択ファイル名を比較する
2. The Media Browser shall 複数ファイル同時アップロード時も各ファイルについて重複チェックを実行する
3. The Media Browser shall ファイル名の完全一致で重複を判定する（大文字小文字を区別）

### Requirement 2: 重複時の自動リネーム

**Objective:** ユーザーとして、重複が検出された場合に自動でリネームしてほしい。手動操作なしでアップロードを完了するため。

#### Acceptance Criteria

1. When 重複するファイル名が検出された, the Media Browser shall ファイル名末尾に連番を付与した新しいファイル名を生成する
2. The Media Browser shall `ファイル名 (1).拡張子` の形式で連番を付与する（例: `photo.jpg` → `photo (1).jpg`）
3. When 連番付きファイル名も既に存在する, the Media Browser shall 次の連番を使用する（例: `photo (1).jpg` が存在する場合は `photo (2).jpg`）
4. The Media Browser shall 重複がなくなるまで連番を増加させる
5. The Media Browser shall 生成されたファイル名が既存のバリデーションルール（長さ制限100文字）を満たすことを確認する

### Requirement 3: アップロード処理フロー

**Objective:** ユーザーとして、重複チェックと自動リネーム後のアップロード処理がシームレスに行われてほしい。効率的なファイル管理のため。

#### Acceptance Criteria

1. When 重複チェックと自動リネームが完了した, the Media Browser shall 決定したファイル名でアップロード処理を実行する
2. While アップロード処理中, the Media Browser shall 進捗状況を表示する
3. When アップロードが完了した, the Media Browser shall ファイル一覧を更新する
4. If アップロードに失敗したファイルがある, the Media Browser shall 失敗したファイルとエラー理由を表示する

### Requirement 4: 重複なし時の動作

**Objective:** ユーザーとして、重複がない場合は追加処理なくアップロードが行われてほしい。通常操作の効率を維持するため。

#### Acceptance Criteria

1. When アップロード対象ファイルに重複がない, the Media Browser shall 元のファイル名のままアップロードを実行する
2. The Media Browser shall 既存のアップロード操作（ドラッグ&ドロップ、ファイル選択）のユーザー体験を変更しない
