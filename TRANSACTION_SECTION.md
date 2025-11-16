# トランザクション基礎 - ACID 特性とロールバック/コミット

TypeScript + Node.js + PostgreSQL を使用して、トランザクションの基礎を実践的に学ぶ解説

## 📊 トランザクションとは？

トランザクションは、**複数のデータベース操作を 1 つの論理的な単位としてまとめる仕組み**です。

### なぜ必要？

| シチュエーション | トランザクションなし                                | トランザクションあり                     |
| ---------------- | --------------------------------------------------- | ---------------------------------------- |
| 銀行の送金処理   | A 口座から引き落としたのに、B 口座への入金に失敗 💸 | 両方成功するか、両方失敗するかの 2 択 ✅ |
| 投稿の削除       | 投稿は削除できたが、関連コメントが残ってしまう 🐛   | 投稿とコメントが一緒に削除される ✅      |
| 在庫管理         | 在庫を減らしたが、注文登録に失敗 📦                 | 在庫と注文が整合性を保つ ✅              |

**重要なポイント:**

- データの整合性を保証
- エラー時の自動復元（ロールバック）
- 複数操作の原子性を保証

---

## 🔐 ACID 特性

トランザクションが満たすべき 4 つの特性

### A - Atomicity（原子性）

**トランザクション内の操作は全て成功するか、全て失敗するか**

```typescript
// ❌ 原子性なし
async function deletePostBad(postId: number) {
  await query("DELETE FROM posts WHERE id = $1", [postId]);
  // ここでエラーが発生したら？ → 投稿だけ消えてコメントが残る！
  await query("DELETE FROM comments WHERE post_id = $1", [postId]);
}

// ✅ 原子性あり
async function deletePostGood(postId: number) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN"); // トランザクション開始
    await client.query("DELETE FROM posts WHERE id = $1", [postId]);
    await client.query("DELETE FROM comments WHERE post_id = $1", [postId]);
    await client.query("COMMIT"); // 全て成功したら確定
  } catch (error) {
    await client.query("ROLLBACK"); // エラー時は全て取り消し
    throw error;
  } finally {
    client.release();
  }
}
```

**結果**: 投稿とコメントが必ずセットで削除される、または両方とも残る

---

### C - Consistency（一貫性）

**トランザクション前後でデータベースの整合性が保たれる**

```typescript
// 送金処理の例
async function transfer(
  fromAccount: number,
  toAccount: number,
  amount: number
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 送金元から引き落とし
    await client.query(
      "UPDATE accounts SET balance = balance - $1 WHERE id = $2",
      [amount, fromAccount]
    );

    // 送金先に入金
    await client.query(
      "UPDATE accounts SET balance = balance + $1 WHERE id = $2",
      [amount, toAccount]
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
```

**保証される一貫性**:

- 総額は変わらない（お金が消えたり増えたりしない）
- 残高がマイナスにならない（制約がある場合）
- 外部キー制約が守られる

---

### I - Isolation（分離性）

**複数のトランザクションが同時実行されても、互いに影響しない**

```typescript
// 同時アクセス時の問題例
// ユーザーA: 在庫10個を確認 → 5個購入しようとする
// ユーザーB: 在庫10個を確認 → 8個購入しようとする
// → 在庫が足りないのに両方成功してしまう可能性！

// ✅ 分離レベルを設定
async function purchaseProduct(productId: number, quantity: number) {
  const client = await pool.connect();
  try {
    // READ COMMITTED: 他のトランザクションの確定済みデータのみ読む
    await client.query("BEGIN ISOLATION LEVEL READ COMMITTED");

    // 在庫をロックして確認
    const result = await client.query(
      "SELECT stock FROM products WHERE id = $1 FOR UPDATE",
      [productId]
    );

    if (result.rows[0].stock < quantity) {
      throw new Error("在庫不足");
    }

    // 在庫を減らす
    await client.query("UPDATE products SET stock = stock - $1 WHERE id = $2", [
      quantity,
      productId,
    ]);

    // 注文を登録
    await client.query(
      "INSERT INTO orders (product_id, quantity) VALUES ($1, $2)",
      [productId, quantity]
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
```

**PostgreSQL の分離レベル**:

