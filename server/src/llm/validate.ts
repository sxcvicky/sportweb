import { z } from "zod";
import type { FullReport, GeneratedReport, PreviewReport } from "../types.js";
import type { KbDoc } from "../services/kb.js";

const FREE_DIMENSIONS = [
  "阶段与增长目标",
  "品类与产品机会",
  "市场与平台机会",
  "流量与转化",
  "增长来源",
  "成本与利润"
];
const SOLUTION_KEYS = ["growth", "efficiency", "scale", "rhythm"] as const;
const SOLUTION_TITLES: Record<(typeof SOLUTION_KEYS)[number], string> = {
  growth: "开源",
  efficiency: "提效",
  scale: "放大",
  rhythm: "90 天节奏与边界"
};

const problemSchema = z.object({
  dimension: z.string().min(2).max(40),
  title: z.string().min(2).max(40),
  finding: z.string().min(8).max(300),
  evidence: z.string().min(4).max(300)
});

const previewSchema = z.object({
  headline: z.string().min(5).max(160),
  problems: z.array(problemSchema).length(6),
  priority: z.object({
    dimension: z.string().min(2).max(40),
    title: z.string().min(2).max(60),
    why: z.string().min(8).max(600),
    upside: z.string().min(6).max(600)
  }),
  next30: z.string().min(8).max(600),
  firstMove: z.string().min(6).max(600),
  dontRush: z.string().min(4).max(300),
  assumptions: z.array(z.string().max(500)).max(8).default([])
});

const solutionSchema = z.object({
  key: z.enum(SOLUTION_KEYS),
  title: z.string().min(2).max(40),
  judgment: z.string().min(6).max(600),
  actions: z.array(z.string().min(4).max(400)).length(3),
  metric: z.string().min(4).max(400),
  boundary: z.string().max(400).optional(),
  plan: z
    .object({
      d30: z.string().min(4).max(400),
      d60: z.string().min(4).max(400),
      d90: z.string().min(4).max(400)
    })
    .optional()
});

const fullSchema = z.object({
  headline: z.string().min(5).max(160),
  assumptions: z.array(z.string().max(500)).max(10).default([]),
  solutions: z.array(solutionSchema).length(4),
  sources: z
    .array(
      z.object({
        title: z.string().min(1).max(200),
        updated_at: z.string().max(40).optional(),
        url: z.string().max(500).optional()
      })
    )
    .max(20)
    .default([])
});

const reportSchema = z.object({
  preview: previewSchema,
  full: fullSchema
});

const BANNED = [
  "市场很大",
  "做好运营",
  "提升竞争力",
  "加强管理",
  "降本增效",
  "保证出单",
  "保证赚钱",
  "稳赚",
  "躺赚",
  "零风险",
  "包回本",
  "一定赚钱",
  "必赚",
  "0 元开店"
];

const NEGATIVE_TONE = ["亏损", "止损", "亏钱", "致命", "失败", "撑不住", "先停", "而不是"];
const PROFIT_FIRST_MOVE = /(利润表|成本表|单均利润|亏损|止损)/;
const NOT_BUT_STYLE = /不是[^。！？]{0,40}而是/;

const REGULATED =
  /(VAT|EPR|GPSR|HTS|关税|税率|认证|合规|资质|注册|申报)/i;

function allStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(allStrings);
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).flatMap(allStrings);
  }
  return [];
}

export function parseJsonObject(raw: string): unknown {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("模型没有返回 JSON 对象");
  return JSON.parse(cleaned.slice(start, end + 1));
}

