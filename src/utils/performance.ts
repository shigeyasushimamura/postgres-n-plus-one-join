export interface QueryStats {
  queryCount: number;
  totalTime: number;
  queries: Array<{
    sql: string;
    duration: number;
    timestamp: number;
  }>;
}

export class PerformanceMonitor {
  private stats: QueryStats = {
    queryCount: 0,
    totalTime: 0,
    queries: [],
  };
  private startTime: number = 0;

  start() {
    this.stats = {
      queryCount: 0,
      totalTime: 0,
      queries: [],
    };
    this.startTime = Date.now();
  }

  recordQuery(sql: string, duration: number) {
    this.stats.queryCount++;
    this.stats.totalTime += duration;
    this.stats.queries.push({
      sql: sql.substring(0, 100) + (sql.length > 100 ? "..." : ""),
      duration,
      timestamp: Date.now(),
    });
  }

  getStats(): QueryStats & { elapsedTime: number } {
    return {
      ...this.stats,
      elapsedTime: Date.now() - this.startTime,
    };
  }

  printSummary(label: string) {
    const stats = this.getStats();
    console.log(`\n${"=".repeat(60)}`);
    console.log(`📊 ${label}`);
    console.log(`${"=".repeat(60)}`);
    console.log(`クエリ数: ${stats.queryCount}`);
    console.log(`合計クエリ時間: ${stats.totalTime.toFixed(2)}ms`);
    console.log(`全体実行時間: ${stats.elapsedTime.toFixed(2)}ms`);
    console.log(
      `平均クエリ時間: ${(stats.totalTime / stats.queryCount).toFixed(2)}ms`
    );
    console.log(`${"=".repeat(60)}\n`);
  }

  printDetailedQueries() {
    console.log("\n📝 実行されたクエリの詳細:");
    this.stats.queries.forEach((q, idx) => {
      console.log(`\n[Query ${idx + 1}] ${q.duration.toFixed(2)}ms`);
      console.log(`SQL: ${q.sql}`);
    });
  }
}

export function formatDuration(ms: number): string {
  if (ms < 1) {
    return `${(ms * 1000).toFixed(2)}μs`;
  } else if (ms < 1000) {
    return `${ms.toFixed(2)}ms`;
  } else {
    return `${(ms / 1000).toFixed(2)}s`;
  }
}

export function comparePerformance(
  baseline: QueryStats & { elapsedTime: number },
  optimized: QueryStats & { elapsedTime: number }
) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`📈 パフォーマンス比較`);
  console.log(`${"=".repeat(60)}`);

  const queryReduction = (
    ((baseline.queryCount - optimized.queryCount) / baseline.queryCount) *
    100
  ).toFixed(1);
  const timeReduction = (
    ((baseline.elapsedTime - optimized.elapsedTime) / baseline.elapsedTime) *
    100
  ).toFixed(1);

  console.log(`\nクエリ数の削減:`);
  console.log(`  Before: ${baseline.queryCount} queries`);
  console.log(`  After:  ${optimized.queryCount} queries`);
  console.log(`  削減率: ${queryReduction}% 🎯`);

  console.log(`\n実行時間の改善:`);
  console.log(`  Before: ${formatDuration(baseline.elapsedTime)}`);
  console.log(`  After:  ${formatDuration(optimized.elapsedTime)}`);
  console.log(`  改善率: ${timeReduction}% ⚡`);

  const speedup = (baseline.elapsedTime / optimized.elapsedTime).toFixed(2);
  console.log(`\n🚀 約${speedup}倍高速化されました！`);
  console.log(`${"=".repeat(60)}\n`);
}
