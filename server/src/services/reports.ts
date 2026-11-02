import { getDb } from "../db.js";
import type { DiagnosisRow, FullReport, GeneratedReport, PreviewReport, ReportRow } from "../types.js";
import { nowIso, parseJson } from "../lib/util.js";

export function getReport(diagnosisId: string): ReportRow | undefined {
  return getDb().prepare("SELECT * FROM reports WHERE diagnosis_id = ?").get(diagnosisId) as
    | ReportRow
    | undefined;
}

export function saveReport(params: {
  diagnosisId: string;
  report: GeneratedReport;
  promptVersion: string;
  kbVersion: string;
  model: string;
  latencyMs: number;
  inputTokens?: number | null;
  outputTokens?: number | null;
}): void {
  const now = nowIso();
  getDb()
    .prepare(
      `INSERT INTO reports
        (diagnosis_id, preview_json, full_json, prompt_version, kb_version, model,
         latency_ms, input_tokens, output_tokens, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(diagnosis_id) DO UPDATE SET
         preview_json = excluded.preview_json,
         full_json = excluded.full_json,
         prompt_version = excluded.prompt_version,
         kb_version = excluded.kb_version,
         model = excluded.model,
         latency_ms = excluded.latency_ms,
         input_tokens = excluded.input_tokens,
         output_tokens = excluded.output_tokens,
         created_at = excluded.created_at`
    )
    .run(
      params.diagnosisId,
      JSON.stringify(params.report.preview),
      JSON.stringify(params.report.full),
      params.promptVersion,
      params.kbVersion,
      params.model,
      params.latencyMs,
      params.inputTokens ?? null,
      params.outputTokens ?? null,
      now
    );
}

export interface ReportPayload {
  preview: PreviewReport;
  full?: FullReport;
}

export function toReportPayload(row: ReportRow | undefined, paid: boolean): ReportPayload | null {
  if (!row) return null;
  const preview = parseJson<PreviewReport | null>(row.preview_json, null);
  if (!preview) return null;
  if (!paid) return { preview };
  const full = parseJson<FullReport | null>(row.full_json, null);
  return full ? { preview, full } : { preview };
}

export function reportMeta(row: ReportRow | undefined) {
  if (!row) return null;
  return {
    promptVersion: row.prompt_version,
    kbVersion: row.kb_version,
    model: row.model,
    latencyMs: row.latency_ms,
    inputTokens: row.input_tokens,
    outputTokens: row.output_tokens,
    createdAt: row.created_at
  };
}

export function diagnosisAnswers(row: DiagnosisRow): Record<string, unknown> {
  return parseJson<Record<string, unknown>>(row.answers_json, {});
}
