import { query } from "../db";
import { Post, Comment, User } from "../models/types";

/**
 * N+1問題: 悪い例
 * 投稿を取得してから、各投稿ごとにユーザー情報とコメントを取得
 */
export async function fetchPostsWithN1Problem(
  limit: number = 10
): Promise<Post[]> {
  // 1. 投稿を全件取得 (1回のクエリ)
  const postsResult = await query(`SELECT * FROM posts LIMIT $1`, [limit]);
  const posts: Post[] = postsResult.rows;

  // 2. 各投稿ごとにユーザー情報を取得 (N回のクエリ)
  for (const post of posts) {
    const userResult = await query("SELECT * FROM users WHERE id = $1", [
      post.user_id,
    ]);
    post.user = userResult.rows[0];
  }

  // 3. 各投稿ごとにコメントを取得 (さらにN回のクエリ)
  for (const post of posts) {
    const commentsResult = await query(
      "SELECT * FROM comments WHERE post_id = $1",
      [post.id]
    );
    post.comments = commentsResult.rows;
  }

  return posts;
}

/**
 * N+1問題の解決: JOINを使用
 */
export async function fetchPostsWithJoin(limit: number = 10): Promise<Post[]> {
  const result = await query(
    `
    SELECT 
      p.id as post_id,
      p.title,
      p.content,
      p.published_at,
      p.created_at as post_created_at,
      u.id as user_id,
      u.name as user_name,
      u.email as user_email,
      json_agg(
        DISTINCT jsonb_build_object(
          'id', c.id,
          'body', c.body,
          'created_at', c.created_at,
          'user_id', c.user_id
        )
      ) FILTER (WHERE c.id IS NOT NULL) as comments
    FROM posts p
    INNER JOIN users u ON p.user_id = u.id
    LEFT JOIN comments c ON p.id = c.post_id
    WHERE p.id <= $1
    GROUP BY p.id, p.title, p.content, p.published_at, p.created_at, u.id, u.name, u.email
    ORDER BY p.id
  `,
    [limit]
  );

  return result.rows.map((row) => ({
    id: row.post_id,
    title: row.title,
    content: row.content,
    published_at: row.published_at,
    created_at: row.post_created_at,
    user_id: row.user_id,
    user: {
      id: row.user_id,
      name: row.user_name,
      email: row.user_email,
      created_at: new Date(),
    },
    comments: row.comments || [],
  }));
}

/**
 * N+1問題の解決: IN句を使用
 */
export async function fetchPostsWithInClause(
  limit: number = 10
): Promise<Post[]> {
  // 1. 投稿を取得
  const postsResult = await query(`SELECT * FROM posts LIMIT $1`, [limit]);
  const posts: Post[] = postsResult.rows;
  const postIds = posts.map((p) => p.id);
  const userIds = [...new Set(posts.map((p) => p.user_id))];

  // 2. ユーザーを一括取得
  const usersResult = await query(
    "SELECT * FROM users WHERE id = ANY($1::int[])",
    [userIds]
  );
  const usersMap = new Map(usersResult.rows.map((u) => [u.id, u]));

  // 3. コメントを一括取得
  const commentsResult = await query(
    "SELECT * FROM comments WHERE post_id = ANY($1::int[])",
    [postIds]
  );

  // 4. データを結合
  const commentsMap = new Map<number, Comment[]>();
  for (const comment of commentsResult.rows) {
    if (!commentsMap.has(comment.post_id)) {
      commentsMap.set(comment.post_id, []);
    }
    commentsMap.get(comment.post_id)!.push(comment);
  }

  for (const post of posts) {
    post.user = usersMap.get(post.user_id);
    post.comments = commentsMap.get(post.id) || [];
  }

  return posts;
}
