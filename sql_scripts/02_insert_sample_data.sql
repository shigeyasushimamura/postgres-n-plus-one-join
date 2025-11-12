-- サンプルデータの挿入
INSERT INTO users (name, email) VALUES
    ('Alice', 'alice@example.com'),
    ('Bob', 'bob@example.com'),
    ('Charlie', 'charlie@example.com'),
    ('David', 'david@example.com'),
    ('Eve', 'eve@example.com');

INSERT INTO tags (name) VALUES
    ('TypeScript'), ('Node.js'), ('PostgreSQL'), ('Performance'), ('Database');

-- 各ユーザーに複数の投稿を作成
DO $$
DECLARE
    user_record RECORD;
    post_count INTEGER;
BEGIN
    FOR user_record IN SELECT id FROM users LOOP
        FOR post_count IN 1..20 LOOP
            INSERT INTO posts (user_id, title, content, published_at)
            VALUES (
                user_record.id,
                'Post ' || post_count || ' by User ' || user_record.id,
                'Content for post ' || post_count,
                CURRENT_TIMESTAMP - (random() * INTERVAL '30 days')
            );
        END LOOP;
    END LOOP;
END $$;

-- 各投稿にコメントを追加
DO $$
DECLARE
    post_record RECORD;
    comment_count INTEGER;
BEGIN
    FOR post_record IN SELECT id FROM posts LOOP
        FOR comment_count IN 1..5 LOOP
            INSERT INTO comments (post_id, user_id, body)
            VALUES (
                post_record.id,
                (SELECT id FROM users ORDER BY RANDOM() LIMIT 1),
                'Comment ' || comment_count || ' on post ' || post_record.id
            );
        END LOOP;
    END LOOP;
END $$;

-- ランダムにタグを付与
DO $$
DECLARE
    post_record RECORD;
    tag_record RECORD;
BEGIN
    FOR post_record IN SELECT id FROM posts LOOP
        FOR tag_record IN 
            SELECT id FROM tags ORDER BY RANDOM() LIMIT (1 + floor(random() * 3))
        LOOP
            INSERT INTO post_tags (post_id, tag_id)
            VALUES (post_record.id, tag_record.id)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END LOOP;
END $$;