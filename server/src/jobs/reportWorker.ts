import { config } from "../config.js";
import { getDb } from "../db.js";
import type { DiagnosisRow, ReportJobRow } from "../types.js";
import { daysAgoIso, nowIso } from "../lib/util.js";
import { getById, markFailed, markReady } from "../services/diagnoses.js";
import { retrieveKb, kbVersion } from "../services/kb.js";
import { saveReport } from "../services/reports.js";
import { generateReport } from "../llm/index.js";
import { promptVersion } from "../llm/prompt.js";
import { notifyStaff } from "../integrations/wecom.js";

let timer: NodeJS.Timeout | null = null;
let busy = false;
let stopped = false;

function recoverStuckJobs(): void {
  const db = getDb();
  const cutoff = new Date(Date.now() - 5 * 60_000).toISOString();
  const result = db
    .prepare(
      "UPDATE report_jobs SET status = 'queued', locked_at = NULL, updated_at = ? WHERE status = 'running' AND locked_at < ?"
    )
    .run(nowIso(), cutoff);
  if (result.changes > 0) {
    console.log(`[worker] 恢复 ${result.changes} 个卡住的任务`);
  }
}

function claimJob(): ReportJobRow | null {
  const db = getDb();
  const now = nowIso();
  const job = db
    .prepare(
      "SELECT * FROM report_jobs WHERE status = 'queued' AND run_after <= ? ORDER BY run_after LIMIT 1"
    )
    .get(now) as ReportJobRow | undefined;
  if (!job) return null;
  const result = db
    .prepare(
      "UPDATE report_jobs SET status = 'running', locked_at = ?, attempts = attempts + 1, updated_at = ? WHERE diagnosis_id = ? AND status = 'queued'"
    )
    .run(now, now, job.diagnosis_id);
  if (result.changes === 0) return null;
  return { ...job, status: "running", attempts: job.attempts + 1, locked_at: now };
}

async function processJob(job: ReportJobRow): Promise<void> {
  const row = getById(job.diagnosis_id);
  if (!row) {
    getDb()
      .prepare("UPDATE report_jobs SET status = 'failed', last_error = '诊断不存在', updated_at = ? WHERE diagnosis_id = ?")
      .run(nowIso(), job.diagnosis_id);
    return;
  }
  if (row.status === "ready") {
    getDb()
      .prepare("UPDATE report_jobs SET status = 'done', updated_at = ? WHERE diagnosis_id = ?")
      .run(nowIso(), row.id);
    return;
  }
  if (row.status === "rejected") {
    getDb()
      .prepare("UPDATE report_jobs SET status = 'done', updated_at = ? WHERE diagnosis_id = ?")
      .run(nowIso(), row.id);
    return;
  }

  const started = Date.now();
  try {
    console.log(`[worker] start ${row.public_id} stage=${row.stage} attempt=${job.attempts}`);
    const answers = JSON.parse(row.answers_json) as Record<string, unknown>;
    const docs = retrieveKb(answers, row.stage);
    const result = await generateReport(row, docs);
    saveReport({
      diagnosisId: row.id,
      report: result.report,
      promptVersion: promptVersion(),
      kbVersion: kbVersion(),
      model: result.model,
      latencyMs: result.latencyMs,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens
    });
    markReady(row.id);
    getDb()
      .prepare("UPDATE report_jobs SET status = 'done', last_error = NULL, updated_at = ? WHERE diagnosis_id = ?")
      .run(nowIso(), row.id);

    const current = getById(row.id);
    if (current?.status === "rejected") {
      console.log(`[worker] skip notify ${row.public_id} status=rejected`);
      return;
    }
    const url = `${config.appBaseUrl}/report.html?token=${encodeURIComponent(row.token)}`;
    await notifyStaff(
      `诊断报告已生成\n诊断编号：${row.public_id}\n档位：${row.stage}\n报告链接：${url}\n请转发给客户，或在后台查看。`
    );
    console.log(
      `[worker] done ${row.public_id} model=${result.model} latency=${Date.now() - started}ms docs=${docs.length}`
    );
  } catch (error) {
    const message = (error as Error).message || "未知错误";
    const attempts = job.attempts;
    console.error(`[worker] fail ${row.public_id} attempt=${attempts}: ${message}`);
    if (attempts < 3) {
      const delayMs = attempts * 15_000;
      getDb()
        .prepare(
          "UPDATE report_jobs SET status = 'queued', run_after = ?, locked_at = NULL, last_error = ?, updated_at = ? WHERE diagnosis_id = ?"
        )
        .run(new Date(Date.now() + delayMs).toISOString(), message.slice(0, 1000), nowIso(), row.id);
    } else {
      markFailed(row.id, message);
    }
  }
}

async function tick(): Promise<void> {
  if (busy || stopped) return;
  busy = true;
  try {
    let job = claimJob();
    while (job) {
      await processJob(job);
      job = claimJob();
    }
  } catch (error) {
    console.error("[worker] tick error:", (error as Error).message);
  } finally {
    busy = false;
  }
}

export function startWorker(): void {
  recoverStuckJobs();
  console.log(`[worker] started mode=${config.llm.mode}`);
  timer = setInterval(() => {
    void tick();
  }, 1200);
  void tick();
}

export function stopWorker(): void {
  stopped = true;
  if (timer) clearInterval(timer);
  timer = null;
}
