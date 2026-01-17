# Research & Design Decisions

## Summary

- **Feature**: `automated-dependency-updates`
- **Discovery Scope**: Simple Addition（設定ファイル追加のみ、コード変更なし）
- **Key Findings**:
  - Renovate が Dependabot より優れた選択肢（グループ化、`.tool-versions` サポート、自動マージ機能）
  - Dependabot は `.tool-versions` を公式サポートしていない
  - Renovate GitHub App は無料で利用可能、設定はリポジトリ内の JSON ファイルで管理

## Research Log

### Renovate vs Dependabot 比較

- **Context**: 要件を満たす最適なツールの選定
- **Sources Consulted**:
  - [Renovate Bot Comparison](https://docs.renovatebot.com/bot-comparison/)
  - [TurboStarter Blog: Renovate vs Dependabot](https://www.turbostarter.dev/blog/renovate-vs-dependabot-whats-the-best-tool-to-automate-your-dependency-updates)
  - [PullNotifier Blog: Comparison](https://blog.pullnotifier.com/blog/dependabot-vs-renovate-dependency-update-tools)
- **Findings**:
  | 機能 | Renovate | Dependabot |
  |------|----------|------------|
  | パッケージマネージャー | 90+ | 14 |
  | プラットフォーム | GitHub/GitLab/Bitbucket/Azure | GitHub/Azure のみ |
  | グループ化 | 組み込み（コミュニティ提供） | 手動設定必須 |
  | `.tool-versions` | ネイティブサポート | 非対応 |
  | 自動マージ | 柔軟な設定 | 限定的 |
  | Dependency Dashboard | あり | なし |
  | セットアップ | 設定ファイル必要 | GitHub UI から即時有効化 |
- **Implications**: Renovate が要件 7（Node.js バージョン管理）を満たす唯一の選択肢

### Renovate asdf Manager

- **Context**: 要件 7 の `.tool-versions` ファイル監視機能の確認
- **Sources Consulted**:
  - [Renovate asdf Manager Documentation](https://docs.renovatebot.com/modules/manager/asdf/)
  - [kachick/renovate-config-asdf](https://github.com/kachick/renovate-config-asdf)
  - [GitHub Issue: Support ASDF versions file](https://github.com/renovatebot/renovate/issues/9759)
- **Findings**:
  - デフォルトで `/(^|/)\.tool-versions$/` パターンを検出
  - node-version データソースをネイティブサポート
  - 最初のバージョンエントリのみ管理（フォールバックバージョンは対象外）
  - 追加ツールサポートには `kachick/renovate-config-asdf` プリセット拡張が利用可能
- **Implications**: Node.js 22.21.1 のアップデートを自動検出可能

### Dependabot の .tool-versions サポート状況

- **Context**: Dependabot が要件 7 を満たせるか確認
- **Sources Consulted**:
  - [GitHub Issue: support asdf version manager](https://github.com/dependabot/dependabot-core/issues/1033)
  - [asdf-vm/actions](https://github.com/asdf-vm/actions)
- **Findings**:
  - Dependabot は `.tool-versions` を公式サポートしていない
  - 新しいエコシステムの追加は現在受け付けていない
  - ワークアラウンドとして GitHub Actions で asdf コマンドを使用する方法があるが複雑
- **Implications**: Dependabot では要件 7 を満たせない

### Renovate 自動マージ設定

- **Context**: 要件 5 の自動マージ機能の設定方法
- **Sources Consulted**:
  - [Renovate Automerge Documentation](https://docs.renovatebot.com/key-concepts/automerge/)
  - [Renovate Configuration Options](https://docs.renovatebot.com/configuration-options/)
- **Findings**:
  - `matchDepTypes: ["devDependencies"]` で開発依存のみを対象にできる
  - `matchUpdateTypes: ["patch"]` でパッチアップデートのみに限定可能
  - `automergeType: "branch"` で PR を作成せずにブランチマージ（ノイズ軽減）
  - CI テスト通過が自動マージの前提条件（`ignoreTests: true` でオーバーライド可能）
  - Branch protection rules で Renovate をバイパス対象に設定する必要あり
- **Implications**: 要件 5 の全ての受け入れ基準を満たせる

### Renovate パッケージグループ化

- **Context**: 要件 4 のグループ化設定方法
- **Sources Consulted**:
  - [Renovate Package Rules Guide](https://docs.mend.io/wsk/renovate-package-rules-guide)
  - [Renovate FAQ](https://docs.renovatebot.com/faq/)
- **Findings**:
  - `matchPackagePatterns` と `groupName` でパッケージをグループ化
  - `config:recommended` プリセットに多くの組み込みグループあり
  - 複数ルールがマッチした場合、後のルールが優先
- **Implications**: `@aws-amplify/*`, `@tanstack/*`, `@mantine/*` のグループ化が簡単に設定可能

## Architecture Pattern Evaluation

| Option               | Description                     | Strengths                        | Risks / Limitations                       | Notes               |
| -------------------- | ------------------------------- | -------------------------------- | ----------------------------------------- | ------------------- |
| Renovate GitHub App  | Mend 提供のホスティングサービス | セットアップ不要、無料、自動更新 | 外部サービス依存                          | 推奨                |
| Renovate Self-hosted | GitHub Actions で実行           | 完全な制御                       | 設定・メンテナンスコスト                  | 不要                |
| Dependabot           | GitHub ネイティブ               | 即時有効化                       | `.tool-versions` 非対応、グループ化限定的 | 要件 7 を満たせない |

## Design Decisions

### Decision: Renovate を選択

- **Context**: 依存関係自動アップデートツールの選定
- **Alternatives Considered**:
  1. Dependabot — GitHub ネイティブ、セットアップ簡単
  2. Renovate GitHub App — 高機能、柔軟な設定
  3. 両方併用 — 役割分担
- **Selected Approach**: Renovate GitHub App を単独使用
- **Rationale**:
  - 要件 7（`.tool-versions` サポート）を満たす唯一のツール
  - 要件 4（グループ化）の組み込みサポート
  - 要件 5（自動マージ）の柔軟な設定
  - Dependabot との併用は複雑さが増すだけでメリットなし
- **Trade-offs**:
  - ✅ 全要件を単一ツールで実現
  - ✅ 設定ファイルでの一元管理
  - ⚠️ Dependabot より初期設定が複雑
  - ⚠️ 外部サービス（Mend）への依存
- **Follow-up**: GitHub App のインストールとリポジトリアクセス許可の確認

### Decision: 設定ファイルの配置場所

- **Context**: Renovate 設定ファイルの配置場所
- **Alternatives Considered**:
  1. `renovate.json` — ルートディレクトリ
  2. `.github/renovate.json` — GitHub 設定と統合
  3. `package.json` の `renovate` キー — 既存ファイル利用
- **Selected Approach**: `renovate.json` をルートディレクトリに配置
- **Rationale**:
  - 最も一般的で発見しやすい場所
  - Renovate のデフォルト検索パス
  - 独立したファイルで管理が容易
- **Trade-offs**:
  - ✅ 標準的な配置
  - ✅ 他の設定と分離
  - ⚠️ ルートディレクトリのファイル数が増加

## Risks & Mitigations

- **Renovate GitHub App の可用性** — Mend のサービス障害時はアップデートが停止。許容可能なリスク（クリティカルな機能ではない）
- **過剰な PR 作成** — 週次スケジュールとグループ化で軽減
- **自動マージによる破壊的変更** — devDependencies のパッチのみに限定、CI テスト通過必須
- **Branch protection rules との競合** — Renovate を bypass 対象に追加する必要あり

## References

- [Renovate Documentation](https://docs.renovatebot.com/) — 公式ドキュメント
- [Renovate Bot Comparison](https://docs.renovatebot.com/bot-comparison/) — Dependabot との比較
- [Renovate asdf Manager](https://docs.renovatebot.com/modules/manager/asdf/) — `.tool-versions` サポート
- [Renovate Automerge](https://docs.renovatebot.com/key-concepts/automerge/) — 自動マージ設定
- [Renovate Configuration Options](https://docs.renovatebot.com/configuration-options/) — 設定リファレンス
- [GitHub Issue: Dependabot asdf support](https://github.com/dependabot/dependabot-core/issues/1033) — Dependabot の `.tool-versions` 非対応
