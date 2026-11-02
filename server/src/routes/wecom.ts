import type { FastifyInstance } from "fastify";
import { config } from "../config.js";
import { bindWecom, getByPublicId } from "../services/diagnoses.js";
import {
  decryptWecom,
  parseWecomXml,
  verifyEncryptedSignature,
  verifyUrlSignature
} from "../integrations/wecom.js";

export async function wecomRoutes(app: FastifyInstance): Promise<void> {
  app.get<{
    Querystring: {
      msg_signature?: string;
      timestamp?: string;
      nonce?: string;
      echostr?: string;
    };
  }>("/api/wecom/callback", async (request, reply) => {
    const query = request.query;
    if (config.wecom.mode !== "wecom" || !config.wecom.token || !config.wecom.aesKey) {
      return reply.type("text/plain").send("mock");
    }
    if (
      !query.msg_signature ||
      !query.timestamp ||
      !query.nonce ||
      !query.echostr ||
      !verifyUrlSignature({
        msgSignature: query.msg_signature,
        timestamp: query.timestamp,
        nonce: query.nonce,
        echostr: query.echostr
      })
    ) {
      return reply.code(403).type("text/plain").send("invalid signature");
    }
    try {
      return reply.type("text/plain").send(decryptWecom(query.echostr));
    } catch (error) {
      console.error("[wecom] URL 验证解密失败：", (error as Error).message);
      return reply.code(400).type("text/plain").send("decrypt failed");
    }
  });

  app.post<{
    Querystring: { msg_signature?: string; timestamp?: string; nonce?: string };
  }>("/api/wecom/callback", async (request, reply) => {
    if (config.wecom.mode !== "wecom" || !config.wecom.token || !config.wecom.aesKey) {
      return reply.type("text/plain").send("success");
    }
    try {
      const rawBody = String((request as any).rawBody ?? "");
      const envelope = parseWecomXml(rawBody);
      const encrypted = envelope.Encrypt;
      if (!encrypted) return reply.type("text/plain").send("success");
      if (
        !request.query.msg_signature ||
        !request.query.timestamp ||
        !request.query.nonce ||
        !verifyEncryptedSignature(
          request.query.msg_signature,
          request.query.timestamp,
          request.query.nonce,
          encrypted
        )
      ) {
        return reply.code(403).type("text/plain").send("invalid signature");
      }
      const xml = decryptWecom(encrypted);
      const event = parseWecomXml(xml);
      const externalUserId = event.ExternalUserID || event.FromUserName;
      const state = event.State || "";
      const content = event.Content || "";

      if (event.Event === "change_external_contact" && event.ChangeType === "add_external_contact") {
        if (state && externalUserId) bindWecom(state, externalUserId);
      } else if (content && externalUserId) {
        const match = content.match(/YD-\d{8}-\d{3,}/);
        if (match) bindWecom("diag:" + match[0], externalUserId);
      }
      return reply.type("text/plain").send("success");
    } catch (error) {
      console.error("[wecom] 回调处理失败：", (error as Error).message);
      return reply.type("text/plain").send("success");
    }
  });
}
