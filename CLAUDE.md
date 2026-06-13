# Acta 開発ルール

## ステータス変更時のルール

アプリのステータスを **「運用中」に変更したとき**、以下を自動実行する：

1. Supabaseのパトロールプロジェクト（ID: `8dd1cbf1-84da-4861-91a2-2620615e2b70`）を確認
2. 同名のパトロールタスクが存在しなければ新規作成する
   - タイトル: `[アプリ名]パトロール：UIバグ・表示崩れチェック`
   - 担当: `ai:cowork`
   - 繰り返し: 毎日（memoに `\n__ACTA_META__:{"r":{"type":"daily","n":1}}` を設定）
   - due_date: 翌日

## アプリ開発完了時のルール

アプリ開発が完了したら、以下を実施する：

1. `fastlane/Fastfile` を作成する（テンプレートは `/Users/yuji/Desktop/Claude用/setup-fastlane-all.sh` を参照）
2. `fastlane/metadata/ja/` にメタデータ（name・subtitle・description・keywords）を記入する

これにより次回申請時は `fastlane release` 1コマンドで完結する。

## Supabase情報

- URL: `https://obrqzdioqaayevtbyihu.supabase.co`
- Service Key: `.env` ファイルに記載
- パトロールプロジェクトID: `8dd1cbf1-84da-4861-91a2-2620615e2b70`
- プロダクトログプロジェクトID: `49a5b821-0345-4f2b-84ef-8cfb9a01c54e`
