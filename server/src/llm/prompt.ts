import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { config } from "../config.js";
import type { DiagnosisRow, Stage } from "../types.js";
import type { KbDoc } from "../services/kb.js";
import { diagnosisAnswers } from "../services/reports.js";

const STAGE_FILES: Record<Stage, string> = {
  not_started: "not_started.md",
  starting: "starting.md",
  operating: "operating.md",
  company: "company.md"
};

function readPrompt(file: string): string {
  const full = path.join(config.promptDir, file);
  if (!fs.existsSync(full)) throw new Error("缺少提示词文件：" + full);
  return fs.readFileSync(full, "utf8");
}

export function promptVersion(): string {
  const parts = [
    readPrompt("base.md"),
    ...Object.values(STAGE_FILES).map((file) => readPrompt(path.join("stages", file)))
  ];
  return crypto.createHash("sha256").update(parts.join("\n")).digest("hex").slice(0, 12);
}

export function kbSourceList(docs: KbDoc[]): string {
  if (!docs.length) return "（本次没有检索到可用事实。涉及平台规则、合规、税率的内容必须写“待确认”。）";
  return docs
    .map(
      (doc, index) =>
        `[${index + 1}] ${doc.title}\n` +
        `层级：${doc.layer} / 主题：${doc.topic} / 可信度：${doc.confidence}\n` +
        `来源：${doc.source_name || "未标注"} ${doc.source_url || ""}\n` +
        `更新：${doc.updated_at}\n` +
        `事实：${doc.body}`
    )
    .join("\n\n");
}

export function buildPrompt(row: DiagnosisRow, docs: KbDoc[]) {
  const answers = diagnosisAnswers(row);
  const system = [
    readPrompt("base.md"),
    "\n\n---\n\n",
    readPrompt(path.join("stages", STAGE_FILES[row.stage])),
    "\n\n---\n\n",
    "以下是本次检索到的知识库事实，只能把这些当作事实依据：\n\n",
    kbSourceList(docs)
  ].join("");

  const user = [
    "【用户诊断答案】",
    JSON.stringify(answers, null, 2),
    "",
    "请根据以上答案和知识库事实，输出 preview + full 的 JSON。",
    "preview.findings 必须正好 3 条；full.sections 必须正好 6 节。",
    "full.sources 只列实际用到的知识库事实标题和更新时间。"
  ].join("\n");

  return { system, user, promptVersion: promptVersion(), answers };
}
