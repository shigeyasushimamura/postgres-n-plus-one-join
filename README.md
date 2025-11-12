# PostgreSQL N+1 Problem and JOIN Demonstration

TypeScript + Node.js + PostgreSQL を使用して、N+1 問題と JOIN の最適化を実践的に学ぶプロジェクト

## 📊 実測パフォーマンス比較

### N+1 問題の深刻さ

| データ件数 | N+1 問題           | JOIN 使用       | IN 句使用      | 改善率 (JOIN) | 高速化倍率  |
| ---------- | ------------------ | --------------- | -------------- | ------------- | ----------- |
| 10 件      | 21 クエリ / 87ms   | 1 クエリ / 6ms  | 3 クエリ / 9ms | **93.1%**     | **14.5 倍** |
| 50 件      | 101 クエリ / 127ms | 1 クエリ / 6ms  | 3 クエリ / 6ms | **95.3%**     | **21.2 倍** |
| 100 件     | 201 クエリ / 248ms | 1 クエリ / 12ms | 3 クエリ / 6ms | **95.2%**     | **20.7 倍** |

**重要なポイント:**

- データ量が増えるほど N+1 問題の影響は深刻化
- JOIN を使うことで**クエリ数を 95%以上削減**
- 実行時間は**10〜40 倍以上の高速化**を実現

---

## 🎯 このプロジェクトで学べること

### 1. N+1 問題とは？

N+1 問題は、データベースアクセスにおける典型的なパフォーマンス問題です。

#### 悪い例（N+1 問題）

```typescript
// 1. 投稿を10件取得（1クエリ）
const posts = await query("SELECT * FROM posts LIMIT 10");

// 2. 各投稿のユーザー情報を取得（10クエリ）
for (const post of posts) {
  const user = await query("SELECT * FROM users WHERE id = $1", [post.user_id]);
}

// 3. 各投稿のコメントを取得（さらに10クエリ）
for (const post of posts) {
  const comments = await query("SELECT * FROM comments WHERE post_id = $1", [
    post.id,
  ]);
}

// 合計: 1 + 10 + 10 = 21クエリ！
```

#### 良い例（JOIN で解決）

```typescript
// 1回のクエリで全てのデータを取得
const result = await query(`
  SELECT 
    p.*,
    u.name as user_name,
    json_agg(c.*) as comments
  FROM posts p
  INNER JOIN users u ON p.user_id = u.id
  LEFT JOIN comments c ON p.id = c.post_id
  GROUP BY p.id, u.id
  LIMIT 10
`);

// 合計: 1クエリのみ！
```

**結果:** 21 クエリ → 1 クエリ（**95%削減**）、実行時間 **14.5 倍高速化**

---

### 2. JOIN 種類の使い分け

PostgreSQL には複数の JOIN 種類があり、それぞれ用途が異なります。

#### INNER JOIN（内部結合）

**用途:** 両方のテーブルにマッチするデータのみ取得

```sql
-- 投稿とそのユーザー情報を取得（投稿が存在するユーザーのみ）
SELECT p.title, u.name
FROM posts p
INNER JOIN users u ON p.user_id = u.id;
```

**実測:** 40ms / 1 クエリ

**いつ使う？**

- 関連データが必ず存在する場合
- 両方のテーブルに紐づくデータだけが必要な場合

---

#### LEFT JOIN（左外部結合）

**用途:** 左テーブルの全レコード + 右テーブルのマッチするレコード

```sql
-- 全てのユーザーと投稿数（投稿がないユーザーも含む）
SELECT u.name, COUNT(p.id) as post_count
FROM users u
LEFT JOIN posts p ON u.id = p.user_id
GROUP BY u.id;
```

**実測:** 11ms / 1 クエリ

**いつ使う？**

- メインテーブルの全レコードを表示したい場合
- 関連データがないレコードも含めたい場合（例: 投稿がないユーザーも表示）

---

#### 複数 JOIN（Multiple JOINs）

