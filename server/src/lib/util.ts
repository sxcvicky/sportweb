import crypto from "node:crypto";

export function nowIso(): string {
  return new Date().toISOString();
}

export function randomId(bytes = 16): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function hmac(value: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function clampText(value: unknown, max = 2000): string {
  return String(value ?? "").trim().slice(0, max);
}

export function dayKey(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
}

export function localDate(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

export function addDaysIso(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

export function normalizeStage(value: unknown): "not_started" | "starting" | "operating" | "company" {
  const stage = String(value ?? "");
  if (stage === "starting" || stage === "operating" || stage === "company") return stage;
  return "not_started";
}

export function publicBaseUrl(): string {
  return (process.env.APP_BASE_URL ?? "http://127.0.0.1:8787").replace(/\/$/, "");
}
