# Development Rules

## タスク管理（必須）

**TodoWrite ツールを必ず使用する**。タスクの進捗を可視化し、検証ステップの漏れを防ぐ。

### 使用ルール

1. **作業開始時**: tasks.md のサブタスクを TodoWrite に登録
2. **検証を独立項目に**: 各サブタスクの後に `npm run check` を独立した todo として追加
3. **リアルタイム更新**: 完了したら即座に `completed` に更新（バッチ更新禁止）
4. **セッション継続時**: 前回の todo 状態を確認し、必要に応じて再登録

### 登録例

```
- [ ] Task 2.1: identityIdAtom の実装
- [ ] npm run check（Task 2.1）  ← 検証を独立項目に
- [ ] Task 2.2: useIdentityId の置き換え
- [ ] npm run check（Task 2.2）
- [ ] npm run check-all（Task 2 完了時）  ← タスク完了時は check-all
```

## 検証コマンド（必須）

実装時は以下のコマンドで検証すること。`npm run test` 単体での確認は不十分（TypeScript エラーを検出しない）。

| タイミング       | コマンド            | 内容                         |
| ---------------- | ------------------- | ---------------------------- |
| サブタスク完了時 | `npm run check`     | typecheck + lint + test 並列 |
| タスク完了時     | `npm run check-all` | check + format + build       |

### 理由

- `npm run test`（vitest）は esbuild でトランスパイルするため、TypeScript の型エラーを検出しない
- `npm run check` は `tsc --noEmit` を含むため、型エラーを確実に検出する

## セッション継続時の注意

コンテキスト継続（compaction 後）時は、前回セッションのパターンを引き継がず、必ず以下を確認すること：

1. tasks.md の「実装ルール」セクションを再読
2. 上記の検証コマンドを確実に実行
3. 前回セッションで `npm run test` のみ実行していた場合でも、`npm run check` に切り替える

---

_This document ensures consistent quality gates across all implementation sessions_
