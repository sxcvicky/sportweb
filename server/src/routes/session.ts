import type { FastifyInstance } from "fastify";
import { config } from "../config.js";
import { getDb } from "../db.js";
import { ensureUser } from "../lib/auth.js";
import { nowIso, randomId } from "../lib/util.js";

const ALLOWED_EVENTS = new Set([
  "page_view",
  "stage_select",
  "form_start",
  "step_complete",
  "submit",
  "lead_page_view",
  "lead_continue",
  "report_start",
  "report_view",
  "cta_deep_report",
  "pay_page_view",
  "pay_complete",
  "copy_wechat",
  "view_sample"
]);

export async function sessionRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/health", async () => ({
    ok: true,
    now: nowIso(),
    env: config.env,
    llm: config.llm.mode,
    wecom: config.wecom.mode,
    pay: config.pay.mode
  }));

  app.get("/api/config", async () => ({
    price: config.pay.amountCents / 100,
    amountCents: config.pay.amountCents,
    llmMode: config.llm.mode,
    llmModel: config.llm.model,
    payMode: config.pay.mode,
    wecomMode: config.wecom.mode,
    wechatId: config.wecom.wechatId
  }));

  app.get("/api/session", async (request, reply) => {
    const user = ensureUser(request, reply);
    return { user: { id: user.id } };
  });

  app.post<{ Body: { type?: string; diagnosisId?: string; meta?: Record<string, unknown> } }>(
    "/api/events",
    {
      config: { rateLimit: { max: 120, timeWindow: "1 minute" } }
    },
    async (request, reply) => {
      const user = ensureUser(request, reply);
      const type = String(request.body?.type ?? "");
      if (!ALLOWED_EVENTS.has(type)) {
        return reply.code(400).send({ error: "bad_event" });
      }
      const diagnosisId = request.body?.diagnosisId
        ? String(request.body.diagnosisId).slice(0, 80)
        : null;
      getDb()
        .prepare(
          "INSERT INTO events (id, user_id, diagnosis_id, type, meta_json, created_at) VALUES (?, ?, ?, ?, ?, ?)"
        )
        .run(
          "e" + randomId(14),
          user.id,
          diagnosisId,
          type,
          JSON.stringify(request.body?.meta ?? {}).slice(0, 4000),
          nowIso()
        );
      return { ok: true };
    }
  );
}