| レベル           | 説明                                  | 使用例       |
| ---------------- | ------------------------------------- | ------------ |
| READ UNCOMMITTED | 未確定データも読める（PG 未サポート） | -            |
| READ COMMITTED   | 確定済みデータのみ読む（デフォルト）  | 一般的な処理 |
| REPEATABLE READ  | 同じデータは常に同じ値                | レポート生成 |
| SERIALIZABLE     | 完全な直列化                          | 銀行取引     |

---

### D - Durability（永続性）

**一度確定（COMMIT）したデータは、システム障害が起きても失われない**

```typescript
async function createPost(userId: number, title: string, content: string) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const result = await client.query(
      "INSERT INTO posts (user_id, title, content) VALUES ($1, $2, $3) RETURNING id",
      [userId, title, content]
    );

    await client.query("COMMIT"); // ← この瞬間、ディスクに永続化される
    // この後にサーバーがクラッシュしても、データは失われない

    return result.rows[0].id;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
```

**PostgreSQL の永続化の仕組み**:

- WAL（Write-Ahead Logging）: 変更をログに先に書く
- COMMIT でログをディスクに同期
- 障害時はログから復旧

---

## 🔄 ロールバック/コミットの実装パターン

### パターン 1: 基本形

```typescript
async function basicTransaction() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // データベース操作
    await client.query("INSERT INTO ...");
    await client.query("UPDATE ...");

    await client.query("COMMIT"); // 成功時は確定
  } catch (error) {
    await client.query("ROLLBACK"); // エラー時は取り消し
    throw error;
  } finally {
    client.release(); // コネクションを返却
  }
}
```

---

### パターン 2: 条件付きロールバック

```typescript
async function deletePostWithValidation(postId: number, userId: number) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 投稿の所有者確認
    const post = await client.query("SELECT user_id FROM posts WHERE id = $1", [
      postId,
    ]);

    if (!post.rows[0]) {
      throw new Error("投稿が見つかりません");
    }

    if (post.rows[0].user_id !== userId) {
      // 権限がない場合は明示的にロールバック
      await client.query("ROLLBACK");
      throw new Error("削除権限がありません");
    }

    // コメントを削除
    await client.query("DELETE FROM comments WHERE post_id = $1", [postId]);

    // 投稿を削除
    await client.query("DELETE FROM posts WHERE id = $1", [postId]);

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
```

---

### パターン 3: セーブポイント（部分ロールバック）

```typescript
async function complexTransaction() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 投稿を作成
    const post = await client.query(
      "INSERT INTO posts (user_id, title) VALUES ($1, $2) RETURNING id",
      [1, "タイトル"]
    );

    // セーブポイント作成
    await client.query("SAVEPOINT tags_insertion");

    try {
      // タグの紐付け（失敗する可能性あり）
      await client.query(
        "INSERT INTO post_tags (post_id, tag_id) VALUES ($1, $2)",
        [post.rows[0].id, 999] // 存在しないタグID
      );
    } catch (tagError) {
      // タグの紐付けだけロールバック（投稿は残す）
      await client.query("ROLLBACK TO SAVEPOINT tags_insertion");
      console.log("タグの紐付けに失敗しましたが、投稿は作成されました");
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
```

---

### パターン 4: トランザクションヘルパー関数

```typescript
// 再利用可能なヘルパー関数
async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// 使用例
async function transferMoney(from: number, to: number, amount: number) {
  return withTransaction(async (client) => {
    await client.query(
      "UPDATE accounts SET balance = balance - $1 WHERE id = $2",
      [amount, from]
    );

    await client.query(
      "UPDATE accounts SET balance = balance + $1 WHERE id = $2",
      [amount, to]
    );

    return { success: true };
  });
}
```

---

## 📝 実践例: 投稿削除時のロールバック処理

