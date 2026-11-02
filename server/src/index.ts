import { buildApp } from "./app.js";
import { assertProductionConfig, config } from "./config.js";
import { closeDb } from "./db.js";
import { startWorker, stopWorker } from "./jobs/reportWorker.js";
import { migrate } from "./migrate.js";
import { seedKb } from "./services/kb.js";

async function main(): Promise<void> {
  assertProductionConfig();
  migrate();
  seedKb();

  const app = await buildApp();
  await app.listen({ host: config.host, port: config.port });
  startWorker();
  app.log.info(
    `外贸出海诊断已启动 http://127.0.0.1:${config.port} · llm=${config.llm.mode} · wecom=${config.wecom.mode} · pay=${config.pay.mode}`
  );

  const shutdown = async (signal: string) => {
    app.log.info(`收到 ${signal}，正在关闭`);
    stopWorker();
    await app.close();
    closeDb();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((error) => {
  console.error("[boot] 启动失败：", error);
  process.exit(1);
});
