import type { FastifyInstance } from "fastify";
import { config } from "../config.js";
import { ensureUser } from "../lib/auth.js";
import { getByToken, isPaid, toDto } from "../services/diagnoses.js";
import { getReport, reportMeta, toReportPayload } from "../services/reports.js";
import { getOrderByDiagnosis } from "../services/orders.js";

export async function reportRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { token: string } }>(
    "/api/reports/by-token/:token",
    async (request, reply) => {
      ensureUser(request, reply);
      const row = getByToken(request.params.token);
      if (!row) {
        return reply.code(404).send({ error: "not_found", message: "找不到这份诊断报告。" });
      }
      const ageMs = Date.now() - new Date(row.created_at).getTime();
      if (ageMs > config.reportTokenTtlDays * 86_400_000) {
        return reply.code(410).send({
          error: "expired",
          message: "报告链接已过期，请从企微或“我的诊断”重新打开。"
        });
      }

      const paid = isPaid(row.id);
      const reportRow = getReport(row.id);
      const order = getOrderByDiagnosis(row.id);
      return {
        diagnosis: toDto(row, { includeAnswers: true }),
        report: toReportPayload(reportRow, paid),
        reportMeta: reportMeta(reportRow),
        order: order
          ? {
              id: order.id,
              status: order.status,
              amount: order.amount_cents / 100,
              provider: order.provider
            }
          : null,
        paid
      };
    }
  );
}
