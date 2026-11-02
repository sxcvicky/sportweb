import type { FastifyInstance } from "fastify";
import { config } from "../config.js";
import { ensureUser } from "../lib/auth.js";
import { getByToken, isPaid } from "../services/diagnoses.js";
import {
  getOrder,
  getOrCreateOrder,
  markOrderPaid,
  toOrderDto
} from "../services/orders.js";
import { parseNotify } from "../integrations/wechatpay.js";

export async function orderRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: { token?: string } }>(
    "/api/orders",
    { config: { rateLimit: { max: 30, timeWindow: "1 hour" } } },
    async (request, reply) => {
      const user = ensureUser(request, reply);
      const token = String(request.body?.token ?? "");
      const row = getByToken(token);
      if (!row) return reply.code(404).send({ error: "not_found", message: "找不到这份诊断。" });
      if (row.status !== "ready") {
        return reply.code(409).send({
          error: "report_not_ready",
          message: "报告还没生成好，生成后再付款。"
        });
      }
      if (isPaid(row.id)) {
        const order = await getOrCreateOrder(row, user);
        return { order: await toOrderDto(order), alreadyPaid: true };
      }
      try {
        const order = await getOrCreateOrder(row, user);
        return { order: await toOrderDto(order), alreadyPaid: false };
      } catch (error) {
        return reply.code(503).send({
          error: "pay_unavailable",
          message: (error as Error).message || "支付暂不可用"
        });
      }
    }
  );

  app.get<{ Params: { id: string } }>("/api/orders/:id", async (request, reply) => {
    const user = ensureUser(request, reply);
    const order = getOrder(request.params.id);
    if (!order || order.user_id !== user.id) {
      return reply.code(404).send({ error: "not_found" });
    }
    return { order: await toOrderDto(order) };
  });

  app.post<{ Params: { id: string } }>(
    "/api/orders/:id/mock-pay",
    { config: { rateLimit: { max: 30, timeWindow: "1 hour" } } },
    async (request, reply) => {
      if (config.pay.mode !== "mock") {
        return reply.code(403).send({ error: "mock_disabled" });
      }
      const user = ensureUser(request, reply);
      const order = getOrder(request.params.id);
      if (!order || order.user_id !== user.id) {
        return reply.code(404).send({ error: "not_found" });
      }
      const paid = markOrderPaid(order.id, { mock: true, at: new Date().toISOString() });
      return { order: await toOrderDto(paid!), paid: true };
    }
  );

  app.post("/api/pay/wechat/notify", async (request, reply) => {
    if (config.pay.mode !== "wechat") {
      return reply.code(404).send({ code: "FAIL", message: "未启用微信支付" });
    }
    try {
      const rawBody = (request as any).rawBody as string;
      const parsed = parseNotify(rawBody, {
        timestamp: request.headers["wechatpay-timestamp"] as string,
        nonce: request.headers["wechatpay-nonce"] as string,
        signature: request.headers["wechatpay-signature"] as string,
        serial: request.headers["wechatpay-serial"] as string
      });
      const data = parsed.data as {
        out_trade_no?: string;
        transaction_id?: string;
        trade_state?: string;
        amount?: { total?: number };
      };
      if (!data.out_trade_no || data.trade_state !== "SUCCESS") {
        return reply.send({ code: "SUCCESS", message: "忽略非成功状态" });
      }
      const order = getOrder(data.out_trade_no);
      if (!order) return reply.code(404).send({ code: "FAIL", message: "订单不存在" });
      if (data.amount?.total !== order.amount_cents) {
        return reply.code(400).send({ code: "FAIL", message: "金额不一致" });
      }
      markOrderPaid(order.id, parsed.data);
      return reply.send({ code: "SUCCESS", message: "成功" });
    } catch (error) {
      console.error("[pay] 微信回调失败：", (error as Error).message);
      return reply.code(400).send({ code: "FAIL", message: "回调校验失败" });
    }
  });
}
