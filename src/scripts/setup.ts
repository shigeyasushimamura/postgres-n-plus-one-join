import { getClient, testConnection } from "../db";
import * as fs from "fs";
import * as path from "path";

// データベース接続を待つ関数
async function waitForDatabase(
  maxAttempts = 10,
  delayMs = 2000
): Promise<boolean> {
  console.log("Waiting for database to be ready...");

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`Connection attempt ${attempt}/${maxAttempts}...`);

    const isConnected = await testConnection();
    if (isConnected) {
      console.log("Database is ready!");
      return true;
    }

    if (attempt < maxAttempts) {
      console.log(`Waiting ${delayMs}ms before retry...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return false;
}

async function setup() {
  try {
    // データベースの準備ができるまで待つ
    const isReady = await waitForDatabase();
    if (!isReady) {
      throw new Error("Could not connect to database after multiple attempts");
    }

    const client = await getClient();

    try {
      console.log("\nSetting up database schema...");

      const schemaSQL = fs.readFileSync(
        path.join(__dirname, "../../sql_scripts/01_create_schema.sql"),
        "utf8"
      );

      await client.query(schemaSQL);
      console.log("✓ Schema created successfully");

      console.log("\nInserting sample data...");

      const seedSQL = fs.readFileSync(
        path.join(__dirname, "../../sql_scripts/02_insert_sample_data.sql"),
        "utf8"
      );

      await client.query(seedSQL);
      console.log("✓ Sample data inserted successfully");

      // データ件数の確認
      const countResult = await client.query(`
        SELECT 
          (SELECT COUNT(*) FROM users) as users,
          (SELECT COUNT(*) FROM posts) as posts,
          (SELECT COUNT(*) FROM comments) as comments,
          (SELECT COUNT(*) FROM tags) as tags,
          (SELECT COUNT(*) FROM post_tags) as post_tags
      `);

      console.log("\n📊 Data summary:");
      console.table(countResult.rows[0]);
    } finally {
      client.release();
    }

    console.log("\n✅ Database setup completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error setting up database:", error);
    process.exit(1);
  }
}

setup();
