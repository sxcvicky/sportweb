import type { FastifyReply, FastifyRequest } from "fastify";
import { config } from "../config.js";
import { getDb } from "../db.js";
import { hmac, nowIso, randomId, safeEqual } from "./util.js";

export interface UserRow {
  id: string;
  wecom_external_userid: string | null;
  created_at: string;
  last_seen_at: string;
}

const UID_COOKIE = "yj_uid";
const ADMIN_COOKIE = "yj_admin";

function cookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: config.isProduction && config.appBaseUrl.startsWith("https://"),
    path: "/",
    maxAge: maxAgeSeconds
  };
}

export function ensureUser(request: FastifyRequest, reply: FastifyReply): UserRow {
  const db = getDb();
  const raw = request.cookies[UID_COOKIE] ?? "";
  const dot = raw.lastIndexOf(".");
  if (dot > 0) {
    const uid = raw.slice(0, dot);
    const signature = raw.slice(dot + 1);
    if (safeEqual(signature, hmac(uid, config.appSecret))) {
      const user = db.prepare("SELECT * FROM users WHERE id = ?").get(uid) as UserRow | undefined;
      if (user) {
        db.prepare("UPDATE users SET last_seen_at = ? WHERE id = ?").run(nowIso(), uid);
        return user;
      }
    }
  }

  const id = "u" + randomId(18);
  const now = nowIso();
  db.prepare(
    "INSERT INTO users (id, wecom_external_userid, created_at, last_seen_at) VALUES (?, NULL, ?, ?)"
  ).run(id, now, now);
  reply.setCookie(
    UID_COOKIE,
    `${id}.${hmac(id, config.appSecret)}`,
    cookieOptions(config.sessionTtlDays * 86_400)
  );
  return { id, wecom_external_userid: null, created_at: now, last_seen_at: now };
}

export function verifyAdminPassword(password: string): boolean {
  return safeEqual(password, config.adminPassword);
}

export function setAdminSession(reply: FastifyReply): void {
  const expiresAt = Date.now() + config.adminSessionHours * 3_600_000;
  const payload = `admin:${expiresAt}`;
  reply.setCookie(
    ADMIN_COOKIE,
    `${expiresAt}.${hmac(payload, config.appSecret)}`,
    cookieOptions(config.adminSessionHours * 3600)
  );
}

export function clearAdminSession(reply: FastifyReply): void {
  reply.clearCookie(ADMIN_COOKIE, { path: "/" });
}

export function isAdmin(request: FastifyRequest): boolean {
  const raw = request.cookies[ADMIN_COOKIE] ?? "";
  const dot = raw.indexOf(".");
  if (dot <= 0) return false;
  const expiresAt = Number(raw.slice(0, dot));
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;
  const signature = raw.slice(dot + 1);
  return safeEqual(signature, hmac(`admin:${expiresAt}`, config.appSecret));
}

export function requireAdmin(request: FastifyRequest, reply: FastifyReply): boolean {
  if (isAdmin(request)) return true;
  reply.code(401).send({ error: "unauthorized", message: "请先登录后台" });
  return false;
}

export function assertSameOrigin(request: FastifyRequest): void {
  if (config.env !== "production") return;
  const origin = request.headers.origin;
  if (!origin) return;
  const allowed = new URL(config.appBaseUrl).origin;
  if (origin !== allowed) {
    const error = new Error("跨站请求被拒绝");
    (error as any).statusCode = 403;
    throw error;
  }
}
