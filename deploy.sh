#!/bin/bash
# Actaのfrontendをrootに同期してpushする
# 使い方: ./deploy.sh "コミットメッセージ"

set -e
cd "$(dirname "$0")"

MSG="${1:-sync: フロントエンド更新}"

cp frontend/index.html index.html
[ -f frontend/sw.js ]       && cp frontend/sw.js sw.js
[ -f frontend/manifest.json ] && cp frontend/manifest.json manifest.json

git add index.html sw.js manifest.json
git commit -m "$MSG"
git push origin main

echo "✅ Vercelへのデプロイ開始。1〜2分でスマホに反映されます。"
