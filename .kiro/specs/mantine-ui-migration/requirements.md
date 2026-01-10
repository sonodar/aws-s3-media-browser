# Requirements Document

## Introduction

本仕様は、AWS S3 Photo Browser アプリケーションの UI コンポーネントを Mantine UI ライブラリに移行するための要件を定義する。前回の対応で Mantine UI を導入済みであり、既存のカスタム CSS で実装されたモーダル、ダイアログ、ボタン、フォーム入力、レイアウト等のコンポーネントを Mantine UI のコンポーネントに置き換える。また、一部で使用されている AWS Amplify UI コンポーネントも Mantine UI に統一することで、一貫性のある UI/UX を実現する。

## Requirements

### Requirement 1: モーダル/ダイアログコンポーネントの移行

**Objective:** 開発者として、カスタム実装のダイアログを Mantine Modal に置き換えたい。これによりアクセシビリティ対応とコード保守性を向上させる。

#### 対象コンポーネント

- CreateFolderDialog
- DeleteConfirmDialog
- RenameDialog
- MoveDialog

#### Acceptance Criteria

1. When ユーザーがダイアログを開く操作を行う, the Photo Browser shall Mantine Modal コンポーネントを使用してダイアログを表示する
2. When ユーザーが Escape キーを押す, the Modal shall ダイアログを閉じる（処理中でない場合）
3. When ユーザーがオーバーレイ背景をクリックする, the Modal shall ダイアログを閉じる（処理中でない場合）
4. While ダイアログが表示されている間, the Modal shall フォーカストラップを有効にしてキーボードナビゲーションをダイアログ内に制限する
5. The Modal shall aria-labelledby 属性でタイトルを参照し、スクリーンリーダーに適切なコンテキストを提供する
6. When ダイアログが開く, the Modal shall 適切な要素（キャンセルボタンまたは入力フィールド）にフォーカスを設定する

### Requirement 2: ボタンコンポーネントの移行

**Objective:** 開発者として、カスタム CSS で実装されたボタンを Mantine Button に置き換えたい。これにより視覚的一貫性とアクセシビリティを向上させる。

#### 対象コンポーネント

- ダイアログ内のボタン（キャンセル、送信、削除など）
- Header 内のアイコンボタン

#### Acceptance Criteria

1. The Button shall Mantine Button コンポーネントを使用して一貫したスタイルを適用する
2. When ボタンが disabled 状態の場合, the Button shall 視覚的にも機能的にも無効状態を表示する
3. Where アイコンのみのボタンがある場合, the Button shall ActionIcon コンポーネントを使用してアクセシブルなアイコンボタンを提供する
4. The Button shall variant プロパティを使用して用途に応じたスタイル（default, filled, outline, subtle）を適用する
5. When 削除など危険な操作のボタンである場合, the Button shall color="red" を適用して視覚的に警告を示す

### Requirement 3: フォーム入力コンポーネントの移行

**Objective:** 開発者として、標準の HTML input を Mantine TextInput に置き換えたい。これによりエラー表示とバリデーション UI を統一する。

#### 対象コンポーネント

- CreateFolderDialog のフォルダ名入力
- RenameDialog の新しい名前入力

#### Acceptance Criteria

1. The TextInput shall Mantine TextInput コンポーネントを使用してスタイルを統一する
2. When バリデーションエラーが発生した場合, the TextInput shall error プロパティでエラーメッセージを表示する
3. The TextInput shall label プロパティでアクセシブルなラベルを提供する
4. The TextInput shall placeholder プロパティで入力ヒントを表示する
5. While 処理中の場合, the TextInput shall disabled 状態で入力を無効化する

### Requirement 4: レイアウトコンポーネントの導入

**Objective:** 開発者として、カスタム CSS のレイアウトを Mantine のレイアウトコンポーネントに置き換えたい。これによりレスポンシブ対応と保守性を向上させる。

