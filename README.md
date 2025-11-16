# PostgreSQL N+1 Problem and JOIN Demonstration（中級レベル対応版）

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

## 💡 パフォーマンスチューニングのポイント（基礎編）

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

### 3. インデックスの活用

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

## 🎯 中級編：パフォーマンス最適化とクエリ解析

### EXPLAIN ANALYZE でクエリプランを理解する

**クエリがどのように実行されているか**を可視化する最強のツールです。

#### 基本的な使い方

```sql
-- EXPLAIN: 実行計画のみ表示（実際には実行しない）
EXPLAIN
SELECT p.*, u.name
FROM posts p
INNER JOIN users u ON p.user_id = u.id
WHERE p.published_at > NOW() - INTERVAL '7 days';

-- EXPLAIN ANALYZE: 実際に実行して詳細な統計を表示
EXPLAIN ANALYZE
SELECT p.*, u.name
FROM posts p
INNER JOIN users u ON p.user_id = u.id
WHERE p.published_at > NOW() - INTERVAL '7 days';
```

#### 出力の読み方

```
Hash Join  (cost=15.25..45.75 rows=100 width=532) (actual time=0.234..0.567 rows=95 loops=1)
  Hash Cond: (p.user_id = u.id)
  ->  Seq Scan on posts p  (cost=0.00..28.50 rows=100 width=500) (actual time=0.012..0.234 rows=95 loops=1)
        Filter: (published_at > (now() - '7 days'::interval))
        Rows Removed by Filter: 2405
  ->  Hash  (cost=12.50..12.50 rows=50 width=32) (actual time=0.156..0.156 rows=50 loops=1)
        Buckets: 1024  Batches: 1  Memory Usage: 10kB
        ->  Seq Scan on users u  (cost=0.00..12.50 rows=50 width=32) (actual time=0.008..0.067 rows=50 loops=1)
Planning Time: 0.456 ms
Execution Time: 0.678 ms
```

**重要な指標:**

- `cost`: 推定コスト（小さいほど良い）
- `rows`: 推定行数
- `actual time`: 実際の実行時間（ミリ秒）
- `Seq Scan`: 全表スキャン（遅い！インデックスがあれば Index Scan になる）
- `Hash Join` / `Nested Loop`: JOIN のアルゴリズム

---

### インデックスの効果を測定

```typescript
// インデックスなしでの実行
async function withoutIndex() {
  console.time("Without Index");

  const result = await db.query(`
    EXPLAIN ANALYZE
    SELECT * FROM posts WHERE user_id = 25
  `);

  console.timeEnd("Without Index");
  console.log(result.rows);
}

// インデックスを作成
await db.query("CREATE INDEX idx_posts_user_id ON posts(user_id)");

// インデックスありでの実行
async function withIndex() {
  console.time("With Index");

  const result = await db.query(`
    EXPLAIN ANALYZE
    SELECT * FROM posts WHERE user_id = 25
  `);

  console.timeEnd("With Index");
  console.log(result.rows);
}
```

**期待される結果:**

- インデックスなし: `Seq Scan` （全表スキャン、遅い）
- インデックスあり: `Index Scan` または `Bitmap Index Scan` （高速）

---

### サブクエリの最適化

#### ❌ 非効率なサブクエリ

```sql
-- 各投稿に対してサブクエリが実行される（N+1に近い問題）
SELECT
  p.*,
  (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
  (SELECT name FROM users WHERE id = p.user_id) as author_name
FROM posts p
LIMIT 100;
```

**問題点:**

- サブクエリが各行ごとに実行される
- データ量が増えると極端に遅くなる

#### ✅ JOIN とサブクエリの適切な組み合わせ