```typescript
interface DeletePostResult {
  success: boolean;
  deletedComments: number;
  message: string;
}

async function deletePost(
  postId: number,
  userId: number
): Promise<DeletePostResult> {
  const client = await pool.connect();

  try {
    // トランザクション開始
    await client.query("BEGIN");

    // 1. 投稿の存在確認と権限チェック
    const postResult = await client.query(
      "SELECT user_id FROM posts WHERE id = $1",
      [postId]
    );

    if (postResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return {
        success: false,
        deletedComments: 0,
        message: "投稿が見つかりません",
      };
    }

    if (postResult.rows[0].user_id !== userId) {
      await client.query("ROLLBACK");
      return {
        success: false,
        deletedComments: 0,
        message: "削除権限がありません",
      };
    }

    // 2. 関連するコメント数をカウント
    const commentCount = await client.query(
      "SELECT COUNT(*) FROM comments WHERE post_id = $1",
      [postId]
    );

    // 3. コメントを削除
    await client.query("DELETE FROM comments WHERE post_id = $1", [postId]);

    // 4. 投稿タグの紐付けを削除
    await client.query("DELETE FROM post_tags WHERE post_id = $1", [postId]);

    // 5. 投稿を削除
    await client.query("DELETE FROM posts WHERE id = $1", [postId]);

    // 全て成功したらコミット
    await client.query("COMMIT");

    return {
      success: true,
      deletedComments: parseInt(commentCount.rows[0].count),
      message: "投稿を削除しました",
    };
  } catch (error) {
    // エラーが発生したら全てロールバック
    await client.query("ROLLBACK");

    console.error("投稿削除エラー:", error);

    return {
      success: false,
      deletedComments: 0,
      message: "エラーが発生しました。データは変更されていません。",
    };
  } finally {
    // 必ずコネクションを返却
    client.release();
  }
}

// 使用例
const result = await deletePost(123, 1);
if (result.success) {
  console.log(
    `✅ ${result.message} (コメント${result.deletedComments}件も削除)`
  );
} else {
  console.log(`❌ ${result.message}`);
}
```

---

## 🎯 よくあるトランザクションのユースケース

### 1. EC サイトの注文処理

```typescript
async function createOrder(
  userId: number,
  items: Array<{ productId: number; quantity: number }>
) {
  return withTransaction(async (client) => {
    // 注文を作成
    const order = await client.query(
      "INSERT INTO orders (user_id, total_amount) VALUES ($1, 0) RETURNING id",
      [userId]
    );

    let totalAmount = 0;

    for (const item of items) {
      // 在庫確認（ロックして確認）
      const product = await client.query(
        "SELECT price, stock FROM products WHERE id = $1 FOR UPDATE",
        [item.productId]
      );

      if (product.rows[0].stock < item.quantity) {
        throw new Error(`商品ID ${item.productId} の在庫が不足しています`);
      }

      // 注文明細を追加
      await client.query(
        "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)",
        [order.rows[0].id, item.productId, item.quantity, product.rows[0].price]
      );

      // 在庫を減らす
      await client.query(
        "UPDATE products SET stock = stock - $1 WHERE id = $2",
        [item.quantity, item.productId]
      );

      totalAmount += product.rows[0].price * item.quantity;
    }

    // 注文の合計金額を更新
    await client.query("UPDATE orders SET total_amount = $1 WHERE id = $2", [
      totalAmount,
      order.rows[0].id,
    ]);

    return order.rows[0].id;
  });
}
```

---

### 2. ユーザー登録とプロフィール作成

```typescript
async function registerUser(email: string, password: string, profileData: any) {
  return withTransaction(async (client) => {
    // ユーザーを作成
    const user = await client.query(
      "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id",
      [email, password]
    );

    // プロフィールを作成
    await client.query(
      "INSERT INTO profiles (user_id, name, bio) VALUES ($1, $2, $3)",
      [user.rows[0].id, profileData.name, profileData.bio]
    );

    // デフォルト設定を作成
    await client.query(
      "INSERT INTO user_settings (user_id, theme, language) VALUES ($1, $2, $3)",
      [user.rows[0].id, "light", "ja"]
    );

    return user.rows[0].id;
  });
}
```

---

### 3. いいね機能（重複防止）

