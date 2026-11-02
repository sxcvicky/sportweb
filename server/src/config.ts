import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.resolve(here, "..");
const projectDir = path.resolve(serverDir, "..");

dotenv.config({ path: path.join(projectDir, ".env") });
dotenv.config({ path: path.join(serverDir, ".env") });

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

function num(name: string, fallback: number): number {
  const value = Number(env(name));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export const config = {
  env: env("NODE_ENV", "development"),
  host: env("HOST", "0.0.0.0"),
  port: num("PORT", 8787),
  appBaseUrl: env("APP_BASE_URL", "http://127.0.0.1:8787").replace(/\/$/, ""),
  appSecret: env("APP_SECRET", "dev-only-change-me"),
  adminPassword: env("ADMIN_PASSWORD", "admin123"),
  sessionTtlDays: num("SESSION_TTL_DAYS", 365),
  adminSessionHours: num("ADMIN_SESSION_HOURS", 12),

  databasePath: path.resolve(serverDir, env("DATABASE_PATH", "./data/app.db")),
  webDir: path.resolve(projectDir, env("WEB_DIR", "web")),
  promptDir: path.resolve(serverDir, "prompts"),
  kbDir: path.resolve(serverDir, "kb"),

  reportTokenTtlDays: num("REPORT_TOKEN_TTL_DAYS", 90),
  reportRetentionDays: num("REPORT_RETENTION_DAYS", 365),
  freeReportDailyLimit: num("FREE_REPORT_DAILY_LIMIT", 3),
  reportDailyGlobalLimit: num("REPORT_DAILY_GLOBAL_LIMIT", 200),
  createDiagnosisHourlyLimit: num("CREATE_DIAGNOSIS_HOURLY_LIMIT", 20),

  llm: {
    mode: env("LLM_MODE", "mock") as "mock" | "deepseek",
    baseUrl: env("LLM_BASE_URL", "https://api.deepseek.com").replace(/\/$/, ""),
    apiKey: env("LLM_API_KEY"),
    model: env("LLM_MODEL", "deepseek-chat"),
    timeoutMs: num("LLM_TIMEOUT_MS", 120_000),
    maxTokens: num("LLM_MAX_TOKENS", 6000),
    temperature: Number(env("LLM_TEMPERATURE", "0.4"))
  },

  wecom: {
    mode: env("WECOM_MODE", "mock") as "mock" | "wecom",
    corpId: env("WECOM_CORP_ID"),
    agentId: env("WECOM_AGENT_ID"),
    secret: env("WECOM_SECRET"),
    contactSecret: env("WECOM_CONTACT_SECRET"),
    token: env("WECOM_TOKEN"),
    aesKey: env("WECOM_AES_KEY"),
    staffUserId: env("WECOM_STAFF_USER_ID"),
    qrUrl: env("WECOM_QR_URL"),
    wechatId: env("WECOM_WECHAT_ID", "yueji-service")
  },

  pay: {
    mode: env("PAY_MODE", "mock") as "mock" | "wechat",
    amountCents: num("PAY_AMOUNT_CENTS", 990),
    appId: env("PAY_APP_ID"),
    mchId: env("PAY_MCH_ID"),
    apiV3Key: env("PAY_API_V3_KEY"),
    serialNo: env("PAY_SERIAL_NO"),
    privateKeyPath: env("PAY_PRIVATE_KEY_PATH"),
    platformPublicKeyPath: env("PAY_PLATFORM_PUBLIC_KEY_PATH"),
    notifyUrl: env("PAY_NOTIFY_URL")
  },

  isProduction: env("NODE_ENV", "development") === "production"
};

export function assertProductionConfig(): void {
  if (!config.isProduction) return;
  const problems: string[] = [];
  if (config.appSecret === "dev-only-change-me") problems.push("APP_SECRET");
  if (config.adminPassword === "admin123") problems.push("ADMIN_PASSWORD");
  if (config.llm.mode === "deepseek" && !config.llm.apiKey) problems.push("LLM_API_KEY");
  if (config.wecom.mode === "wecom") {
    if (!config.wecom.corpId) problems.push("WECOM_CORP_ID");
    if (!config.wecom.agentId) problems.push("WECOM_AGENT_ID");
    if (!config.wecom.secret) problems.push("WECOM_SECRET");
    if (!config.wecom.contactSecret) problems.push("WECOM_CONTACT_SECRET");
    if (!config.wecom.token) problems.push("WECOM_TOKEN");
    if (!config.wecom.aesKey) problems.push("WECOM_AES_KEY");
    if (!config.wecom.staffUserId) problems.push("WECOM_STAFF_USER_ID");
  }
  if (config.pay.mode === "wechat") {
    if (!config.pay.appId) problems.push("PAY_APP_ID");
    if (!config.pay.mchId) problems.push("PAY_MCH_ID");
    if (!config.pay.serialNo) problems.push("PAY_SERIAL_NO");
    if (!config.pay.privateKeyPath) problems.push("PAY_PRIVATE_KEY_PATH");
    if (!config.pay.apiV3Key) problems.push("PAY_API_V3_KEY");
    if (!config.pay.platformPublicKeyPath) problems.push("PAY_PLATFORM_PUBLIC_KEY_PATH");
  }
  if (problems.length) {
    throw new Error("生产环境缺少安全配置：" + problems.join("、"));
  }
}