**用途:** 3 つ以上のテーブルを結合

```sql
-- 投稿、著者、コメント数、タグ数を一度に取得
SELECT
  p.title,
  u.name as author,
  COUNT(DISTINCT c.id) as comment_count,
  COUNT(DISTINCT pt.tag_id) as tag_count
FROM posts p
INNER JOIN users u ON p.user_id = u.id
LEFT JOIN comments c ON p.id = c.post_id
LEFT JOIN post_tags pt ON p.id = pt.post_id
GROUP BY p.id, u.name;
```

**実測:** 15ms / 1 クエリ

**いつ使う？**

- 複数の関連テーブルから情報を集約する場合
- ダッシュボードやレポート作成時

---

#### サブクエリと JOIN の組み合わせ

**用途:** 条件を満たすデータのみを JOIN

```sql
-- コメントが5件以上ある投稿とその著者
SELECT p.title, u.name, comment_counts.count
FROM posts p
INNER JOIN users u ON p.user_id = u.id
INNER JOIN (
  SELECT post_id, COUNT(*) as count
  FROM comments
  GROUP BY post_id
  HAVING COUNT(*) >= 5
) comment_counts ON p.id = comment_counts.post_id
ORDER BY comment_counts.count DESC;
```

**実測:** 6ms / 1 クエリ

**いつ使う？**

- 集計結果に基づいてフィルタリングしたい場合
- 複雑な条件での絞り込みが必要な場合

---

## 🚀 セットアップ

### 前提条件

- Node.js 20 以上
- Docker & Docker Compose

### インストール手順

```bash
# 1. リポジトリのクローン
git clone <repository-url>
cd postgres-n-plus-one-join

# 2. 依存パッケージのインストール
npm install

# 3. 環境変数の設定
cp .env.example .env

# 4. PostgreSQLコンテナの起動
docker-compose up -d

# 5. コンテナの起動確認
docker-compose ps

# 6. データベースのセットアップ
npm run db:setup
```

成功すると以下のように表示されます:

```
Setting up database...
✓ Schema created successfully
✓ Sample data inserted successfully

📊 Data summary:
┌─────────┬───────┬───────┬──────────┬──────┬───────────┐
│ users   │ posts │ comments │ tags  │ post_tags │
├─────────┼───────┼──────────┼───────┼───────────┤
│ 50      │ 2500  │ 10000    │ 5     │ 5000      │
└─────────┴───────┴──────────┴───────┴───────────┘
```

---

## 📝 実行方法

### N+1 問題のパフォーマンステスト

```bash
npm run test:n-plus-one
```

このコマンドで以下の 3 パターンを 10 件、50 件、100 件で比較:

1. ❌ **N+1 問題あり**: クエリを個別に実行
2. ✅ **JOIN 使用**: 1 回のクエリで全データ取得
3. ✅ **IN 句使用**: 3 回のクエリで一括取得

**出力例:**

```
######################################################################
# テストサイズ: 100件の投稿
######################################################################

📊 ❌ N+1問題あり (100件)
クエリ数: 201
実行時間: 248.00ms

📊 ✅ JOIN使用 (100件)
クエリ数: 1
実行時間: 12.00ms

📈 パフォーマンス比較
クエリ数の削減: 99.5% 🎯
実行時間の改善: 95.2% ⚡
🚀 約20.67倍高速化されました！
```

---

### JOIN 種類のテスト

```bash
npm run test:join
```

このコマンドで以下の JOIN パターンを実行:

- INNER JOIN: 両方のテーブルにマッチするデータのみ
- LEFT JOIN: 左テーブルの全データ + 右テーブルのマッチするデータ
- 複数 JOIN: 3 つ以上のテーブルを結合
- サブクエリ JOIN: 集計結果を使った結合

**出力例:**

