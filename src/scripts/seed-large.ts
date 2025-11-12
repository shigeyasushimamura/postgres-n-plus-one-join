import { getClient } from "../db";

async function seedLargeDataset() {
  const client = await getClient();

  try {
    console.log("大規模データセットを作成中...");

    // ユーザーを50人に増やす
    console.log("ユーザーを追加中...");
    await client.query(`
      INSERT INTO users (name, email)
      SELECT 
        'User ' || generate_series,
        'user' || generate_series || '@example.com'
      FROM generate_series(6, 50)
    `);

    // 投稿を大量に追加（各ユーザー50件 = 2500件）
    console.log("投稿を追加中...");
    await client.query(`
      INSERT INTO posts (user_id, title, content, published_at)
      SELECT 
        (random() * 49 + 1)::int,
        'Post ' || generate_series,
        'Content for post ' || generate_series,
        CURRENT_TIMESTAMP - (random() * INTERVAL '365 days')
      FROM generate_series(101, 2500)
    `);

    // コメントを大量に追加
    console.log("コメントを追加中...");
    await client.query(`
      INSERT INTO comments (post_id, user_id, body)
      SELECT 
        (random() * 2499 + 1)::int,
        (random() * 49 + 1)::int,
        'Comment ' || generate_series
      FROM generate_series(501, 10000)
    `);

    console.log("✅ 大規模データセットの作成が完了しました！");

    // 件数確認
    const countResult = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as users,
        (SELECT COUNT(*) FROM posts) as posts,
        (SELECT COUNT(*) FROM comments) as comments
    `);

    console.log("\n📊 データ件数:");
    console.table(countResult.rows[0]);
  } catch (error) {
    console.error("エラー:", error);
  } finally {
    client.release();
    process.exit(0);
  }
}

seedLargeDataset();