export function validateReport(raw: unknown, docs: KbDoc[]): GeneratedReport {
  const parsed = reportSchema.safeParse(raw);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error("报告结构校验失败：" + detail);
  }

  const report = parsed.data;
  const strings = allStrings(report);
  for (const text of strings) {
    if (/<\s*script|javascript:/i.test(text)) {
      throw new Error("报告包含不安全内容");
    }
    const hit = BANNED.find((phrase) => text.includes(phrase));
    if (hit) throw new Error(`报告包含禁用表述：${hit}`);
  }

  const previewStrings = allStrings(report.preview);
  for (const text of previewStrings) {
    const hit = NEGATIVE_TONE.find((phrase) => text.includes(phrase));
    if (hit) throw new Error(`免费版语气不合格，出现“${hit}”`);
    if (NOT_BUT_STYLE.test(text)) throw new Error("免费版避免“不是……而是……”句式");
  }

  if (report.preview.priority.title.includes("最值得先拿")) {
    throw new Error("优先项标题要写具体动作，不要写泛标题");
  }
  if (
    PROFIT_FIRST_MOVE.test(report.preview.firstMove) ||
    PROFIT_FIRST_MOVE.test(report.preview.next30)
  ) {
    throw new Error("免费版的先做和 30 天变化要服务于增长来源，不要写利润表/成本表");
  }

  const dimensions = report.preview.problems.map((problem) => problem.dimension);
  if (dimensions.join("|") !== FREE_DIMENSIONS.join("|")) {
    throw new Error("免费版 6 个增长卡点必须按固定维度顺序输出");
  }
  if (report.preview.priority.dimension !== "增长来源") {
    throw new Error("免费版的优先项必须来自“增长来源”，先把增长讲清楚");
  }

  const keys = report.full.solutions.map((solution) => solution.key);
  if (keys.join("|") !== SOLUTION_KEYS.join("|")) {
    throw new Error("完整版解法必须按开源、提效、放大、90 天节奏的顺序输出");
  }
  const rhythm = report.full.solutions.find((solution) => solution.key === "rhythm");
  if (!rhythm?.plan) throw new Error("90 天节奏模块缺少 plan");

  const allowedTitles = new Map(docs.map((doc) => [doc.title, doc]));
  const sources = report.full.sources
    .filter((source) => allowedTitles.has(source.title))
    .map((source) => {
      const doc = allowedTitles.get(source.title)!;
      return {
        title: doc.title,
        updated_at: doc.updated_at,
        ...(doc.source_url ? { url: doc.source_url } : {})
      };
    });

  const fullText = allStrings(report.full).join("\n");
  if (sources.length === 0 && !fullText.includes("待确认")) {
    throw new Error("完整版至少引用一条知识库事实，否则写待确认");
  }
  if (docs.some((doc) => doc.id === "br-remessa-conforme-2026") &&
      !/(Remessa Conforme|US\$50|ICMS|待确认)/.test(fullText)) {
    throw new Error("巴西报告必须写清 Remessa Conforme 税档和 ICMS，或写待确认");
  }
  if (docs.some((doc) => doc.id === "cl-crossborder-tax-2025") &&
      !/(19%|VAT|US\$500|待确认)/.test(fullText)) {
    throw new Error("智利报告必须写清 19% VAT 和关税豁免上限，或写待确认");
  }
  if (docs.some((doc) => doc.id === "br-mercado-libre-fees") &&
      !/(12\.5%|16\.5%|固定费|佣金|待确认)/.test(fullText)) {
    throw new Error("巴西 Mercado Libre 报告必须写清佣金或固定费，或写待确认");
  }
  const hasRegulatedClaim = REGULATED.test(fullText);
  if (hasRegulatedClaim && sources.length === 0 && !fullText.includes("待确认")) {
    throw new Error("完整版包含平台规则/合规/税率判断，但没有有效知识库来源");
  }

  const preview: PreviewReport = {
    ...report.preview,
    problems: report.preview.problems.map((problem, index) => ({
      ...problem,
      dimension: FREE_DIMENSIONS[index]
    }))
  };

  const full: FullReport = {
    ...report.full,
    solutions: report.full.solutions.map((solution) => ({
      ...solution,
      title: SOLUTION_TITLES[solution.key]
    })),
    sources
  };

  return { preview, full };
}