```
🔍 INNER JOIN
クエリ数: 1
実行時間: 40.00ms

🔍 LEFT JOIN
クエリ数: 1
実行時間: 11.00ms

🔍 複数JOIN
クエリ数: 1
実行時間: 15.00ms

🔍 サブクエリJOIN
クエリ数: 1
実行時間: 6.00ms
```

---

### PostgreSQL のクエリログをリアルタイム確認

別ターミナルで以下を実行すると、実際に発行されている SQL クエリを確認できます:

```bash
docker-compose logs -f db
```

**ログ例:**

```
2025-01-12 10:30:15 [123]: LOG:  statement: SELECT * FROM posts LIMIT 10
2025-01-12 10:30:15 [123]: LOG:  duration: 2.345 ms
2025-01-12 10:30:15 [123]: LOG:  statement: SELECT * FROM users WHERE id = $1
2025-01-12 10:30:15 [123]: LOG:  duration: 1.234 ms
...（N+1問題だと大量のクエリが流れる）
```

---

## 📁 プロジェクト構成

```
.
├── src/
│   ├── db.ts                      # データベース接続設定
│   ├── models/
│   │   └── types.ts               # TypeScript型定義
│   ├── queries/
│   │   ├── n-plus-one.ts          # N+1問題のデモコード
│   │   └── join-types.ts          # JOIN種類のデモコード
│   ├── utils/
│   │   └── performance.ts         # パフォーマンス測定ユーティリティ
│   ├── scripts/
│   │   ├── setup.ts               # データベースセットアップ
│   │   ├── test-connection.ts     # 接続テスト
│   │   └── seed-large.ts          # 大規模データ生成
│   └── tests/
│       ├── n-plus-one-test.ts     # N+1問題テスト実行
│       └── join-test.ts           # JOINテスト実行
├── sql_scripts/
│   ├── 01_create_schema.sql       # テーブル定義
│   └── 02_insert_sample_data.sql  # サンプルデータ
├── docker-compose.yml             # PostgreSQLコンテナ設定
├── package.json
├── tsconfig.json
├── .env                           # 環境変数（要作成）
└── README.md
```

---

## 🗄️ データベーススキーマ

### テーブル構成

```
users (ユーザー)
├── id (PK)
├── name
├── email
└── created_at

posts (投稿)
├── id (PK)
├── user_id (FK → users.id)
├── title
├── content
├── published_at
└── created_at

comments (コメント)
├── id (PK)
├── post_id (FK → posts.id)
├── user_id (FK → users.id)
├── body
└── created_at

tags (タグ)
├── id (PK)
└── name

post_tags (投稿とタグの中間テーブル)
├── id (PK)
├── post_id (FK → posts.id)
└── tag_id (FK → tags.id)
```

### リレーション図

```
         1        N
users ─────────< posts
   │               │
   │               │ 1
   │               │
   │ N             └───────< comments
   │                           │
   └───────────────────────────┘
                               N

posts (N) >───────< post_tags >───────< (N) tags
              (多対多)
```

### サンプルデータ

- **ユーザー**: 50 人
- **投稿**: 2,500 件（各ユーザー約 50 件）
- **コメント**: 10,000 件（各投稿約 4 件）
- **タグ**: 5 種類（TypeScript, Node.js, PostgreSQL, Performance, Database）
- **投稿-タグ紐付け**: 5,000 件（各投稿に 1-3 個のタグ）

---

## 💡 パフォーマンスチューニングのポイント

### 1. N+1 問題を避ける

❌ **悪い例:**

```typescript
// 各投稿ごとにクエリを実行
for (const post of posts) {
  const user = await db.query("SELECT * FROM users WHERE id = $1", [
    post.user_id,
  ]);
}
```

✅ **良い例 (JOIN):**

```typescript
// 1回のクエリで全データ取得
const result = await db.query(`
  SELECT p.*, u.* FROM posts p
  INNER JOIN users u ON p.user_id = u.id
`);
```

✅ **良い例 (IN 句):**

