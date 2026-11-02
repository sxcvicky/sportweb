import QRCode from "qrcode";
import { config } from "../config.js";
import { getDb, withTransaction } from "../db.js";
import type { DiagnosisRow, OrderRow, UserRow } from "../types.js";
import { nowIso, randomId } from "../lib/util.js";
import { createNativeOrder } from "../integrations/wechatpay.js";

export function getOrder(id: string): OrderRow | undefined {
  return getDb().prepare("SELECT * FROM orders WHERE id = ?").get(id) as OrderRow | undefined;
}

export function getOrderByDiagnosis(diagnosisId: string): OrderRow | undefined {
  return getDb()
    .prepare("SELECT * FROM orders WHERE diagnosis_id = ? ORDER BY created_at DESC LIMIT 1")
    .get(diagnosisId) as OrderRow | undefined;
}

export function getOrderByProviderOrderId(
  provider: string,
  providerOrderId: string
): OrderRow | undefined {
  return getDb()
    .prepare("SELECT * FROM orders WHERE provider = ? AND provider_order_id = ?")
    .get(provider, providerOrderId) as OrderRow | undefined;
}

export async function getOrCreateOrder(row: DiagnosisRow, user: UserRow): Promise<OrderRow> {
  const existing = getOrderByDiagnosis(row.id);
  if (existing && existing.status === "paid") return existing;
  if (existing && existing.status === "created" && existing.provider === config.pay.mode) {
    return existing;
  }

  const now = nowIso();
  const id = "o" + randomId(16);
  const provider = config.pay.mode;
  let providerOrderId: string | null = null;
  let codeUrl: string | null = null;

  if (provider === "wechat") {
    const nativeOrder = await createNativeOrder({
      outTradeNo: id,
      description: "外贸出海诊断 · 完整版报告",
      amountCents: config.pay.amountCents,
      notifyUrl: config.pay.notifyUrl || `${config.appBaseUrl}/api/pay/wechat/notify`
    });
    providerOrderId = nativeOrder.providerOrderId;
    codeUrl = nativeOrder.codeUrl;
  } else {
    providerOrderId = "mock_" + randomId(12);
  }

  const order: OrderRow = {
    id,
    diagnosis_id: row.id,
    user_id: user.id,
    amount_cents: config.pay.amountCents,
    currency: "CNY",
    provider,
    provider_order_id: providerOrderId,
    status: "created",
    code_url: codeUrl,
    paid_at: null,
    raw_callback_json: null,
    created_at: now,
    updated_at: now
  };

  getDb()
    .prepare(
      `INSERT INTO orders
        (id, diagnosis_id, user_id, amount_cents, currency, provider, provider_order_id,
         status, code_url, paid_at, raw_callback_json, created_at, updated_at)
       VALUES (@id, @diagnosis_id, @user_id, @amount_cents, @currency, @provider,
         @provider_order_id, @status, @code_url, @paid_at, @raw_callback_json, @created_at, @updated_at)`
    )
    .run(order);
  return order;
}

export function markOrderPaid(orderId: string, rawCallback: unknown): OrderRow | undefined {
  const db = getDb();
  const now = nowIso();
  withTransaction(() => {
    db.prepare(
      `UPDATE orders
       SET status = 'paid', paid_at = COALESCE(paid_at, ?), raw_callback_json = ?, updated_at = ?
       WHERE id = ? AND status != 'paid'`
    ).run(now, JSON.stringify(rawCallback ?? {}), now, orderId);
  });
  return getOrder(orderId);
}

export function markOrderPaidByDiagnosis(diagnosisId: string, rawCallback: unknown): OrderRow | undefined {
  const order = getOrderByDiagnosis(diagnosisId);
  if (!order) return undefined;
  return markOrderPaid(order.id, rawCallback);
}

export function createManualPaidOrder(diagnosisId: string, userId: string): OrderRow {
  const now = nowIso();
  const existing = getOrderByDiagnosis(diagnosisId);
  if (existing && existing.status === "paid") return existing;
  const id = existing?.id ?? "o" + randomId(16);
  if (existing) {
    getDb()
      .prepare(
        "UPDATE orders SET status = 'paid', paid_at = ?, raw_callback_json = ?, updated_at = ? WHERE id = ?"
      )
      .run(now, JSON.stringify({ manual: true }), now, id);
    return getOrder(id)!;
  }
  const order: OrderRow = {
    id,
    diagnosis_id: diagnosisId,
    user_id: userId,
    amount_cents: config.pay.amountCents,
    currency: "CNY",
    provider: "manual",
    provider_order_id: null,
    status: "paid",
    code_url: null,
    paid_at: now,
    raw_callback_json: JSON.stringify({ manual: true }),
    created_at: now,
    updated_at: now
  };
  getDb()
    .prepare(
      `INSERT INTO orders
        (id, diagnosis_id, user_id, amount_cents, currency, provider, provider_order_id,
         status, code_url, paid_at, raw_callback_json, created_at, updated_at)
       VALUES (@id, @diagnosis_id, @user_id, @amount_cents, @currency, @provider,
         @provider_order_id, @status, @code_url, @paid_at, @raw_callback_json, @created_at, @updated_at)`
    )
    .run(order);
  return order;
}

export async function toOrderDto(order: OrderRow) {
  let qrDataUrl: string | null = null;
  if (order.code_url) {
    try {
      qrDataUrl = await QRCode.toDataURL(order.code_url, {
        margin: 1,
        width: 320,
        color: { dark: "#1b1a17", light: "#fffdf7" }
      });
    } catch {
      qrDataUrl = null;
    }
  }
  return {
    id: order.id,
    diagnosisId: order.diagnosis_id,
    status: order.status,
    amountCents: order.amount_cents,
    amount: order.amount_cents / 100,
    currency: order.currency,
    provider: order.provider,
    mock: order.provider === "mock",
    qrCodeUrl: order.code_url,
    qrDataUrl,
    paidAt: order.paid_at,
    createdAt: order.created_at
  };
}
