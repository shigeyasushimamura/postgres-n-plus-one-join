import {
  fetchPostsWithN1Problem,
  fetchPostsWithJoin,
  fetchPostsWithInClause,
} from "../queries/n-plus-one";
import { setGlobalMonitor } from "../db";
import { PerformanceMonitor, comparePerformance } from "../utils/performance";

async function runTest(name: string, testFn: () => Promise<any>) {
  const monitor = new PerformanceMonitor();
  setGlobalMonitor(monitor);

  console.log(`\n🏃 ${name} を実行中...`);
  monitor.start();

  const result = await testFn();

  setGlobalMonitor(null);
  monitor.printSummary(name);

  return { result, stats: monitor.getStats() };
}

async function main() {
  console.log("\n" + "=".repeat(70));
  console.log("🔬 N+1 問題のパフォーマンステスト");
  console.log("=".repeat(70));

  const testSizes = [10, 50, 100];

  for (const size of testSizes) {
    console.log(`\n\n${"#".repeat(70)}`);
    console.log(`# テストサイズ: ${size}件の投稿`);
    console.log(`${"#".repeat(70)}`);

    // N+1問題あり
    const { stats: n1Stats } = await runTest(`❌ N+1問題あり (${size}件)`, () =>
      fetchPostsWithN1Problem(size)
    );

    // JOINで解決
    const { stats: joinStats } = await runTest(`✅ JOIN使用 (${size}件)`, () =>
      fetchPostsWithJoin(size)
    );

    // IN句で解決
    const { stats: inStats } = await runTest(`✅ IN句使用 (${size}件)`, () =>
      fetchPostsWithInClause(size)
    );

    // 比較
    console.log(`\n${"─".repeat(70)}`);
    console.log(`📊 ${size}件での比較: N+1問題 vs JOIN`);
    console.log(`${"─".repeat(70)}`);
    comparePerformance(n1Stats, joinStats);

    console.log(`\n${"─".repeat(70)}`);
    console.log(`📊 ${size}件での比較: N+1問題 vs IN句`);
    console.log(`${"─".repeat(70)}`);
    comparePerformance(n1Stats, inStats);

    console.log(`\n${"─".repeat(70)}`);
    console.log(`📊 ${size}件での比較: JOIN vs IN句`);
    console.log(`${"─".repeat(70)}`);
    comparePerformance(joinStats, inStats);
  }

  console.log("\n\n" + "=".repeat(70));
  console.log("✅ 全てのテストが完了しました！");
  console.log("=".repeat(70) + "\n");

  process.exit(0);
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
