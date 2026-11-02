import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { config } from "../config.js";
import { ensureUser } from "../lib/auth.js";
import { canStart, createDiagnosis, enqueueReport, getByToken, listByUser, markWecomClaimed, toDto } from "../services/diagnoses.js";
import { ensureContactQr } from "../integrations/wecom.js";

const createSchema = z.object({
  stage: z.enum(["not_started", "starting", "operating", "company"]),
  answers: z.record(z.string(), z.unknown()),
  source: z.string().max(200).optional()
});

async function dtoWithQr(row: ReturnType<typeof getByToken>) {
  if (!row) return null;
  if (row.status === "pending") {
    try {
      await ensureContactQr(row);
    } catch (error) {
      console.warn("[wecom] 活码生成失败：", (error as Error).message);
    }
  }
  return toDto(getByToken(row.token)!);
}

export async function diagnosisRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    "/api/diagnoses",
    { config: { rateLimit: { max: config.createDiagnosisHourlyLimit, timeWindow: "1 hour" } } },
    async (request, reply) => {
      const parsed = createSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: "bad_request", message: "请把档位和答案填写完整。" });
      }
      const user = ensureUser(request, reply);
      const row = createDiagnosis({
        user,
        stage: parsed.data.stage,
        answers: parsed.data.answers,
        source: parsed.data.source
      });
      const dto = toDto(row);
      return reply.code(201).send({
        diagnosis: dto,
        leadUrl: `${config.appBaseUrl}/lead.html?token=${encodeURIComponent(row.token)}`,
        reportUrl: `${config.appBaseUrl}/report.html?token=${encodeURIComponent(row.token)}`
      });
    }
  );

  app.get<{ Params: { token: string } }>(
    "/api/diagnoses/by-token/:token",
    async (request, reply) => {
      ensureUser(request, reply);
      const row = getByToken(request.params.token);
      if (!row) return reply.code(404).send({ error: "not_found", message: "找不到这份诊断。" });
      const dto = await dtoWithQr(row);
      return { diagnosis: dto };
    }
  );

  app.post<{ Params: { token: string } }>(
    "/api/diagnoses/by-token/:token/wecom-claim",
    { config: { rateLimit: { max: 30, timeWindow: "1 hour" } } },
    async (request, reply) => {
      ensureUser(request, reply);
      const row = getByToken(request.params.token);
      if (!row) return reply.code(404).send({ error: "not_found", message: "找不到这份诊断。" });
      const updated = markWecomClaimed(row);
      return { diagnosis: toDto(updated) };
    }
  );

  app.post<{ Params: { token: string } }>(
    "/api/diagnoses/by-token/:token/start",
    { config: { rateLimit: { max: 30, timeWindow: "1 hour" } } },
    async (request, reply) => {
      ensureUser(request, reply);
      const row = getByToken(request.params.token);
      if (!row) return reply.code(404).send({ error: "not_found", message: "找不到这份诊断。" });
      if (row.status === "ready" || row.status === "generating") {
        return { diagnosis: toDto(row) };
      }
      const check = canStart(row);
      if (!check.ok) {
        return reply.code(409).send({ error: "cannot_start", message: check.message });
      }
      enqueueReport(row);
      const updated = getByToken(row.token)!;
      return reply.code(202).send({ diagnosis: toDto(updated) });
    }
  );

  app.get("/api/my/diagnoses", async (request, reply) => {
    const user = ensureUser(request, reply);
    const rows = listByUser(user.id);
    return {
      diagnoses: rows.map((row) => toDto(row)),
      count: rows.length
    };
  });
}