#### 対象

- ダイアログ内のボタン配置（dialog-actions）
- フォームのレイアウト
- モーダルコンテンツのレイアウト

#### Acceptance Criteria

1. The Layout shall Stack コンポーネントを使用して垂直方向のレイアウトを実現する
2. The Layout shall Group コンポーネントを使用してボタン群の水平配置を実現する
3. The Layout shall gap プロパティで一貫した間隔を適用する
4. The Layout shall justify プロパティでボタンの配置位置（flex-end など）を制御する

### Requirement 5: ファイルリストのグリッドレイアウト移行

**Objective:** 開発者として、カスタム CSS Grid を Mantine SimpleGrid に置き換えたい。これによりレスポンシブ対応とコードの簡素化を実現する。

#### 対象コンポーネント

- FileList（グリッドレイアウト）
- FileListItem（カード風アイテム）

#### Acceptance Criteria

1. The FileList shall Mantine SimpleGrid コンポーネントを使用して 3 列のグリッドレイアウトを実現する
2. The FileList shall SimpleGrid の cols プロパティでレスポンシブな列数調整を可能にする（例: `cols={{ base: 2, sm: 3, md: 4 }}`）
3. The FileListItem shall Mantine Paper または UnstyledButton を使用してカード風のアイテム表示を実現する
4. When アイテムが選択状態の場合, the FileListItem shall スタイルで選択状態を視覚的に示す（背景色、ボーダー）
5. The FileListItem shall Mantine Checkbox を使用して選択モードのチェックボックスを表示する
6. When ファイルがない場合, the FileList shall Mantine Center と Text を使用して空状態メッセージを表示する
7. The FileListItem shall hover と active 状態のスタイルを維持する

### Requirement 6: ソートセレクターの移行

**Objective:** 開発者として、標準 HTML select を Mantine NativeSelect に置き換えたい。これにより UI の一貫性を向上させる。

#### 対象コンポーネント

- SortSelector

#### Acceptance Criteria

1. The SortSelector shall Mantine NativeSelect コンポーネントを使用してソート順の選択 UI を提供する
2. The NativeSelect shall data プロパティでソートオプション（newest, oldest, name, size）を定義する
3. The NativeSelect shall value と onChange で現在の選択状態を制御する
4. The NativeSelect shall aria-label でアクセシブルなラベルを提供する
5. The SortSelector shall カスタム CSS（SortSelector.css）を削除し、Mantine のスタイルを使用する

### Requirement 7: サムネイル画像コンポーネントの移行

**Objective:** 開発者として、カスタム img タグを Mantine Image に置き換えたい。これにより読み込み状態の表示とエラーハンドリングを改善する。

#### 対象コンポーネント

- ThumbnailImage

#### Acceptance Criteria

1. The Image shall Mantine Image コンポーネントを使用して画像を表示する
2. While 画像の読み込み中, the Image shall Skeleton またはローディング状態を表示する
3. If 画像の読み込みに失敗した場合, the Image shall fallbackSrc またはカスタムフォールバック（アイコン）を表示する
4. The Image shall fit プロパティで画像のアスペクト比を制御する
5. The Image shall loading="lazy" で遅延読み込みを適用する

### Requirement 6: 進捗表示コンポーネントの導入

**Objective:** ユーザーとして、ファイル操作の進捗状況を視覚的に確認したい。これにより操作完了までの待機体験を改善する。

#### 対象

- RenameDialog の進捗表示
- MoveDialog の進捗表示

#### Acceptance Criteria

1. While バッチ処理が進行中, the Progress shall Mantine Progress コンポーネントで進捗率を表示する
2. The Progress shall value プロパティで現在の進捗（current/total）を表示する
3. The Progress shall テキストで「X / Y 件処理中...」の情報も併記する

### Requirement 7: エラー・成功メッセージの改善

