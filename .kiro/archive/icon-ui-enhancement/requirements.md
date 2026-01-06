# Requirements Document

## Introduction

本機能は、AWS S3 Photo Browser アプリケーションにおいて、現在絵文字（📁、🖼️、🎬、📄、⬆️、←など）で表現されているUIアイコンを、専用のアイコンライブラリに置き換えることで、視認性・一貫性・アクセシビリティを向上させる。アイコンライブラリの選定はプロジェクトの技術スタック（React 19、TypeScript、Vite）との親和性を考慮してAIが決定する。また、ファイル/フォルダごとのアクション（リネーム、削除）を3点リーダーメニューに集約し、UIをすっきりさせる。

## Requirements

### Requirement 1: アイコンライブラリの導入

**Objective:** As a 開発者, I want プロジェクトにアイコンライブラリを導入したい, so that 一貫性のあるアイコンセットを使用できる

#### Acceptance Criteria

1. The Photo Browser shall use a single, consistent icon library across all UI components
2. The icon library shall support TypeScript with proper type definitions
3. The icon library shall be compatible with React 19 and Vite build system
4. The icon library shall provide tree-shaking support for minimal bundle size impact

### Requirement 2: ファイルアイコンの置き換え

**Objective:** As a ユーザー, I want ファイルタイプに応じた明確なアイコンを見たい, so that ファイルの種類を直感的に識別できる

#### Acceptance Criteria

1. When フォルダアイテムが表示される, the FileList component shall display a folder icon instead of 📁 emoji
2. When 画像ファイルが表示される, the FileList component shall display an image icon instead of 🖼️ emoji
3. When 動画ファイルが表示される, the FileList component shall display a video icon instead of 🎬 emoji
4. When その他のファイルが表示される, the FileList component shall display a file icon instead of 📄 emoji
5. The file icons shall have consistent sizing and alignment within the file list
6. The file type detection shall use S3 contentType (MIME type) from ListOutputItem as the primary method, with file extension as fallback

### Requirement 3: アクションボタンアイコンの置き換え

**Objective:** As a ユーザー, I want アクションボタンに明確なアイコンを見たい, so that 操作内容を直感的に理解できる

#### Acceptance Criteria

1. When フォルダ作成ボタンが表示される, the FileActions component shall display a folder-plus icon instead of 📁+ text
2. When アップロードボタンが表示される, the FileActions component shall display an upload icon instead of ⬆️ emoji
3. When モーダルの閉じるボタンが表示される, the component shall display an X icon instead of ✕ character
4. The action button icons shall be appropriately sized for touch targets (minimum 44x44px hit area)

### Requirement 4: ナビゲーションアイコンの置き換え

**Objective:** As a ユーザー, I want ナビゲーション要素に標準的なアイコンを見たい, so that 操作方法を直感的に理解できる

#### Acceptance Criteria

1. When 戻るボタンが表示される, the Header component shall display an arrow-left icon instead of ← character
2. When 選択モード時の削除ボタンが表示される, the Header component shall display a trash icon only (no visible text) with aria-label="削除"
3. When キャンセルボタンが表示される, the Header component shall display an X or cancel icon only (no visible text) with aria-label="キャンセル"
4. When 選択モードボタンが表示される, the Header component shall display a checkbox-list icon only (no visible text) with aria-label="選択"
5. When 全選択/全解除ボタンが表示される, the Header component shall display appropriate icons only (no visible text) with aria-label for each state
6. [WANT] The select-all control should be implemented as a checkbox with three states: unchecked (none selected), checked (all selected), and indeterminate (partial selection)

### Requirement 5: ハンバーガーメニューの導入

**Objective:** As a ユーザー, I want 使用頻度の低い機能をメニューにまとめたい, so that ヘッダーがすっきりして主要な操作に集中できる

#### Acceptance Criteria

1. The Header component shall display a hamburger menu icon (three horizontal lines) with aria-label="メニュー"
2. When ハンバーガーメニューアイコンがクリックされる, the Header component shall display a dropdown menu
3. The dropdown menu shall contain "設定" item with settings/gear icon and text label
4. The dropdown menu shall contain "サインアウト" item with sign-out icon and text label
5. When メニュー外の領域がクリックされる, the dropdown menu shall close
6. When Escapeキーが押される, the dropdown menu shall close
7. The dropdown menu shall support keyboard navigation (Tab, Enter, Escape)

### Requirement 6: アクセシビリティ対応

**Objective:** As a スクリーンリーダーユーザー, I want アイコンに適切な代替テキストが設定されていてほしい, so that アイコンの意味を理解できる

#### Acceptance Criteria

1. The Photo Browser shall include appropriate aria-label or aria-hidden attributes on all icons
2. When アイコンが装飾目的のみで使用される, the icon shall have aria-hidden="true" attribute
3. When アイコンが意味を伝える場合, the icon shall have descriptive aria-label attribute
4. The icon styling shall respect user's prefers-reduced-motion setting

### Requirement 7: 既存テストの維持

**Objective:** As a 開発者, I want アイコン導入後も既存のテストが通るようにしたい, so that 回帰バグを防止できる

#### Acceptance Criteria

1. When アイコンコンポーネントがレンダリングされる, the existing component tests shall pass without modification to test assertions
2. The icon elements shall be queryable by role or aria-label for testing purposes
3. If test selectors need updating, the changes shall maintain test coverage for the same functionality

### Requirement 8: ファイルアクションメニューの導入

**Objective:** As a ユーザー, I want ファイル/フォルダごとのアクションをコンパクトなメニューから実行したい, so that UIがすっきりして操作しやすくなる

#### Acceptance Criteria

1. When ファイルまたはフォルダアイテムが表示される, the FileList component shall display a horizontal three-dot icon (more options) with aria-label="その他のアクション"
2. When 3点リーダーアイコンがクリックされる, the FileList component shall display a dropdown action menu
3. The dropdown action menu shall contain "リネーム" item with edit/pencil icon and text label
4. The dropdown action menu shall contain "削除" item with trash icon and text label
5. When メニュー外の領域がクリックされる, the dropdown action menu shall close
6. When Escapeキーが押される, the dropdown action menu shall close
7. The dropdown action menu shall support keyboard navigation (Tab, Enter, Escape)
8. When リネームがクリックされる, the FileList component shall trigger the rename action for the target item
9. When 削除がクリックされる, the FileList component shall trigger the delete action for the target item
