import { query } from "../db";

/**
 * INNER JOIN: 両方のテーブルにマッチするレコードのみ
 */
export async function innerJoinExample() {
  console.log("\n=== INNER JOIN ===");
  console.log("全ての投稿とそのユーザー（投稿があるユーザーのみ）\n");

  const result = await query(`
    SELECT 
      p.id as post_id,
      p.title,
      u.name as author
    FROM posts p
    INNER JOIN users u ON p.user_id = u.id
    ORDER BY p.id
    LIMIT 5
  `);

  console.table(result.rows);
  return result.rows;
}

/**
 * LEFT JOIN: 左テーブルの全レコード + 右テーブルのマッチするレコード
 */
export async function leftJoinExample() {
  console.log("\n=== LEFT JOIN ===");
  console.log("全てのユーザーと投稿数（投稿がないユーザーも含む）\n");

  const result = await query(`
    SELECT 
      u.id as user_id,
      u.name,
      COUNT(p.id) as post_count
    FROM users u
    LEFT JOIN posts p ON u.id = p.user_id
    GROUP BY u.id, u.name
    ORDER BY post_count DESC
  `);

  console.table(result.rows);
  return result.rows;
}

/**
 * 複数JOIN: 投稿、ユーザー、コメントを結合
 */
export async function multipleJoinsExample() {
  console.log("\n=== Multiple JOINs ===");
  console.log("投稿、著者、コメント数を一度に取得\n");

  const result = await query(`
    SELECT 
      p.id as post_id,
      p.title,
      u.name as author,
      COUNT(DISTINCT c.id) as comment_count,
      COUNT(DISTINCT pt.tag_id) as tag_count
    FROM posts p
    INNER JOIN users u ON p.user_id = u.id
    LEFT JOIN comments c ON p.id = c.post_id
    LEFT JOIN post_tags pt ON p.id = pt.post_id
    GROUP BY p.id, p.title, u.name
    ORDER BY comment_count DESC
    LIMIT 10
  `);

  console.table(result.rows);
  return result.rows;
}

/**
 * サブクエリを使ったJOIN
 */
export async function subqueryJoinExample() {
  console.log("\n=== JOIN with Subquery ===");
  console.log("コメントが5件以上ある投稿とその著者\n");

  const result = await query(`
    SELECT 
      p.id,
      p.title,
      u.name as author,
      comment_counts.count as comment_count
    FROM posts p
    INNER JOIN users u ON p.user_id = u.id
    INNER JOIN (
      SELECT post_id, COUNT(*) as count
      FROM comments
      GROUP BY post_id
      HAVING COUNT(*) >= 5
    ) comment_counts ON p.id = comment_counts.post_id
    ORDER BY comment_counts.count DESC
    LIMIT 10
  `);

  console.table(result.rows);
  return result.rows;
}
