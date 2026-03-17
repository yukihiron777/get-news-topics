# CLAUDE.md

## 外部ドキュメント（np-docs）

運営方針・リポジトリ構成・データフローなどの横断的なドキュメントは `yukihiron777/np-docs` リポジトリで管理している。

### ルール

- 不明点があれば np-docs を参照してから回答する
- このリポジトリの構成・実行方法・ソース設定を変更した場合、np-docs の該当ドキュメントも合わせて更新する
- ソース/サイトの追加・変更時は、まず `np-docs/sources.json`（正規のソース・サイトレジストリ）を更新してから各リポに反映する

### np-docs の参照・更新コマンド

```bash
# ドキュメント一覧を確認
gh api repos/yukihiron777/np-docs/contents/ --jq '.[].name'

# ドキュメントを読む
gh api repos/yukihiron777/np-docs/contents/{ファイル名} --jq '.content' | base64 -d

# ドキュメントを更新（sha はGET時の .sha を使う）
gh api -X PUT repos/yukihiron777/np-docs/contents/{ファイル名} \
  -f message="Update ..." \
  -f content="$(echo -n '...' | base64)" \
  -f sha="..."
```
