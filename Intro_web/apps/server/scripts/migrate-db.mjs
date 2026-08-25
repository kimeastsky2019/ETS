// Applies apps/server/migrations/*.sql to the libsql endpoint given by the
// SKYBASE_DB_* env, in filename order, and records each one in `_migrations`
// so it is applied exactly once.
//
//   set -a; . /etc/ets-intro.env; set +a
//   node apps/server/scripts/migrate-db.mjs
//
// Deliberately dependency-free (Hrana v2 pipeline over plain fetch): the deploy
// host installs only the bundled server, so there is no node_modules to import
// @libsql/client from.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const dir = process.argv[2] ?? path.join(here, "..", "migrations");

const endpoint = (process.env.SKYBASE_DB_ENDPOINT ?? "").replace(/\/+$/, "");
const token = process.env.SKYBASE_DB_TOKEN ?? process.env.SKYBASE_DB_AUTH_TOKEN ?? "";
const namespace = process.env.SKYBASE_DB_NAMESPACE ?? "";

if (!endpoint) {
  console.error("SKYBASE_DB_ENDPOINT is required");
  process.exit(1);
}

// Strips `--` comments, then splits on statement boundaries. The migrations are
// plain DDL with no semicolons inside string literals.
function statements(sql) {
  return sql
    .split("\n")
    .map((line) => line.replace(/--.*$/, ""))
    .join("\n")
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);
}

async function pipeline(requests) {
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (namespace) {
    headers["x-namespace"] = namespace;
  }

  const response = await fetch(`${endpoint}/v2/pipeline`, {
    method: "POST",
    headers,
    body: JSON.stringify({ requests: [...requests, { type: "close" }] })
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${await response.text()}`);
  }

  const body = await response.json();
  const failed = body.results?.find((result) => result.type === "error");
  if (failed) {
    throw new Error(failed.error?.message ?? "statement failed");
  }

  return body.results ?? [];
}

const exec = (sql, args = []) => pipeline([{ type: "execute", stmt: { sql, args } }]);
const text = (value) => ({ type: "text", value });
const rowsOf = (results) => results[0].response.result.rows;

await exec(
  "CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"
);

const applied = new Set(rowsOf(await exec("select name from _migrations")).map((row) => row[0].value));

const files = readdirSync(dir).filter((name) => name.endsWith(".sql")).sort();
if (files.length === 0) {
  console.error(`no .sql files in ${dir}`);
  process.exit(1);
}

let ran = 0;
for (const name of files) {
  if (applied.has(name)) {
    console.log(`skip    ${name} (already applied)`);
    continue;
  }

  const sql = statements(readFileSync(path.join(dir, name), "utf8"));
  await pipeline(sql.map((statement) => ({ type: "execute", stmt: { sql: statement } })));
  await exec("insert into _migrations (name) values (?)", [text(name)]);
  console.log(`applied ${name} (${sql.length} statements)`);
  ran += 1;
}

const tables = rowsOf(
  await exec("select name from sqlite_master where type = 'table' and name not like 'sqlite_%' order by name")
).map((row) => row[0].value);

console.log(`\n${ran} migration(s) applied, ${files.length - ran} already present`);
console.log(`tables: ${tables.join(", ")}`);
