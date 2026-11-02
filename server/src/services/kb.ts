import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { config } from "../config.js";
import { getDb } from "../db.js";
import type { Stage } from "../types.js";
import { nowIso, parseJson } from "../lib/util.js";

export interface KbDoc {
  id: string;
  layer: string;
  title: string;
  body: string;
  industry: string;
  market: string;
  platform: string;
  stage: string;
  topic: string;
  source_name: string | null;
  source_url: string | null;
  source_type: string;
  updated_at: string;
  confidence: string;
  tags: string[];
  stale: number;
}

const INDUSTRY_MAP: Record<string, string> = {
  "3C 配件": "3c",
  "家居小件": "home",
  "服饰饰品": "apparel",
  "美妆工具": "beauty",
  "宠物小件": "pet",
  "户外小件": "outdoor",
  母婴用品: "baby",
  玩具: "toys",
  汽配: "auto",
  五金工具: "hardware",
  珠宝饰品: "jewelry",
  包装印刷: "packaging"
};

const MARKET_MAP: Record<string, string> = {
  美国: "us",
  欧洲: "eu",
  东南亚: "sea",
  日本: "jp",
  中东: "me",
  巴西: "br",
  智利: "cl",
  拉美: "latam",
  俄罗斯: "ru"
};

const PLATFORM_MAP: Record<string, string> = {
  Amazon: "amazon",
  "TikTok Shop": "tiktok",
  Temu: "temu",
  Ozon: "ozon",
  "Mercado Libre": "mercadolibre",
  独立站: "independent",
  Shopify: "independent"
};

export function seedKb(): void {
  const file = path.join(config.kbDir, "seed.json");
  if (!fs.existsSync(file)) {
    console.warn("[kb] seed.json 不存在，跳过");
    return;
  }
  const docs = JSON.parse(fs.readFileSync(file, "utf8")) as Array<Record<string, unknown>>;
  const db = getDb();
  const upsert = db.prepare(
    `INSERT INTO kb_documents
      (id, layer, title, body, industry, market, platform, stage, topic,
       source_name, source_url, source_type, updated_at, confidence, tags_json, stale)
     VALUES (@id, @layer, @title, @body, @industry, @market, @platform, @stage, @topic,
       @source_name, @source_url, @source_type, @updated_at, @confidence, @tags_json, 0)
     ON CONFLICT(id) DO UPDATE SET
       layer = excluded.layer, title = excluded.title, body = excluded.body,
       industry = excluded.industry, market = excluded.market, platform = excluded.platform,
       stage = excluded.stage, topic = excluded.topic, source_name = excluded.source_name,
       source_url = excluded.source_url, source_type = excluded.source_type,
       updated_at = excluded.updated_at, confidence = excluded.confidence,
       tags_json = excluded.tags_json, stale = 0`
  );
  db.transaction(() => {
    for (const doc of docs) {
      upsert.run({
        id: String(doc.id),
        layer: String(doc.layer ?? "common"),
        title: String(doc.title ?? ""),
        body: String(doc.body ?? ""),
        industry: String(doc.industry ?? "all"),
        market: String(doc.market ?? "all"),
        platform: String(doc.platform ?? "all"),
        stage: String(doc.stage ?? "all"),
        topic: String(doc.topic ?? "general"),
        source_name: doc.source_name ? String(doc.source_name) : null,
        source_url: doc.source_url ? String(doc.source_url) : null,
        source_type: String(doc.source_type ?? "public"),
        updated_at: String(doc.updated_at ?? nowIso().slice(0, 10)),
        confidence: String(doc.confidence ?? "medium"),
        tags_json: JSON.stringify(doc.tags ?? [])
      });
    }
  })();
  console.log(`[kb] seeded ${docs.length} documents`);
}

export function kbVersion(): string {
  const rows = getDb()
    .prepare("SELECT id, updated_at FROM kb_documents ORDER BY id")
    .all() as Array<{ id: string; updated_at: string }>;
  return crypto
    .createHash("sha256")
    .update(rows.map((row) => `${row.id}:${row.updated_at}`).join("|"))
    .digest("hex")
    .slice(0, 16);
}

function rowToDoc(row: any): KbDoc {
  return {
    id: row.id,
    layer: row.layer,
    title: row.title,
    body: row.body,
    industry: row.industry,
    market: row.market,
    platform: row.platform,
    stage: row.stage,
    topic: row.topic,
    source_name: row.source_name,
    source_url: row.source_url,
    source_type: row.source_type,
    updated_at: row.updated_at,
    confidence: row.confidence,
    tags: parseJson<string[]>(row.tags_json, []),
    stale: row.stale
  };
}

function score(doc: KbDoc, ctx: {
  stage: Stage;
  industry: string;
  market: string;
  platform: string;
  keywords: string[];
}): number {
  let value = 0;
  if (doc.stage === ctx.stage) value += 6;
  else if (doc.stage === "all") value += 1;
  else return -1;

  if (doc.industry === ctx.industry) value += 5;
  else if (doc.industry === "all") value += 1;
  else return -1;

  if (doc.market === ctx.market) value += 3;
  else if (doc.market !== "all") return -1;
  else value += 1;

  if (doc.platform === ctx.platform) value += 3;
  else if (doc.platform !== "all") return -1;
  else value += 1;

  const haystack = `${doc.title} ${doc.body} ${doc.tags.join(" ")}`.toLowerCase();
  for (const keyword of ctx.keywords) {
    if (keyword && haystack.includes(keyword.toLowerCase())) value += 2;
  }
  if (doc.confidence === "high") value += 1;
  return value;
}

export function retrieveKb(answers: Record<string, unknown>, stage: Stage, topK = 10): KbDoc[] {
  const category = String(answers.category ?? "");
  const market = String(answers.market ?? "");
  const platform = String(answers.platform ?? "");
  const industry = INDUSTRY_MAP[category] ?? "all";
  const marketCode = MARKET_MAP[market] ?? "all";
  const platformCode = PLATFORM_MAP[platform] ?? "all";
  const keywords = [
    String(answers.product ?? ""),
    String(answers.bottleneck ?? ""),
    String(answers.compliance ?? ""),
    String(answers.concern ?? ""),
    String(answers.goal ?? "")
  ].filter(Boolean);
  if (Array.isArray(answers.concerns)) {
    for (const item of answers.concerns) keywords.push(String(item));
  }

  const docs = (getDb()
    .prepare("SELECT * FROM kb_documents WHERE stale = 0")
    .all() as any[]).map(rowToDoc);

  return docs
    .map((doc) => ({ doc, score: score(doc, { stage, industry, market: marketCode, platform: platformCode, keywords }) }))
    .filter((item) => item.score >= 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((item) => item.doc);
}
