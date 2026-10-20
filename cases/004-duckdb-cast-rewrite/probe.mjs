// Flow Forge case 004: DuckDB optimizer equivalence smoke test.
// Prerequisites: npm install @duckdb/node-api
// Run: node probe.mjs
// Run on a pinned DuckDB engine and compare against a second engine/version separately.
import { DuckDBInstance } from "@duckdb/node-api";

const db = await DuckDBInstance.create(":memory:");
const connection = await db.connect();
const version = (await connection.runAndReadAll("SELECT version() AS version"))
  .getRowObjects()[0].version;

const cases = [
  ["lossy_result", `SELECT list_transform(list_filter(list_transform(l, lambda x: struct_pack(filter := true, result := x)), lambda s: s.filter), lambda s: s.result::BOOLEAN::INTEGER) AS v FROM (VALUES ([2])) t(l)`],
  ["physical_type", `SELECT list_transform(list_filter(list_transform(l, lambda x: struct_pack(filter := true, result := x)), lambda s: s.filter), lambda s: s.result::VARCHAR) AS v FROM (VALUES ([2])) t(l)`],
  ["filter_cast", `SELECT list_transform(list_filter(list_transform(l, lambda x: struct_pack(filter := x, result := x)), lambda s: s.filter::DECIMAL(1,0)::BOOLEAN), lambda s: s.result) AS v FROM (VALUES ([0.1,0.9])) t(l)`],
  ["try_cast", `SELECT list_transform(list_filter(list_transform(l, lambda x: struct_pack(filter := x, result := x)), lambda s: TRY_CAST(s.filter AS BOOLEAN)), lambda s: s.result) AS v FROM (VALUES (['true','bad'])) t(l)`],
  ["plain_comprehension", `SELECT [x FOR x IN [1,2,3] IF x > 1] AS v`],
  ["null_values", `SELECT [x FOR x IN [1,NULL,2] IF x IS NOT NULL] AS v`],
  ["empty_list", `SELECT list_transform(list_filter(list_transform(l, lambda x: struct_pack(filter := true, result := x)), lambda s: s.filter), lambda s: s.result::BOOLEAN::INTEGER) AS v FROM (VALUES ([]::INTEGER[])) t(l)`],
];

// BigInt and DuckDB DECIMAL wrappers need deterministic serialization.
const stringify = (value) =>
  JSON.stringify(value, (_key, item) => (typeof item === "bigint" ? item.toString() : item));

let differences = 0;
for (const [name, sql] of cases) {
  const outputs = [];
  for (const mode of ["enable_optimizer", "disable_optimizer"]) {
    await connection.run(`PRAGMA ${mode}`);
    try {
      outputs.push({ status: "ok", value: stringify(
        (await connection.runAndReadAll(sql)).getRowObjects()
      ) });
    } catch (error) {
      outputs.push({ status: "error", message: String(error) });
    }
  }
  const equal = stringify(outputs[0]) === stringify(outputs[1]);
  // Matching errors are not a passing functional test.
  const passed = equal && outputs.every((x) => x.status === "ok");
  if (!passed) differences++;
  console.log(JSON.stringify({ name, passed, optimizerOn: outputs[0], optimizerOff: outputs[1] }));
}
console.log(JSON.stringify({ version, total: cases.length, differences }));
process.exitCode = differences ? 1 : 0;