```typescript
async function toggleLike(userId: number, postId: number) {
  return withTransaction(async (client) => {
    // 既存のいいねを確認（ロック）
    const existing = await client.query(
      "SELECT id FROM likes WHERE user_id = $1 AND post_id = $2 FOR UPDATE",
      [userId, postId]
    );

    if (existing.rows.length > 0) {
      // いいねを削除
      await client.query("DELETE FROM likes WHERE id = $1", [
        existing.rows[0].id,
      ]);
      await client.query(
        "UPDATE posts SET likes_count = likes_count - 1 WHERE id = $1",
        [postId]
      );
      return { liked: false };
    } else {
      // いいねを追加
      await client.query(
        "INSERT INTO likes (user_id, post_id) VALUES ($1, $2)",
        [userId, postId]
      );
      await client.query(
        "UPDATE posts SET likes_count = likes_count + 1 WHERE id = $1",
        [postId]
      );
      return { liked: true };
    }
  });
}
```

---

## ⚠️ よくある間違いと対策

### ❌ 間違い 1: client.release() を忘れる

```typescript
// ❌ NG: コネクションプールが枯渇する
async function badExample() {
  const client = await pool.connect();
  await client.query("BEGIN");
  await client.query("INSERT INTO ...");
  await client.query("COMMIT");
  // release()を忘れている！
}

// ✅ OK: finallyで必ず返却
async function goodExample() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("INSERT INTO ...");
    await client.query("COMMIT");
  } finally {
    client.release(); // 必ず実行される
  }
}
```

---

### ❌ 間違い 2: エラー時に ROLLBACK しない

```typescript
// ❌ NG: エラー時もCOMMITされてしまう
async function badExample() {
  const client = await pool.connect();
  await client.query("BEGIN");
  await client.query("INSERT INTO posts ...");
  await client.query("INSERT INTO invalid ..."); // エラー発生
  await client.query("COMMIT"); // 実行されないが、トランザクションは開いたまま
  client.release();
}

// ✅ OK: エラー時は必ずROLLBACK
async function goodExample() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("INSERT INTO posts ...");
    await client.query("INSERT INTO invalid ...");
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK"); // エラー時は必ずロールバック
    throw error;
  } finally {
    client.release();
  }
}
```

---

### ❌ 間違い 3: 長時間トランザクションを開きっぱなし

```typescript
// ❌ NG: トランザクションが長すぎる
async function badExample(userId: number) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 外部APIを呼ぶ（時間がかかる）
    const result = await fetch("https://api.example.com/data");
    const data = await result.json();

    // DBに保存
    await client.query("INSERT INTO ...", [data]);

    await client.query("COMMIT");
  } finally {
    client.release();
  }
}

// ✅ OK: 外部処理はトランザクションの外で
async function goodExample(userId: number) {
  // 先に外部APIを呼ぶ
  const result = await fetch("https://api.example.com/data");
  const data = await result.json();

  // トランザクションは短く
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("INSERT INTO ...", [data]);
    await client.query("COMMIT");
  } finally {
    client.release();
  }
}
```

---

## 🚀 まとめ

### ACID 特性の覚え方

| 特性            | 覚え方                         | 実例                           |
| --------------- | ------------------------------ | ------------------------------ |
| **A**tomicity   | **全**部成功か**全**部失敗     | 投稿とコメントを一緒に削除     |
| **C**onsistency | データの**整合性**を保つ       | 送金で総額が変わらない         |
| **I**solation   | 他のトランザクションと**隔離** | 在庫の同時購入で競合しない     |
| **D**urability  | COMMIT したら**永続化**        | サーバークラッシュでも消えない |

---

### トランザクション実装のチェックリスト

- [ ] `BEGIN` でトランザクション開始
- [ ] 成功時は `COMMIT` で確定
- [ ] エラー時は `ROLLBACK` で取り消し
- [ ] `finally` で必ず `client.release()`
- [ ] 長時間処理はトランザクション外で
- [ ] 必要に応じて `FOR UPDATE` でロック
- [ ] 分離レベルを適切に設定

---

### 次のステップ

1. **実際に試す**: 投稿削除処理を実装してみる
2. **エラーを起こす**: わざとエラーを発生させてロールバックを確認
3. **ログを見る**: PostgreSQL のログで BEGIN/COMMIT/ROLLBACK を確認
4. **複雑な処理**: 注文処理などの複数テーブルを扱う処理に挑戦

---

トランザクションは**データの整合性を守る最後の砦**です。正しく使いこなして、安全なアプリケーションを作りましょう！ 🎯
