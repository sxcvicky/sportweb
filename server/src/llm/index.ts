import { config } from "../config.js";
import type { GeneratedReport } from "../types.js";
import type { KbDoc } from "../services/kb.js";
import { buildPrompt } from "./prompt.js";
import { mockReport } from "./mock.js";
import { parseJsonObject, validateReport } from "./validate.js";
import type { DiagnosisRow } from "../types.js";

export interface LlmResult {
  report: GeneratedReport;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs: number;
}

interface ChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  error?: { message?: string };
}

export async function generateReport(row: DiagnosisRow, docs: KbDoc[]): Promise<LlmResult> {
  if (config.llm.mode === "mock") {
    const started = Date.now();
    await new Promise((resolve) => setTimeout(resolve, 800));
    const report = validateReport(mockReport(row.stage, JSON.parse(row.answers_json), docs), docs);
    return { report, model: "mock", latencyMs: Date.now() - started };
  }

  if (!config.llm.apiKey) throw new Error("未配置 LLM_API_KEY");
  const prompt = buildPrompt(row, docs);
  const started = Date.now();
  const response = await fetch(config.llm.baseUrl + "/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + config.llm.apiKey
    },
    body: JSON.stringify({
      model: config.llm.model,
      messages: [
        { role: "system", content: prompt.system },
        { role: "user", content: prompt.user }
      ],
      temperature: config.llm.temperature,
      max_tokens: config.llm.maxTokens,
      response_format: { type: "json_object" }
    }),
    signal: AbortSignal.timeout(config.llm.timeoutMs)
  });

  const text = await response.text();
  let data: ChatResponse;
  try {
    data = JSON.parse(text) as ChatResponse;
  } catch {
    throw new Error("LLM 返回非 JSON：" + text.slice(0, 300));
  }
  if (!response.ok) {
    throw new Error("LLM 请求失败：" + (data.error?.message || response.status));
  }
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("LLM 没有返回内容");

  const parsed = parseJsonObject(content);
  const report = validateReport(parsed, docs);
  return {
    report,
    model: config.llm.model,
    inputTokens: data.usage?.prompt_tokens,
    outputTokens: data.usage?.completion_tokens,
    latencyMs: Date.now() - started
  };
}