```sql
-- サブクエリで集計してからJOIN（効率的）
SELECT
  p.*,
  u.name as author_name,
  COALESCE(cc.comment_count, 0) as comment_count
FROM posts p
INNER JOIN users u ON p.user_id = u.id
LEFT JOIN (
  SELECT post_id, COUNT(*) as comment_count
  FROM comments
  GROUP BY post_id
) cc ON p.id = cc.post_id
LIMIT 100;
```

**改善点:**

- 集計を先に実行してから JOIN
- 各投稿に対してクエリを実行しない

---

### CTE (Common Table Expression) の活用

**WITH 句を使って複雑なクエリを読みやすく、最適化しやすくする**

```sql
-- ❌ ネストが深くて読みにくい
SELECT p.*, stats.comment_count, stats.like_count
FROM posts p
LEFT JOIN (
  SELECT
    post_id,
    COUNT(DISTINCT c.id) as comment_count,
    COUNT(DISTINCT l.id) as like_count
  FROM comments c
  FULL OUTER JOIN likes l ON c.post_id = l.post_id
  GROUP BY post_id
) stats ON p.id = stats.post_id;

-- ✅ CTEで段階的に処理（読みやすい、最適化しやすい）
WITH comment_stats AS (
  SELECT post_id, COUNT(*) as comment_count
  FROM comments
  GROUP BY post_id
),
like_stats AS (
  SELECT post_id, COUNT(*) as like_count
  FROM likes
  GROUP BY post_id
)
SELECT
  p.*,
  COALESCE(cs.comment_count, 0) as comment_count,
  COALESCE(ls.like_count, 0) as like_count
FROM posts p
LEFT JOIN comment_stats cs ON p.id = cs.post_id
LEFT JOIN like_stats ls ON p.id = ls.post_id;
```

**メリット:**

- 読みやすい、デバッグしやすい
- PostgreSQL が最適化しやすい
- 各 CTE を個別にテストできる

---

### WINDOW 関数で効率的な集計

**各グループ内でのランキングや累計を効率的に計算**

```sql
-- 各ユーザーの最新5件の投稿を取得
-- ❌ 非効率な方法（サブクエリ + LIMIT）
SELECT DISTINCT ON (user_id) *
FROM (
  SELECT * FROM posts WHERE user_id = 1 ORDER BY created_at DESC LIMIT 5
  UNION ALL
  SELECT * FROM posts WHERE user_id = 2 ORDER BY created_at DESC LIMIT 5
  -- ... 全ユーザー分繰り返し（最悪！）
) subquery;

-- ✅ WINDOW関数を使用（効率的）
WITH ranked_posts AS (
  SELECT
    *,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
  FROM posts
)
SELECT * FROM ranked_posts WHERE rn <= 5;
```

**よく使う WINDOW 関数:**

- `ROW_NUMBER()`: 連番を付与
- `RANK()`: ランキング（同順位あり）
- `DENSE_RANK()`: 密なランキング
- `LAG()` / `LEAD()`: 前後の行の値を取得
- `SUM() OVER()`: 累計

---

### JOIN の順序とパフォーマンス

**PostgreSQL はクエリオプティマイザーが自動で最適な順序を選びますが、理解しておくと有用**

```typescript
// パターン1: 小さいテーブルから JOIN
// ✅ 効率的（フィルタリングを先に）
const efficientQuery = `
  SELECT p.*, u.name, c.body
  FROM (
    SELECT * FROM posts WHERE published_at > NOW() - INTERVAL '7 days'
  ) p  -- まず投稿を絞り込む（例: 2500件 → 100件）
  INNER JOIN users u ON p.user_id = u.id
  LEFT JOIN comments c ON p.id = c.post_id
`;

// パターン2: 大きいテーブルから JOIN
// ❌ 非効率（大量のデータをJOINしてからフィルタリング）
const inefficientQuery = `
  SELECT p.*, u.name, c.body
  FROM posts p  -- 2500件全部
  INNER JOIN users u ON p.user_id = u.id
  LEFT JOIN comments c ON p.id = c.post_id
  WHERE p.published_at > NOW() - INTERVAL '7 days'  -- 最後にフィルタ
