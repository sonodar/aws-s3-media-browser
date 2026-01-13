# Implementation Plan

> **重要: 実装ルール**
>
> - サブタスク完了時は必ず `npm run check` を行うこと（npm run check: typecheck, lint, test の並列実行）
> - タスク（サブタスクではなくタスク）完了時は必ず `npm run check-all` を行うこと (check-all: check + format + build)
> - 各タスク完了後は必ずユーザーに報告し、次のタスクに進む前に明示的な指示を待つこと
> - 差分確認のため、ユーザーの許可なく次のタスクを自動的に開始しないこと
> - タスク完了時は変更点のサマリーを提示すること

## Task 1: Suspense 対応基盤の構築

- [ ] 1.1 ErrorBoundary の導入
  - react-error-boundary パッケージをインストール
  - FallbackComponent でカスタムエラー UI を定義（Mantine Alert + Button）
  - resetKeys または onReset でエラー状態リセットを実装
  - _Requirements: 1.8_

- [ ] 1.2 アプリケーションルートへの Suspense 境界配置
  - App コンポーネントに ErrorBoundary + Suspense でラップする構造を追加
  - Suspense fallback にローディング UI（Mantine Loader）を配置
  - Provider 階層: MantineProvider > JotaiProvider > Authenticator.Provider > ErrorBoundary > Suspense
  - _Requirements: 1.1, 1.7_

- [ ] 1.3 DevTools の本番ビルド除外設定
  - jotai-devtools が本番ビルドに含まれないことを確認
  - 開発環境でのみ Redux DevTools 連携が有効であることを確認
  - _Requirements: 1.4, 1.5_

## Task 2: 認証状態の Suspense 対応 atom 化

- [ ] 2.1 identityIdAtom の実装
  - fetchAuthSession() で Identity ID を取得する async 派生 atom を作成
  - debugLabel を設定し DevTools で追跡可能にする
  - Promise キャッシュにより同一セッション内での再計算を回避
  - _Requirements: 2.1, 2.2_

- [ ] 2.2 useIdentityId フックの置換
  - 既存の useIdentityId フックを identityIdAtom + useAtomValue に置換
  - useState + useEffect パターンを削除
  - 呼び出し元コンポーネントの更新（loading/error 状態の手動管理を削除）
  - _Requirements: 2.3, 2.4, 1.2, 1.3, 1.6_

## Task 3: パスキー管理の Suspense 対応 atom 化

- [ ] 3.1 credentialsAtom の実装
  - WebAuthn クレデンシャル一覧を取得する async 派生 atom を作成
  - ページネーション処理で全件取得
  - refreshCredentialsAtom による再取得トリガー機構を実装
  - _Requirements: 6.1_

- [ ] 3.2 passkeyOperationsAtom の実装
  - パスキー登録用の registerPasskeyAtom（writable atom）を作成
  - パスキー削除用の deletePasskeyAtom（writable atom）を作成
  - 各操作成功時に refreshCredentialsAtom を更新して一覧を再取得
  - _Requirements: 6.2, 6.3_

- [ ] 3.3 usePasskey フックの置換
  - 既存の usePasskey フックを passkey atoms + useAtomValue/useSetAtom に置換
  - useState + useEffect パターンを削除
  - PasskeySettings コンポーネントの更新
  - _Requirements: 6.4, 7.10_

---

## 🚧 Checkpoint: Auth 系実装の動作確認

> **⚠️ ユーザー確認必須**
>
> Storage 系の実装（Task 5 以降）に進む前に、以下の動作確認を実施してください。
> ユーザーの明示的な承認がない限り、Task 5 以降に着手してはいけません。

### 確認手順

#### 4.1 正常系の動作確認

- [ ] 開発サーバーを起動し、ログイン後にファイル一覧が表示されることを確認
- [ ] パスキー設定画面でクレデンシャル一覧が表示されることを確認
- [ ] Redux DevTools で identity/id, passkey/credentials の atom 状態が追跡できることを確認

#### 4.2 ErrorBoundary の動作確認（オフラインエミュレーション）

