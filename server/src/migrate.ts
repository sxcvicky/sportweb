import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getDb } from "./db.js";

const here = path.dirname(fileURLToPath(import.meta.url));

function migrationsDir(): string {
  const local = path.resolve(here, "../migrations");
  if (fs.existsSync(local)) return local;
  return path.resolve(process.cwd(), "migrations");
}

export function migrate(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const applied = new Set(
    db.prepare("SELECT version FROM schema_migrations").all().map((row: any) => row.version)
  );

  const files = fs
    .readdirSync(migrationsDir())
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(migrationsDir(), file), "utf8");
    const run = db.transaction(() => {
      db.exec(sql);
      db.prepare("INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)").run(
        file,
        new Date().toISOString()
      );
    });
    run();
    console.log("[db] migration applied:", file);
  }
}
