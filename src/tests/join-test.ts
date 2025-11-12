import {
  innerJoinExample,
  leftJoinExample,
  multipleJoinsExample,
  subqueryJoinExample,
} from "../queries/join-types";
import { setGlobalMonitor } from "../db";
import { PerformanceMonitor } from "../utils/performance";

async function runJoinTest(name: string, testFn: () => Promise<any>) {
  const monitor = new PerformanceMonitor();
  setGlobalMonitor(monitor);

  console.log(`\n${"=".repeat(60)}`);
  console.log(`🔍 ${name}`);
  console.log(`${"=".repeat(60)}`);

  monitor.start();
  await testFn();
  setGlobalMonitor(null);

  monitor.printSummary(name);
}

async function main() {
  console.log("\n" + "=".repeat(70));
  console.log("🔗 JOIN種類のパフォーマンステスト");
  console.log("=".repeat(70));

  await runJoinTest("INNER JOIN", innerJoinExample);
  await runJoinTest("LEFT JOIN", leftJoinExample);
  await runJoinTest("複数JOIN", multipleJoinsExample);
  await runJoinTest("サブクエリJOIN", subqueryJoinExample);

  console.log("\n" + "=".repeat(70));
  console.log("✅ 全てのJOINテストが完了しました！");
  console.log("=".repeat(70) + "\n");

  process.exit(0);
}

main().catch(console.error);