- [ ] ログイン後、メイン画面が表示された状態で Chrome DevTools > Network タブ > 「Offline」をチェック
- [ ] パスキー設定画面を開き、クレデンシャル一覧取得時に ErrorBoundary のエラー UI が表示されることを確認
- [ ] 「再試行」ボタンをクリックしてエラー状態がリセットされることを確認
- [ ] 「Offline」のチェックを外し、「再試行」後に正常復帰することを確認

#### 4.3 Suspense fallback の動作確認

- [ ] Chrome DevTools > Network タブ > 「Slow 3G」を選択
- [ ] パスキー設定画面を開き、Suspense fallback（ローディング UI）が表示されることを確認
- [ ] データ取得完了後にクレデンシャル一覧が表示されることを確認

### 確認完了後

上記すべての確認が完了したら、ユーザーは以下を実行してください：

1. 確認結果を報告（問題があれば詳細を共有）
2. 問題なければ「Storage 系の実装を開始してください」と指示

---

## Task 5: ストレージ一覧取得の Suspense 対応 atom 化

- [ ] 5.1 itemsAtom の実装
  - identityIdAtom と currentPathAtom に依存する async 派生 atom を作成
  - S3 からファイル/フォルダ一覧を取得し StorageItem 配列に変換
  - refreshItemsAtom による再取得トリガー機構を実装
  - _Requirements: 3.1, 3.2_

- [ ] 5.2 useStorageOperations の Read 部分置換
  - fetchItems 関数を itemsAtom + useAtomValue に置換
  - ファイル一覧取得の useState + useEffect パターンを削除
  - Write 操作（Upload/Delete/Move/Rename/CreateFolder）は既存のまま維持
  - MediaBrowser コンポーネントの更新（loading 状態の手動管理を削除）
  - _Requirements: 3.3, 7.1_

## Task 6: フォルダ選択の Suspense 対応 atom 化

- [ ] 6.1 (P) folderListAtom の実装
  - moveDialogPathAtom（選択中のパス）を作成
  - identityIdAtom と moveDialogPathAtom に依存する async 派生 atom を作成
  - フォルダのみをフィルタリングして返す
  - _Requirements: 4.1, 4.2_

- [ ] 6.2 (P) FolderBrowser コンポーネントの置換
  - useEffect + useState パターンを folderListAtom + useAtomValue に置換
  - Suspense fallback でローディング状態を表示
  - MoveDialog を開いたときに moveDialogPathAtom を初期化
  - _Requirements: 4.3, 4.4, 7.4_

## Task 7: プレビュー URL の Suspense 対応 atom 化

- [ ] 7.1 (P) previewSlidesAtom の実装
  - previewItemsAtom, previewIndexAtom, isPreviewOpenAtom を作成
  - プレビュー対象アイテムの署名付き URL を取得する async 派生 atom を作成
  - Lightbox 用の Slide 配列を返す
  - _Requirements: 5.1, 5.2_

- [ ] 7.2 (P) PreviewModal コンポーネントの置換
  - useEffect + useState パターンを previewSlidesAtom + useAtomValue に置換
  - Suspense fallback でローディング状態を表示
  - モーダルを開いたときに previewItemsAtom を設定
  - _Requirements: 5.3, 5.4, 7.6_

## Task 8: 既存機能の互換性検証

- [ ] 8.1 ファイル操作機能の動作確認
  - ファイル/フォルダの一覧表示が正常に動作することを確認
  - アップロード機能（重複チェック含む）が正常に動作することを確認
  - 選択・複数選択・一括削除機能が正常に動作することを確認
  - 移動・リネーム・ダウンロード機能が正常に動作することを確認
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ] 8.2 表示・ナビゲーション機能の動作確認
  - サムネイル表示機能が正常に動作することを確認
  - Lightbox によるメディアプレビュー機能が正常に動作することを確認
  - URL 同期によるフォルダナビゲーション機能が正常に動作することを確認
  - ソート機能（設定永続化含む）が正常に動作することを確認
  - _Requirements: 7.5, 7.6, 7.7, 7.8_

- [ ] 8.3 その他機能の動作確認
  - ジェスチャー操作（長押し、スワイプ）が正常に動作することを確認
  - パスキー管理機能が正常に動作することを確認
  - _Requirements: 7.9, 7.10_
