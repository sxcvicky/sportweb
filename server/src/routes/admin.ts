import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { getDb } from "../db.js";
import {
  assertSameOrigin,
  clearAdminSession,
  isAdmin,
  requireAdmin,
  setAdminSession,
  verifyAdminPassword
} from "../lib/auth.js";
import { localDate, nowIso, parseJson } from "../lib/util.js";
import {
  adminRetryReport,
  getByPublicId,
  isPaid,
  toDto
} from "../services/diagnoses.js";
import { getReport, reportMeta, toReportPayload } from "../services/reports.js";
import {
  createManualPaidOrder,
  getOrderByDiagnosis,
  toOrderDto
} from "../services/orders.js";

function guard(request: FastifyRequest, reply: FastifyReply): boolean {
  assertSameOrigin(request);
  return requireAdmin(request, reply);
}

export async function adminRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: { password?: string } }>(
    "/api/admin/login",
    { config: { rateLimit: { max: 10, timeWindow: "15 minutes" } } },
    async (request, reply) => {
      assertSameOrigin(request);
      const password = String(request.body?.password ?? "");
      if (!verifyAdminPassword(password)) {
        return reply.code(401).send({ error: "bad_password", message: "密码不对。" });
      }
      setAdminSession(reply);
      return { ok: true };
    }
  );

  app.post("/api/admin/logout", async (request, reply) => {
    assertSameOrigin(request);
    clearAdminSession(reply);
    return { ok: true };
  });

  app.get("/api/admin/me", async (request) => {
    return { admin: isAdmin(request) };
  });

  app.get<{
    Querystring: { status?: string; stage?: string; q?: string; page?: string; limit?: string };
  }>("/api/admin/diagnoses", async (request, reply) => {
    if (!guard(request, reply)) return;
    const db = getDb();
    const status = String(request.query.status ?? "").slice(0, 20);
    const stage = String(request.query.stage ?? "").slice(0, 20);
    const q = String(request.query.q ?? "").trim().slice(0, 80);
    const page = Math.max(1, Number(request.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(request.query.limit) || 30));
    const offset = (page - 1) * limit;

    const where: string[] = [];
    const params: unknown[] = [];
    if (status) {
      where.push("d.status = ?");
      params.push(status);
    }
    if (stage) {
      where.push("d.stage = ?");
      params.push(stage);
    }
    if (q) {
      where.push("(d.public_id LIKE ? OR d.answers_json LIKE ?)");
      params.push(`%${q}%`, `%${q}%`);
    }
    const whereSql = where.length ? "WHERE " + where.join(" AND ") : "";
    const total = (db.prepare(`SELECT COUNT(*) AS n FROM diagnoses d ${whereSql}`).get(...params) as {
      n: number;
    }).n;
    const rows = db
      .prepare(
        `SELECT d.*,
          (SELECT o.status FROM orders o WHERE o.diagnosis_id = d.id ORDER BY o.created_at DESC LIMIT 1) AS order_status
         FROM diagnoses d ${whereSql}
         ORDER BY d.created_at DESC LIMIT ? OFFSET ?`
      )
      .all(...params, limit, offset) as any[];

    return {
      total,
      page,
      limit,
      diagnoses: rows.map((row) => {
        const answers = parseJson<Record<string, unknown>>(row.answers_json, {});
        return {
          id: row.public_id,
          stage: row.stage,
          status: row.status,
          paid: row.order_status === "paid",
          orderStatus: row.order_status ?? null,
          category: answers.category ?? "",
          product: answers.product ?? "",
          market: answers.market ?? "",
          platform: answers.platform ?? "",
          wecomStatus: row.wecom_status,
          createdAt: row.created_at,
          reportReadyAt: row.report_ready_at,
          token: row.token
        };
      })
    };
  });

  app.get<{ Params: { publicId: string } }>(
    "/api/admin/diagnoses/:publicId",
    async (request, reply) => {
      if (!guard(request, reply)) return;
      const row = getByPublicId(request.params.publicId);
      if (!row) return reply.code(404).send({ error: "not_found" });
      const reportRow = getReport(row.id);
      const paid = isPaid(row.id);
      const order = getOrderByDiagnosis(row.id);
      const events = getDb()
        .prepare("SELECT * FROM events WHERE diagnosis_id = ? ORDER BY created_at DESC LIMIT 100")
        .all(row.public_id) as any[];
      return {
        diagnosis: toDto(row, { includeAnswers: true }),
        report: toReportPayload(reportRow, true),
        reportMeta: reportMeta(reportRow),
        paid,
        order: order ? await toOrderDto(order) : null,
        events: events.map((event) => ({
          type: event.type,
          at: event.created_at,
          meta: parseJson(event.meta_json, {})
        }))
      };
    }
  );

  app.post<{ Params: { publicId: string } }>(
    "/api/admin/diagnoses/:publicId/retry",
    async (request, reply) => {
      if (!guard(request, reply)) return;
      const row = getByPublicId(request.params.publicId);
      if (!row) return reply.code(404).send({ error: "not_found" });
      adminRetryReport(row);
      return { ok: true, status: "generating" };
    }
  );

  app.post<{ Params: { publicId: string } }>(
    "/api/admin/diagnoses/:publicId/mark-paid",
    async (request, reply) => {
      if (!guard(request, reply)) return;
      const row = getByPublicId(request.params.publicId);
      if (!row) return reply.code(404).send({ error: "not_found" });
      const order = createManualPaidOrder(row.id, row.user_id);
      return { ok: true, order: await toOrderDto(order) };
    }
  );

  app.post<{ Params: { publicId: string } }>(
    "/api/admin/diagnoses/:publicId/reject",
    async (request, reply) => {
      if (!guard(request, reply)) return;
      const row = getByPublicId(request.params.publicId);
      if (!row) return reply.code(404).send({ error: "not_found" });
      getDb()
        .prepare("UPDATE diagnoses SET status = 'rejected', updated_at = ? WHERE id = ?")
        .run(nowIso(), row.id);
      return { ok: true };
    }
  );

  app.get("/api/admin/stats", async (request, reply) => {
    if (!guard(request, reply)) return;
    const db = getDb();
    const today = localDate();
    const counts = db
      .prepare(
        `SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
          SUM(CASE WHEN status = 'generating' THEN 1 ELSE 0 END) AS generating,
          SUM(CASE WHEN status = 'ready' THEN 1 ELSE 0 END) AS ready,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed,
          SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected,
          SUM(CASE WHEN date(created_at, 'localtime') = ? THEN 1 ELSE 0 END) AS today
         FROM diagnoses`
      )
      .get(today) as Record<string, number>;
    const orders = db
      .prepare(
        `SELECT
          SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) AS paid,
          SUM(CASE WHEN status = 'paid' THEN amount_cents ELSE 0 END) AS revenue_cents,
          SUM(CASE WHEN status = 'created' THEN 1 ELSE 0 END) AS unpaid
         FROM orders`
      )
      .get() as Record<string, number>;
    const reportsToday = db
      .prepare("SELECT COUNT(*) AS n FROM reports WHERE date(created_at, 'localtime') = ?")
      .get(today) as { n: number };
    return {
      diagnoses: counts,
      orders,
      reportsToday: reportsToday.n
    };
  });
}