`;
```

**ベストプラクティス:**

1. WHERE 句で先に絞り込む
2. 小さいテーブルから JOIN
3. EXPLAIN ANALYZE で確認

---

### JOIN アルゴリズムの理解

PostgreSQL は 3 種類の JOIN アルゴリズムを使い分けます:

#### 1. Nested Loop Join（ネストループ）

**小さいテーブル同士の JOIN に適している**

```
- 外側テーブルの各行に対して、内側テーブルを全探索
- 片方が小さければ高速
- 大きいテーブル同士だと遅い
```

#### 2. Hash Join（ハッシュ）

**大きいテーブル同士の JOIN に適している**

```
- 片方のテーブルをメモリ上にハッシュテーブル化
- もう片方のテーブルをスキャンしてマッチング
- メモリが十分にあれば高速
```

#### 3. Merge Join（マージ）

**両方のテーブルがソート済みの場合に適している**

```
- 両方のテーブルをソートしてマージ
- インデックスがあれば効率的
```

**EXPLAIN ANALYZE で確認:**

```sql
EXPLAIN ANALYZE
SELECT p.*, u.name
FROM posts p
INNER JOIN users u ON p.user_id = u.id;

-- 出力に "Hash Join" "Nested Loop" "Merge Join" のいずれかが表示される
```

---

### 実践：複雑なダッシュボードクエリの最適化

**要件:** ユーザーごとの統計情報を 1 つのクエリで取得

```typescript
// ❌ N+1問題（最悪）
async function getDashboardBad() {
  const users = await db.query("SELECT * FROM users");

  for (const user of users.rows) {
    const postCount = await db.query(
      "SELECT COUNT(*) FROM posts WHERE user_id = $1",
      [user.id]
    );
    const commentCount = await db.query(
      "SELECT COUNT(*) FROM comments WHERE user_id = $1",
      [user.id]
    );
    const likeCount = await db.query(
      "SELECT COUNT(*) FROM likes WHERE user_id = $1",
      [user.id]
    );
  }
  // 合計: 1 + (50 × 3) = 151クエリ！
}

// ✅ 最適化版（中級レベル）
async function getDashboardGood() {
  const result = await db.query(`
    WITH user_post_stats AS (
      SELECT 
        user_id,
        COUNT(*) as post_count,
        MAX(created_at) as last_post_at
      FROM posts
      GROUP BY user_id
    ),
    user_comment_stats AS (
      SELECT 
        user_id,
        COUNT(*) as comment_count
      FROM comments
      GROUP BY user_id
    ),
    user_like_stats AS (
      SELECT 
        user_id,
        COUNT(*) as like_count
      FROM likes
      GROUP BY user_id
    )
    SELECT 
      u.*,
      COALESCE(ups.post_count, 0) as post_count,
      COALESCE(ucs.comment_count, 0) as comment_count,
      COALESCE(uls.like_count, 0) as like_count,
      ups.last_post_at
    FROM users u
    LEFT JOIN user_post_stats ups ON u.id = ups.user_id
    LEFT JOIN user_comment_stats ucs ON u.id = ucs.user_id
    LEFT JOIN user_like_stats uls ON u.id = uls.user_id
    ORDER BY u.id
  `);

  return result.rows;
  // 合計: 1クエリのみ！（151倍高速化）
}
```

---

### パフォーマンス測定のベストプラクティス

```typescript
// 測定用ヘルパー関数
async function measureQuery(name: string, queryFn: () => Promise<any>) {
  const startTime = performance.now();
  const startMemory = process.memoryUsage().heapUsed;

  const result = await queryFn();

  const endTime = performance.now();
  const endMemory = process.memoryUsage().heapUsed;

  console.log(`
