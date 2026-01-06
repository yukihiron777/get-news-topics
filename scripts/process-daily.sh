#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "使い方: npm run process:daily -- 2026-01-04 | data/2026-01-04.json | latest" >&2
  exit 1
fi

INPUT="$1"
if [[ "$INPUT" == latest ]]; then
  DAILY_FILE="data/latest.json"
elif [[ "$INPUT" == *.json ]]; then
  DAILY_FILE="$INPUT"
else
  DAILY_FILE="data/$INPUT.json"
fi

if [ ! -f "$DAILY_FILE" ]; then
  echo "対象ファイルが見つかりません: $DAILY_FILE" >&2
  exit 1
fi

DATE_KEY=$(basename "$DAILY_FILE" .json)

if [ -f "docs/process-instructions.txt" ]; then
  cat docs/process-instructions.txt
fi

echo "[process-daily] ${DAILY_FILE} から記事を生成します"
npx tsx scripts/batch-generate-from-daily.ts "$DAILY_FILE"

echo "[process-daily] ${DATE_KEY} の記事をDispatchします"
SLUGS=$(jq -r --arg key "$DATE_KEY" '.[$key][] | select(.status=="drafted") | .slug' data/article-status.json)
if [ -z "$SLUGS" ]; then
  echo "Draft状態の記事はありません"
  exit 0
fi
for slug in $SLUGS; do
  echo "[process-daily] Dispatch: $slug"
  npm run dispatch:article "$slug"
done