**Objective:** ユーザーとして、操作結果のフィードバックを明確に受け取りたい。これにより操作の成否を即座に理解できる。

#### 対象

- ダイアログ内のエラーメッセージ表示（インライン）
- 操作成功の通知（トースト形式）

#### Acceptance Criteria

1. If ダイアログ内でエラーが発生した場合, the Component shall Mantine Alert コンポーネントでインラインのエラーメッセージを表示する
2. When ファイル操作（移動等）が成功した場合, the Component shall Mantine Notification コンポーネントで成功メッセージを表示する
3. The Alert/Notification shall icon プロパティで状態に応じたアイコン（CheckCircle, AlertCircle 等）を表示する
4. The Notification shall onClose でユーザーが手動で閉じられる

### Requirement 8: 実装順序の制約

**Objective:** 開発者として、リスクを最小化するために段階的に移行を進めたい。これにより各ステップでの動作確認を容易にし、問題発生時の切り分けを可能にする。

#### 実装順序

1. **見た目のみの変更（レイアウト）**: Stack, Group, SimpleGrid 等のレイアウトコンポーネント導入
2. **シンプルなコンポーネント置き換え**: Button, TextInput, NativeSelect, Checkbox 等の 1:1 置き換え
3. **hooks の対応**: useHotkeys, useClickOutside, useTimeout 等による useEffect 削減
4. **新規要素の追加**: Progress, Alert, Notification 等の機能強化コンポーネント
5. **複雑なコンポーネント（最後）**: ThumbnailImage の Mantine Image 移行（ロジック変更を伴う）

#### Acceptance Criteria

1. The Implementation shall レイアウトコンポーネント（Stack, Group, SimpleGrid）を最初に導入し、既存のロジックに影響を与えない変更から開始する
2. The Implementation shall 各ステップで既存テストがパスすることを確認してから次のステップに進む
3. The Implementation shall ロジック変更を伴うコンポーネント（ThumbnailImage）は最後に対応する
4. The Implementation shall Modal 移行は hooks 対応と同時に行い、useEffect 削減と組み合わせて実施する

### Requirement 9: 既存機能の維持

**Objective:** ユーザーとして、UI 移行後も既存の機能が正常に動作することを期待する。これにより移行によるリグレッションを防止する。

#### Acceptance Criteria

1. The Photo Browser shall 既存のすべての機能（フォルダ作成、削除、リネーム、移動）が移行後も正常に動作する
2. The Photo Browser shall 既存のテストがすべてパスする
3. The Photo Browser shall キーボードナビゲーション（Escape キーでの閉じる等）が維持される
4. The Photo Browser shall モバイルデバイスでのタッチ操作が正常に動作する
5. The Photo Browser shall 処理中状態での操作制限（ボタン無効化、閉じる防止）が維持される

### Requirement 9: Mantine フックによる useEffect 削減

**Objective:** 開発者として、カスタム useEffect を Mantine フックに置き換えたい。これにより宣言的なコードと保守性を向上させる。

#### 対象

- ダイアログの Escape キー検知
- ダイアログの外側クリック検知
- 初期フォーカス設定
- ThumbnailImage の遅延処理

#### Acceptance Criteria

1. When Escape キーが押された場合, the Dialog shall useHotkeys フックを使用してダイアログを閉じる
2. When ダイアログ外をクリックした場合, the Dialog shall useClickOutside フックまたは Modal の closeOnClickOutside を使用してダイアログを閉じる
3. When ダイアログが開く, the Modal shall initialFocus プロパティで初期フォーカス要素を指定する（useEffect による手動フォーカス設定を削除）
4. The Dialog shall useFocusTrap を Modal が内部で処理するため、手動実装を削除する
5. Where 遅延処理が必要な場合, the Component shall useTimeout フックを使用してタイマー管理を宣言的に行う
6. The Component shall useEffect の使用を最小限に抑え、Mantine フックで代替可能な処理は置き換える
