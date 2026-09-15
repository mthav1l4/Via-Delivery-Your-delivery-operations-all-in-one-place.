import { queryDatabase } from "@/server/database.mjs";
type Statement = {
  bind(...values: any[]): Statement;
  first<T = any>(): Promise<T | null>;
  all<T = any>(): Promise<{ results: T[] }>;
  run(): Promise<{ meta: { changes: number } }>;
};
export function operationDb() {
  return queryDatabase() as { prepare(sql: string): Statement };
}
