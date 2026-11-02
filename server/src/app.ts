import Fastify from "fastify";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import staticPlugin from "@fastify/static";
import { config } from "./config.js";
import { adminRoutes } from "./routes/admin.js";
import { diagnosisRoutes } from "./routes/diagnoses.js";
import { orderRoutes } from "./routes/orders.js";
import { reportRoutes } from "./routes/reports.js";
import { sessionRoutes } from "./routes/session.js";
import { wecomRoutes } from "./routes/wecom.js";

export async function buildApp() {
  const app = Fastify({
    logger: config.isProduction
      ? true
      : {
          transport: {
            target: "pino-pretty",
            options: { translateTime: "SYS:standard", ignore: "pid,hostname" }
          }
        },
    trustProxy: config.isProduction,
    bodyLimit: 1024 * 1024
  });

  await app.register(cookie);
  await app.register(rateLimit, {
    global: true,
    max: 300,
    timeWindow: "1 minute"
  });

  app.addContentTypeParser("application/json", { parseAs: "string" }, (request, body, done) => {
    const raw = typeof body === "string" ? body : body.toString("utf8");
    (request as any).rawBody = raw;
    try {
      done(null, JSON.parse(raw || "{}"));
    } catch (error) {
      done(error as Error);
    }
  });

  app.addContentTypeParser(
    ["text/xml", "application/xml"],
    { parseAs: "string" },
    (request, body, done) => {
      (request as any).rawBody = typeof body === "string" ? body : body.toString("utf8");
      done(null, body);
    }
  );

  app.addHook("onSend", async (_request, reply, payload) => {
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("Referrer-Policy", "no-referrer");
    reply.header("X-Frame-Options", "DENY");
    reply.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    return payload;
  });

  app.setErrorHandler((error, request, reply) => {
    const status = (error as any).statusCode ?? 500;
    if (status >= 500) {
      request.log.error({ err: error }, "request failed");
    }
    return reply.code(status).send({
      error: status >= 500 ? "server_error" : "request_error",
      message:
        status >= 500 && config.isProduction
          ? "服务开小差了，请稍后再试。"
          : (error as Error).message
    });
  });

  await sessionRoutes(app);
  await diagnosisRoutes(app);
  await reportRoutes(app);
  await orderRoutes(app);
  await wecomRoutes(app);
  await adminRoutes(app);

  await app.register(staticPlugin, {
    root: config.webDir,
    index: ["index.html"],
    setHeaders(reply, filePath) {
      if (!config.isProduction) {
        reply.header("Cache-Control", "no-store");
      } else if (/\.(html|js|css)$/.test(filePath)) {
        reply.header("Cache-Control", "no-cache");
      } else {
        reply.header("Cache-Control", "public, max-age=86400");
      }
    }
  });

  app.setNotFoundHandler((request, reply) => {
    if (request.url.startsWith("/api/")) {
      return reply.code(404).send({ error: "not_found" });
    }
    return reply.code(404).type("text/plain").send("Not Found");
  });

  return app;
}
