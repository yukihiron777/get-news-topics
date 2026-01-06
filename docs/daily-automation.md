# 日次記事生成・送信の全体像

## 概要
- 取得済みの JSON (`data/YYYY-MM-DD.json` または `data/latest.json`) をもとに、自動で Markdown 記事を生成し、GitHub Dispatch で公開リポジトリに送信する仕組み。
- `scripts/batch-generate-from-daily.ts` が記事ファイルと `data/article-status.json` を更新、`scripts/dispatch-article.ts` が GitHub API を呼び出す。
- `scripts/process-daily.sh` から上記の一連の処理を実行でき、日付指定や `latest` 指定に対応。
- GitHub Actions 側は `create-article` ワークフローでリポジトリを rebase → push し、重複送信を `article-status.json` の `status` 管理で防止。

## コマンド一覧
- `npm run process:daily -- 2026-01-04` : 指定日の JSON を処理して Dispatch まで実行。
- `npm run process:daily -- latest` : `data/latest.json` を対象とする。
- `npm run dispatch:article <slug>` : 単一記事を手動で送信する。

## 必要な環境変数
- `GITHUB_TOKEN` (PAT / repo + workflow)。`.zshrc` などで `export GITHUB_TOKEN=...` を設定済み。

## 手順詳細
1. `scripts/process-daily.sh` を起動すると `docs/process-instructions.txt` を表示し、利用者に確認させる。
2. JSON から記事を生成 (`npx tsx scripts/batch-generate-from-daily.ts`)。
3. `status == drafted` の slug を `npm run dispatch:article` で順次送信。
4. GitHub Action `create-article` が rebase → push まで完了。

## 再送防止ロジック
- `data/article-status.json` に slug ごとの `status` / `queuedAt` / `dispatchedAt` を記録し、`dispatch-article.ts` は `drafted` か `queued` の記事のみを対象にする。
- 既に `dispatched` や `completed` になっている記事は `process-daily` のループから除外され、誤送信を防止する。
- 再送したい場合は該当レコードを `status: drafted` に戻し、`queuedAt` や `dispatchedAt` を消したうえでコマンドを実行すれば良い。

## 補足
- ワークフローは `repository_dispatch` (event_type: `create-article`) で実行されるように構成されており、古い workflow (`receive-article`) は `.disabled` 化。
- `docs/process-instructions.txt` には毎回表示されるメモ（トークン設定・コマンド例）を記載。
