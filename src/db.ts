import { Pool, PoolClient } from "pg";
import * as dotenv from "dotenv";
import { PerformanceMonitor } from "./utils/performance";

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
});

// グローバルなパフォーマンスモニター（テスト時に使用）
export let globalMonitor: PerformanceMonitor | null = null;

export function setGlobalMonitor(monitor: PerformanceMonitor | null) {
  globalMonitor = monitor;
}

export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;

  // パフォーマンスモニターが有効な場合は記録
  if (globalMonitor) {
    globalMonitor.recordQuery(text, duration);
  }

  return res;
};

export const getClient = async (): Promise<PoolClient> => {
  return await pool.connect();
};

export const testConnection = async () => {
  try {
    const result = await pool.query("SELECT NOW()");
    console.log("Database connection test successful:", result.rows[0]);
    return true;
  } catch (error) {
    console.error("Database connection test failed:", error);
    return false;
  }
};

export default pool;
