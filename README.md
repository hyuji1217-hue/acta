# Acta - タスク管理アプリ

## Actaとは

**Acta** は、Google Apps Script（GAS）をバックエンドとして活用した、シンプルで軽量なタスク管理Webアプリです。

- 外部ライブラリ・フレームワーク不使用のピュアHTML/CSS/JavaScript実装
- バックエンドはGoogleスプレッドシート＋GAS Webhookで動作
- インストール不要。ブラウザで `index.html` を開くだけで使用可能

---

## ブラウザで開く手順

### 方法1: index.html をダブルクリック（最速）

1. `frontend/` フォルダを開く
2. `index.html` をダブルクリック
3. ブラウザで自動的に起動します

> ⚠️ ローカルファイル（`file://`）から開いた場合でも、APIはGASのエンドポイントへHTTPSで通信するため正常に動作します。

---

### 方法2: ローカルサーバーを起動する（推奨）

より本番環境に近い動作確認を行う場合は、ローカルサーバーを立ち上げてください。

**Python 3 を使う場合**

```bash
cd /path/to/acta/frontend
python3 -m http.server 8080
```

ブラウザで以下にアクセス：

```
http://localhost:8080
```

**Node.js（npx）を使う場合**

```bash
cd /path/to/acta/frontend
npx serve .
```

---

## 機能一覧

| 機能 | 説明 |
|------|------|
| **タスク追加** | タスク名・プロジェクト・親タスク・メモを入力して新規タスクを登録 |
| **タスク完了** | タスクを完了状態にマーク（`completeTask` API を呼び出し） |
| **タスク未完了に戻す** | 完了済みタスクを未完了状態に戻す（`reopenTask` API を呼び出し） |
| **プロジェクト絞り込み** | プロジェクト名でタスク一覧をフィルタリング表示 |
| **完了済み表示トグル** | 完了済みタスクの表示／非表示を切り替え |

---

## API仕様概要

### エンドポイント

```
https://script.google.com/macros/s/AKfycbwVsuU7epb8f_e-9ydtL-zmZT_9EELl3A8pUwjafoj7h_rskk3_br-2FT9IQp8J8j3s4g/exec
```

### 共通仕様

- **メソッド**: `POST`
- **Content-Type**: `application/json`
- **リクエストボディ**: JSON形式。`action` フィールドで操作を指定する

---

### アクション一覧

#### `listTasks` — タスク一覧取得

タスクの一覧を取得します。

**リクエスト**

```json
{
  "action": "listTasks",
  "project": "プロジェクト名（省略可）",
  "includeCompleted": true
}
```

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `action` | string | ✅ | `"listTasks"` 固定 |
| `project` | string | ➖ | 絞り込むプロジェクト名。省略時は全プロジェクト |
| `includeCompleted` | boolean | ➖ | `true` で完了済みタスクも含める。デフォルト: `false` |

---

#### `addTask` — タスク追加

新しいタスクを登録します。

**リクエスト**

```json
{
  "action": "addTask",
  "task": "タスク名",
  "project": "プロジェクト名（省略可）",
  "parentTask": "親タスク名（省略可）",
  "memo": "メモ（省略可）"
}
```

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `action` | string | ✅ | `"addTask"` 固定 |
| `task` | string | ✅ | 追加するタスク名 |
| `project` | string | ➖ | 所属プロジェクト名 |
| `parentTask` | string | ➖ | 親タスクのタスク名 |
| `memo` | string | ➖ | タスクに付けるメモ |

---

#### `completeTask` — タスク完了

指定したタスクを完了状態にします。

**リクエスト**

```json
{
  "action": "completeTask",
  "task": "タスク名"
}
```

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `action` | string | ✅ | `"completeTask"` 固定 |
| `task` | string | ✅ | 完了にするタスクの**タスク名（文字列）** |

> ⚠️ `task` はタスクIDではなく**タスク名の文字列**を指定してください。

---

#### `reopenTask` — タスクを未完了に戻す

完了済みタスクを未完了状態に戻します。

**リクエスト**

```json
{
  "action": "reopenTask",
  "task": "タスク名"
}
```

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `action` | string | ✅ | `"reopenTask"` 固定 |
| `task` | string | ✅ | 未完了に戻すタスクの**タスク名（文字列）** |

> ⚠️ `task` はタスクIDではなく**タスク名の文字列**を指定してください。

---

### APIリクエスト例（JavaScript）

```javascript
const WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbwVsuU7epb8f_e-9ydtL-zmZT_9EELl3A8pUwjafoj7h_rskk3_br-2FT9IQp8J8j3s4g/exec";

async function callApi(body) {
  const response = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  return await response.json();
}

// タスク一覧取得の例
const tasks = await callApi({
  action: "listTasks",
  includeCompleted: false
});

// タスク追加の例
await callApi({
  action: "addTask",
  task: "README を書く",
  project: "Acta開発"
});
```

---

## 注意事項

### CORSについて

- GAS WebアプリはCORSヘッダーを返しますが、**`no-cors` モードでの fetch は避けてください**。レスポンスが読み取れなくなります。
- `file://` プロトコルからの通信は、ブラウザによってはCORSエラーが発生する場合があります。その場合は[方法2のローカルサーバー起動](#方法2-ローカルサーバーを起動する推奨)を使用してください。
- GASのWebアプリURLには **リダイレクト** が発生することがあります。`fetch` でリダイレクトに対応するため、`redirect: "follow"` オプションの使用を推奨します。

### 外部ライブラリ不使用

- このアプリはVue・React・jQueryなど**外部ライブラリを一切使用していません**。
- 標準のHTML/CSS/JavaScript（ES2017以降）のみで実装されています。
- `index.html` 単体でそのまま動作します。

### GASの制限について

- GAS Webアプリには**1日あたりのリクエスト数制限**があります（無料アカウントの場合）。
- 大量のリクエストを短時間に送ると一時的にAPIが利用不可になる場合があります。
- タスク名は**ユニーク**である必要があります（`completeTask` / `reopenTask` はタスク名で対象を特定するため）。

---

## ファイル構成

```
frontend/
├── index.html       # メインHTML（エントリーポイント）
├── style.css        # スタイルシート（存在する場合）
├── app.js           # メインJavaScript（存在する場合）
└── README.md        # このファイル
```

---

## ライセンス

本プロジェクトは社内利用を目的としています。
