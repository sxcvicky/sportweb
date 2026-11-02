import crypto from "node:crypto";
import { config } from "../config.js";
import { getDb } from "../db.js";
import type { DiagnosisRow } from "../types.js";

interface TokenCache {
  token: string;
  expiresAt: number;
}

const tokenCache = new Map<string, TokenCache>();

async function accessToken(secret: string): Promise<string> {
  const cached = tokenCache.get(secret);
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;
  const url =
    "https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=" +
    encodeURIComponent(config.wecom.corpId) +
    "&corpsecret=" +
    encodeURIComponent(secret);
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  const data = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
    errmsg?: string;
  };
  if (!data.access_token) throw new Error("企微 access_token 获取失败：" + (data.errmsg || "未知错误"));
  tokenCache.set(secret, {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 7200) * 1000
  });
  return data.access_token;
}

function wecomReady(): boolean {
  return Boolean(
    config.wecom.mode === "wecom" &&
      config.wecom.corpId &&
      config.wecom.contactSecret &&
      config.wecom.staffUserId
  );
}

export async function ensureContactQr(row: DiagnosisRow): Promise<string | null> {
  if (row.wecom_qr_url) return row.wecom_qr_url;
  if (config.wecom.qrUrl) return config.wecom.qrUrl;
  if (!wecomReady()) return null;

  const token = await accessToken(config.wecom.contactSecret);
  const response = await fetch(
    "https://qyapi.weixin.qq.com/cgi-bin/externalcontact/add_contact_way?access_token=" +
      encodeURIComponent(token),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: 1,
        scene: 1,
        style: 1,
        skip_verify: true,
        state: "diag:" + row.public_id,
        user: [config.wecom.staffUserId]
      }),
      signal: AbortSignal.timeout(10_000)
    }
  );
  const data = (await response.json()) as { qr_code?: string; errmsg?: string };
  if (!data.qr_code) throw new Error("企微活码创建失败：" + (data.errmsg || "未知错误"));
  getDb()
    .prepare("UPDATE diagnoses SET wecom_qr_url = ?, updated_at = ? WHERE id = ?")
    .run(data.qr_code, new Date().toISOString(), row.id);
  return data.qr_code;
}

export async function notifyStaff(text: string): Promise<boolean> {
  if (config.wecom.mode !== "wecom") {
    console.log("[wecom:mock] 员工通知：", text);
    return true;
  }
  if (!config.wecom.corpId || !config.wecom.agentId || !config.wecom.secret || !config.wecom.staffUserId) {
    console.warn("[wecom] 未配置员工通知，跳过");
    return false;
  }
  try {
    const token = await accessToken(config.wecom.secret);
    const response = await fetch(
      "https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=" + encodeURIComponent(token),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          touser: config.wecom.staffUserId,
          msgtype: "text",
          agentid: Number(config.wecom.agentId),
          text: { content: text }
        }),
        signal: AbortSignal.timeout(10_000)
      }
    );
    const data = (await response.json()) as { errcode?: number; errmsg?: string };
    if (data.errcode !== 0) {
      console.warn("[wecom] 员工通知失败：", data.errmsg);
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[wecom] 员工通知异常：", (error as Error).message);
    return false;
  }
}

function aesKey(): Buffer {
  return Buffer.from((config.wecom.aesKey || "") + "=", "base64");
}

export function verifyUrlSignature(params: {
  msgSignature: string;
  timestamp: string;
  nonce: string;
  echostr: string;
}): boolean {
  const raw = [config.wecom.token, params.timestamp, params.nonce, params.echostr].sort().join("");
  const signature = crypto.createHash("sha1").update(raw).digest("hex");
  return signature === params.msgSignature;
}

export function decryptWecom(encrypted: string): string {
  const key = aesKey();
  const iv = key.subarray(0, 16);
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  decipher.setAutoPadding(false);
  const decoded = Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64")),
    decipher.final()
  ]);
  const pad = decoded[decoded.length - 1];
  const unpadded = decoded.subarray(0, decoded.length - pad);
  const msgLength = unpadded.readUInt32BE(16);
  return unpadded.subarray(20, 20 + msgLength).toString("utf8");
}

export function verifyEncryptedSignature(msgSignature: string, timestamp: string, nonce: string, encrypted: string): boolean {
  const raw = [config.wecom.token, timestamp, nonce, encrypted].sort().join("");
  return crypto.createHash("sha1").update(raw).digest("hex") === msgSignature;
}

export function parseWecomXml(xml: string): Record<string, string> {
  const result: Record<string, string> = {};
  const pattern = /<([A-Za-z0-9_]+)>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/\1>/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(xml))) {
    result[match[1]] = match[2];
  }
  return result;
}
