import crypto from "node:crypto";
import fs from "node:fs";
import { config } from "../config.js";

export interface NativeOrder {
  providerOrderId: string;
  codeUrl: string;
  raw: unknown;
}

function readKey(path: string): string {
  return fs.readFileSync(path, "utf8");
}

function merchantPrivateKey(): string {
  if (!config.pay.privateKeyPath) throw new Error("缺少 PAY_PRIVATE_KEY_PATH");
  return readKey(config.pay.privateKeyPath);
}

function signRequest(message: string): string {
  return crypto.createSign("RSA-SHA256").update(message).sign(merchantPrivateKey(), "base64");
}

function authorizationHeader(method: string, urlPath: string, body: string): string {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomBytes(16).toString("hex");
  const message = `${method}\n${urlPath}\n${timestamp}\n${nonce}\n${body}\n`;
  const signature = signRequest(message);
  return (
    `WECHATPAY2-SHA256-RSA2048 mchid="${config.pay.mchId}",` +
    `nonce_str="${nonce}",signature="${signature}",timestamp="${timestamp}",` +
    `serial_no="${config.pay.serialNo}"`
  );
}

function requireWechatConfig(): void {
  const missing = [
    ["PAY_APP_ID", config.pay.appId],
    ["PAY_MCH_ID", config.pay.mchId],
    ["PAY_SERIAL_NO", config.pay.serialNo],
    ["PAY_PRIVATE_KEY_PATH", config.pay.privateKeyPath],
    ["PAY_API_V3_KEY", config.pay.apiV3Key]
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);
  if (missing.length) {
    throw new Error("微信支付未配置：" + missing.join("、"));
  }
}

export async function createNativeOrder(params: {
  outTradeNo: string;
  description: string;
  amountCents: number;
  notifyUrl: string;
}): Promise<NativeOrder> {
  requireWechatConfig();
  const urlPath = "/v3/pay/transactions/native";
  const body = JSON.stringify({
    appid: config.pay.appId,
    mchid: config.pay.mchId,
    description: params.description,
    out_trade_no: params.outTradeNo,
    notify_url: params.notifyUrl,
    amount: { total: params.amountCents, currency: "CNY" }
  });

  const response = await fetch("https://api.mch.weixin.qq.com" + urlPath, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: authorizationHeader("POST", urlPath, body)
    },
    body,
    signal: AbortSignal.timeout(15_000)
  });

  const text = await response.text();
  const data = JSON.parse(text || "{}") as { code_url?: string; code?: string; message?: string };
  if (!response.ok || !data.code_url) {
    throw new Error(`微信下单失败：${data.message || data.code || response.status}`);
  }
  return { providerOrderId: params.outTradeNo, codeUrl: data.code_url, raw: data };
}

export interface WechatNotifyHeaders {
  timestamp?: string;
  nonce?: string;
  signature?: string;
  serial?: string;
}

function platformPublicKey(): string {
  if (!config.pay.platformPublicKeyPath) {
    throw new Error("缺少 PAY_PLATFORM_PUBLIC_KEY_PATH，无法验证微信支付回调");
  }
  return readKey(config.pay.platformPublicKeyPath);
}

export function verifyNotifySignature(rawBody: string, headers: WechatNotifyHeaders): void {
  const timestamp = headers.timestamp ?? "";
  const nonce = headers.nonce ?? "";
  const signature = headers.signature ?? "";
  if (!timestamp || !nonce || !signature) throw new Error("微信回调缺少签名头");
  const message = `${timestamp}\n${nonce}\n${rawBody}\n`;
  const ok = crypto
    .createVerify("RSA-SHA256")
    .update(message)
    .verify(platformPublicKey(), signature, "base64");
  if (!ok) throw new Error("微信回调签名校验失败");
}

export function decryptNotifyResource(resource: {
  ciphertext: string;
  nonce: string;
  associated_data?: string;
}): Record<string, unknown> {
  const key = Buffer.from(config.pay.apiV3Key, "utf8");
  const ciphertext = Buffer.from(resource.ciphertext, "base64");
  const authTag = ciphertext.subarray(ciphertext.length - 16);
  const payload = ciphertext.subarray(0, ciphertext.length - 16);
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(resource.nonce, "utf8")
  );
  decipher.setAuthTag(authTag);
  decipher.setAAD(Buffer.from(resource.associated_data ?? "", "utf8"));
  const plain = Buffer.concat([decipher.update(payload), decipher.final()]);
  return JSON.parse(plain.toString("utf8")) as Record<string, unknown>;
}

export function parseNotify(rawBody: string, headers: WechatNotifyHeaders) {
  verifyNotifySignature(rawBody, headers);
  const body = JSON.parse(rawBody) as {
    id?: string;
    event_type?: string;
    resource?: { ciphertext: string; nonce: string; associated_data?: string };
  };
  if (!body.resource) throw new Error("微信回调缺少 resource");
  return {
    eventId: body.id,
    eventType: body.event_type,
    data: decryptNotifyResource(body.resource)
  };
}