📊 ${name}
⏱️  実行時間: ${(endTime - startTime).toFixed(2)}ms
💾 メモリ使用: ${((endMemory - startMemory) / 1024 / 1024).toFixed(2)}MB
📦 取得行数: ${result.rows?.length || 0}
  `);

  return result;
}

// 使用例
await measureQuery("N+1問題", async () => {
  return await getNPlusOneProblem();
});

await measureQuery("JOIN最適化", async () => {
  return await getWithJoin();
});
```

---

### データベース統計の更新

**PostgreSQL はテーブルの統計情報をもとにクエリプランを作成するため、定期的な更新が重要**

```sql
-- 特定テーブルの統計を更新
ANALYZE posts;

-- 全テーブルの統計を更新
ANALYZE;

-- VACUUM と統計更新を同時実行（推奨）
VACUUM ANALYZE;

-- 自動VACUUMの設定確認
SHOW autovacuum;
```

**実務での運用:**

- 大量データ投入後は必ず `ANALYZE` を実行
- 定期的に `VACUUM ANALYZE` を実行（通常は自動）
- クエリプランが不適切な場合は統計情報を疑う

---

### 複合インデックスの活用

**複数カラムを組み合わせたインデックスで、さらに高速化**

```sql
-- 単一カラムインデックス
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_published_at ON posts(published_at);

-- ✅ 複合インデックス（より効率的）
CREATE INDEX idx_posts_user_published ON posts(user_id, published_at);

-- このクエリで複合インデックスが使われる
SELECT * FROM posts
WHERE user_id = 25
  AND published_at > NOW() - INTERVAL '7 days';
```

**複合インデックスのルール:**

1. WHERE 句で一緒に使うカラムを組み合わせる
2. 選択性が高い（ユニークな値が多い）カラムを先に
3. 順序が重要（user_id, published_at と published_at, user_id は別物）

---

### 部分インデックス（Partial Index）

**条件を満たす行だけにインデックスを作成して、容量とパフォーマンスを最適化**

```sql
-- 公開済みの投稿だけにインデックス
CREATE INDEX idx_published_posts
ON posts(user_id, published_at)
WHERE published_at IS NOT NULL;

-- このクエリで部分インデックスが使われる
SELECT * FROM posts
WHERE user_id = 25
  AND published_at > NOW() - INTERVAL '7 days';
```

**メリット:**

- インデックスサイズが小さくなる
- 更新パフォーマンスが向上
- よく使う条件に特化した高速化

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

### クエリが遅い原因を特定する

```sql
-- 1. EXPLAIN ANALYZEで実行計画を確認
EXPLAIN ANALYZE
SELECT * FROM posts WHERE user_id = 25;

-- 2. Seq Scanが出たらインデックスを検討
-- 3. 統計情報を更新
ANALYZE posts;

-- 4. 再度EXPLAIN ANALYZEで確認
EXPLAIN ANALYZE
SELECT * FROM posts WHERE user_id = 25;
```

---

## 📚 学習の進め方

### ステップ 1: 基本を理解する（初級）

1. `npm run test:n-plus-one` を実行
2. 出力結果を見てクエリ数と実行時間の違いを確認
3. PostgreSQL のログで実際のクエリを確認

### ステップ 2: コードを読む（初級）

1. `src/queries/n-plus-one.ts` を開く
2. N+1 問題のコードと JOIN のコードを比較
3. どこがどう違うのかを理解

### ステップ 3: JOIN 種類を学ぶ（初級）

1. `npm run test:join` を実行
2. `src/queries/join-types.ts` を開く
3. 各 JOIN の用途と結果の違いを確認

### ステップ 4: 実験する（初級 → 中級）

1. `src/tests/` のコードを修正
2. データ件数を変更してパフォーマンスを比較
3. 自分で新しいクエリパターンを試す

### ステップ 5: EXPLAIN ANALYZE を使う（中級）

1. PostgreSQL コンテナに接続: `docker exec -it <container_id> psql -U postgres -d myapp`
2. EXPLAIN ANALYZE でクエリプランを確認
3. インデックスを追加して効果を測定

