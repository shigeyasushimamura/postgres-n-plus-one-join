import { testConnection } from "../db";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("Testing database connection...");
  console.log("DATABASE_URL:", process.env.DATABASE_URL);

  const isConnected = await testConnection();

  if (isConnected) {
    console.log("✅ Connection successful!");
    process.exit(0);
  } else {
    console.log("❌ Connection failed!");
    process.exit(1);
  }
}

main();
