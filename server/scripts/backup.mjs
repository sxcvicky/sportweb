import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const source = process.env.DATABASE_PATH || "./data/app.db";
const backupDir = process.env.BACKUP_DIR || "./backups";
const keep = Number(process.env.BACKUP_KEEP || "14");

if (!fs.existsSync(source)) {
  console.error("[backup] 数据库不存在：", source);
  process.exit(1);
}
fs.mkdirSync(backupDir, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const target = path.join(backupDir, `app-${stamp}.db`);
const db = new Database(source, { readonly: true });
db.backup(target)
  .then(() => {
    db.close();
    console.log("[backup] 已备份：", target);
    const files = fs
      .readdirSync(backupDir)
      .filter((file) => file.endsWith(".db"))
      .sort()
      .reverse();
    for (const old of files.slice(keep)) {
      fs.unlinkSync(path.join(backupDir, old));
      console.log("[backup] 清理：", old);
    }
  })
  .catch((error) => {
    console.error("[backup] 失败：", error.message);
    process.exit(1);
  });