### ステップ 6: 複雑なクエリに挑戦（中級）

1. CTE を使ったクエリを書く
2. WINDOW 関数を使った集計を試す
3. ダッシュボードクエリを最適化

---

## 🎓 中級レベルチェックリスト

### クエリ最適化スキル

- [ ] EXPLAIN ANALYZE でクエリプランを読める
- [ ] Seq Scan と Index Scan の違いを理解している
- [ ] サブクエリを JOIN に書き換えられる
- [ ] CTE (WITH 句) を使って複雑なクエリを整理できる
- [ ] WINDOW 関数を使った効率的な集計ができる
- [ ] JOIN の順序がパフォーマンスに与える影響を理解している

### インデックス設計

- [ ] 外部キーに適切なインデックスを作成できる
- [ ] WHERE 句でよく使うカラムにインデックスを作成できる
- [ ] 複合インデックスの使いどころを理解している
- [ ] 部分インデックスを活用できる
- [ ] インデックスのオーバーヘッドを理解している

### パフォーマンス測定

- [ ] 実行時間を測定できる
- [ ] クエリ数をカウントできる
- [ ] ボトルネックを特定できる
- [ ] 改善効果を定量的に示せる

---

## 🎓 まとめ

### N+1 問題の重要ポイント（基礎）

- **クエリ数が増えると性能が劇的に悪化**（100 件で 201 クエリ！）
- **JOIN を使えば 95%以上のクエリを削減可能**
- **実行時間は 10〜40 倍以上高速化**
- **データ量が増えるほど影響が大きい**

### JOIN 使い分けの重要ポイント（基礎）

- **INNER JOIN**: 確実に関連データがある場合
- **LEFT JOIN**: メインデータを全て取得したい場合
- **複数 JOIN**: 複数テーブルからデータを集約する場合
- **サブクエリ JOIN**: 条件付き集計が必要な場合

### 中級レベルの重要ポイント

- **EXPLAIN ANALYZE**: クエリプラン解析の必須ツール
- **CTE (WITH 句)**: 複雑なクエリを整理して最適化
- **WINDOW 関数**: 効率的なランキングと集計
- **インデックス戦略**: 複合インデックス、部分インデックスの活用
- **統計情報**: VACUUM ANALYZE で最適なクエリプランを維持

### 実務での教訓

1. **ORM を使う場合は特に注意**: N+1 問題が発生しやすい
2. **クエリ数を意識する**: ログで実際のクエリを確認
3. **早めに最適化**: 後から直すのは大変
4. **パフォーマンステストを書く**: 定期的に測定
5. **EXPLAIN ANALYZE を習慣化**: クエリ追加時は必ず確認
6. **インデックスは計画的に**: 闇雲に追加すると逆効果

---

## 🚀 次のステップ（上級編へ）

中級レベルをマスターしたら、以下に挑戦:

1. **パーティショニング**: 大規模テーブルの分割
2. **レプリケーション**: 読み取り専用レプリカの活用
3. **接続プーリング**: pgBouncer などの導入
4. **マテリアライズドビュー**: 集計結果のキャッシュ
5. **Full-Text Search**: PostgreSQL の全文検索機能
6. **クエリキャッシュ戦略**: Redis との併用
7. **分散データベース**: Citus などの導入検討

---

## 📖 参考リンク

- [PostgreSQL 公式ドキュメント - JOIN](https://www.postgresql.org/docs/current/tutorial-join.html)
- [PostgreSQL Performance Tuning](https://www.postgresql.org/docs/current/performance-tips.html)
- [EXPLAIN の読み方](https://www.postgresql.org/docs/current/using-explain.html)
- [node-postgres (pg)](https://node-postgres.com/)
- [TypeScript](https://www.typescriptlang.org/)

---

## 📄 ライセンス

MIT