```typescript
// 一括で取得
const userIds = posts.map((p) => p.user_id);
const users = await db.query("SELECT * FROM users WHERE id = ANY($1)", [
  userIds,
]);
```

---

### 2. 適切な JOIN を選択

| シチュエーション         | 使うべき JOIN        | 理由                         |
| ------------------------ | -------------------- | ---------------------------- |
| 両方にデータが必ず存在   | INNER JOIN           | 不要な NULL チェックが不要   |
| 片方にデータがない可能性 | LEFT JOIN            | メインデータを全て表示できる |
| 複数テーブルから集計     | 複数 JOIN + GROUP BY | 一度に全データを集約         |
| 条件付き集計             | サブクエリ + JOIN    | パフォーマンスの最適化       |

---

### 3. インデックスの活用（オプション）

現在のセットアップでは、N+1 問題を明確にするため**インデックスなし**で実行していますが、
実際のプロダクションでは以下のインデックスを作成すべきです:

```sql
-- 外部キーにインデックスを作成
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_post_tags_post_id ON post_tags(post_id);
CREATE INDEX idx_post_tags_tag_id ON post_tags(tag_id);
```

インデックスを追加すると、さらに高速化されます！

---

## 🔧 トラブルシューティング

### データベース接続エラー

```bash
# 1. コンテナが起動しているか確認
docker-compose ps

# 2. コンテナのログを確認
docker-compose logs db

# 3. 接続テストを実行
npm run db:test

# 4. コンテナを再起動
docker-compose restart db
```

---

### データベースをリセットしたい

```bash
# 1. コンテナとボリュームを完全削除
docker-compose down -v

# 2. 再度起動してセットアップ
docker-compose up -d
sleep 5
npm run db:setup
```

---

### より大規模なデータでテストしたい

```bash
# さらに大量のデータを追加
npm run db:seed-large

# その後テストを実行
npm run test:n-plus-one
```

これにより、さらに N+1 問題の深刻さを体感できます。

---

## 📚 学習の進め方

### ステップ 1: 基本を理解する

1. `npm run test:n-plus-one` を実行
2. 出力結果を見てクエリ数と実行時間の違いを確認
3. PostgreSQL のログで実際のクエリを確認

### ステップ 2: コードを読む

1. `src/queries/n-plus-one.ts` を開く
2. N+1 問題のコードと JOIN のコードを比較
3. どこがどう違うのかを理解

### ステップ 3: JOIN 種類を学ぶ

1. `npm run test:join` を実行
2. `src/queries/join-types.ts` を開く
3. 各 JOIN の用途と結果の違いを確認

### ステップ 4: 実験する

1. `src/tests/` のコードを修正
2. データ件数を変更してパフォーマンスを比較
3. 自分で新しいクエリパターンを試す

---

## 🎓 まとめ

### N+1 問題の重要ポイント

- **クエリ数が増えると性能が劇的に悪化**（100 件で 201 クエリ！）
- **JOIN を使えば 95%以上のクエリを削減可能**
- **実行時間は 10〜40 倍以上高速化**
- **データ量が増えるほど影響が大きい**

### JOIN 使い分けの重要ポイント

- **INNER JOIN**: 確実に関連データがある場合
- **LEFT JOIN**: メインデータを全て取得したい場合
- **複数 JOIN**: 複数テーブルからデータを集約する場合
- **サブクエリ JOIN**: 条件付き集計が必要な場合

### 実務での教訓

1. **ORM を使う場合は特に注意**: N+1 問題が発生しやすい
2. **クエリ数を意識する**: ログで実際のクエリを確認
3. **早めに最適化**: 後から直すのは大変
4. **パフォーマンステストを書く**: 定期的に測定

---

## 📖 参考リンク

- [PostgreSQL 公式ドキュメント - JOIN](https://www.postgresql.org/docs/current/tutorial-join.html)
- [node-postgres (pg)](https://node-postgres.com/)
- [TypeScript](https://www.typescriptlang.org/)

---

## 📄 ライセンス

MIT
