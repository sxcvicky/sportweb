import { config } from "../config.js";
import { getDb, withTransaction } from "../db.js";
import type { DiagnosisRow, Stage, UserRow } from "../types.js";
import { dayKey, localDate, normalizeStage, nowIso, parseJson, randomId } from "../lib/util.js";

export interface DiagnosisDto {
  id: string;
  token: string;
  stage: Stage;
  status: DiagnosisRow["status"];
  paid: boolean;
  wecom: {
    mode: "mock" | "wecom";
    status: DiagnosisRow["wecom_status"];
    qrUrl: string | null;
  };
  createdAt: string;
  updatedAt: string;
  reportStartedAt: string | null;
  reportReadyAt: string | null;
  answers?: Record<string, unknown>;
  notes?: string;
}

function nextPublicId(): string {
  const prefix = `YD-${dayKey()}-`;
  const db = getDb();
  const row = db
    .prepare("SELECT public_id FROM diagnoses WHERE public_id LIKE ? ORDER BY public_id DESC LIMIT 1")
    .get(prefix + "%") as { public_id: string } | undefined;
  const last = row ? Number(row.public_id.slice(prefix.length)) : 0;
  return prefix + String((Number.isFinite(last) ? last : 0) + 1).padStart(3, "0");
}

export function createDiagnosis(params: {
  user: UserRow;
  stage: unknown;
  answers: Record<string, unknown>;
  source?: string;
}): DiagnosisRow {
  const db = getDb();
  const now = nowIso();
  const stage = normalizeStage(params.stage);
  const answersJson = JSON.stringify(params.answers ?? {});
  if (answersJson.length > 30_000) {
    const error = new Error("答案过长");
    (error as any).statusCode = 413;
    throw error;
  }

  const today = localDate();
  const count = db
    .prepare(
      "SELECT COUNT(*) AS n FROM diagnoses WHERE user_id = ? AND date(created_at, 'localtime') = ?"
    )
    .get(params.user.id, today) as { n: number };
  if (count.n >= config.freeReportDailyLimit) {
    const error = new Error(`今天最多做 ${config.freeReportDailyLimit} 次诊断，明天再来。`);
    (error as any).statusCode = 429;
    throw error;
  }

  return withTransaction(() => {
    const id = "d" + randomId(18);
    const publicId = nextPublicId();
    const token = randomId(24);
    db.prepare(
      `INSERT INTO diagnoses
        (id, public_id, user_id, stage, answers_json, status, token, wecom_status,
         wecom_external_userid, source, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'pending', ?, 'unbound', NULL, ?, '', ?, ?)`
    ).run(id, publicId, params.user.id, stage, answersJson, token, params.source ?? null, now, now);
    return db.prepare("SELECT * FROM diagnoses WHERE id = ?").get(id) as DiagnosisRow;
  });
}

export function getByToken(token: string): DiagnosisRow | undefined {
  return getDb().prepare("SELECT * FROM diagnoses WHERE token = ?").get(token) as
    | DiagnosisRow
    | undefined;
}

export function getByPublicId(publicId: string): DiagnosisRow | undefined {
  return getDb().prepare("SELECT * FROM diagnoses WHERE public_id = ?").get(publicId) as
    | DiagnosisRow
    | undefined;
}

export function getById(id: string): DiagnosisRow | undefined {
  return getDb().prepare("SELECT * FROM diagnoses WHERE id = ?").get(id) as
    | DiagnosisRow
    | undefined;
}

export function listByUser(userId: string): DiagnosisRow[] {
  return getDb()
    .prepare("SELECT * FROM diagnoses WHERE user_id = ? ORDER BY created_at DESC LIMIT 100")
    .all(userId) as DiagnosisRow[];
}

export function isPaid(diagnosisId: string): boolean {
  const row = getDb()
    .prepare("SELECT 1 AS ok FROM orders WHERE diagnosis_id = ? AND status = 'paid' LIMIT 1")
    .get(diagnosisId) as { ok: number } | undefined;
  return !!row;
}

export function getOrderByDiagnosis(diagnosisId: string): import("../types.js").OrderRow | undefined {
  return getDb()
    .prepare("SELECT * FROM orders WHERE diagnosis_id = ? ORDER BY created_at DESC LIMIT 1")
    .get(diagnosisId) as import("../types.js").OrderRow | undefined;
}

export function toDto(row: DiagnosisRow, options: { includeAnswers?: boolean } = {}): DiagnosisDto {
  const dto: DiagnosisDto = {
    id: row.public_id,
    token: row.token,
    stage: row.stage,
    status: row.status,
    paid: isPaid(row.id),
    wecom: {
      mode: config.wecom.mode,
      status: row.wecom_status,
      qrUrl: row.wecom_qr_url || config.wecom.qrUrl || null
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    reportStartedAt: row.report_started_at,
    reportReadyAt: row.report_ready_at
  };
  if (options.includeAnswers) {
    dto.answers = parseJson<Record<string, unknown>>(row.answers_json, {});
    dto.notes = row.notes;
  }
  return dto;
}

export function markWecomClaimed(row: DiagnosisRow): DiagnosisRow {
  if (config.wecom.mode !== "mock") {
    const error = new Error("当前未开启模拟加企微");
    (error as any).statusCode = 400;
    throw error;
  }
  const now = nowIso();
  getDb()
    .prepare("UPDATE diagnoses SET wecom_status = 'claimed', updated_at = ? WHERE id = ?")
    .run(now, row.id);
  return getById(row.id)!;
}

export function bindWecom(state: string, externalUserId: string): DiagnosisRow | undefined {
  const publicId = state.startsWith("diag:") ? state.slice(5) : state;
  const row = getByPublicId(publicId);
  if (!row) return undefined;
  const db = getDb();
  const now = nowIso();
  withTransaction(() => {
    db.prepare(
      "UPDATE diagnoses SET wecom_status = 'bound', wecom_external_userid = ?, updated_at = ? WHERE id = ?"
    ).run(externalUserId, now, row.id);
    db.prepare("UPDATE users SET wecom_external_userid = ? WHERE id = ?").run(
      externalUserId,
      row.user_id
    );
  });
  return getById(row.id);
}

export function canStart(row: DiagnosisRow): { ok: boolean; message?: string } {
  if (row.status === "ready" || row.status === "generating") return { ok: true };
  if (row.status === "rejected") return { ok: false, message: "这份诊断已劝退，不能生成完整版。" };
  if (row.wecom_status === "unbound") {
    return { ok: false, message: "请先扫码加企微。" };
  }
  return { ok: true };
}

export function enqueueReport(row: DiagnosisRow): void {
  const db = getDb();
  const now = nowIso();
  const startedToday = db
    .prepare("SELECT COUNT(*) AS n FROM report_jobs WHERE date(created_at, 'localtime') = ?")
    .get(localDate()) as { n: number };
  if (startedToday.n >= config.reportDailyGlobalLimit) {
    const error = new Error("今天诊断名额已满，明天再来或联系企微。");
    (error as any).statusCode = 429;
    throw error;
  }
  withTransaction(() => {
    db.prepare(
      `INSERT INTO report_jobs
        (diagnosis_id, status, attempts, run_after, locked_at, last_error, created_at, updated_at)
       VALUES (?, 'queued', 0, ?, NULL, NULL, ?, ?)
       ON CONFLICT(diagnosis_id) DO UPDATE SET
         status = CASE WHEN report_jobs.status = 'running' THEN 'running' ELSE 'queued' END,
         attempts = CASE WHEN report_jobs.status IN ('failed', 'done') THEN 0 ELSE report_jobs.attempts END,
         run_after = excluded.run_after,
         locked_at = CASE WHEN report_jobs.status = 'running' THEN report_jobs.locked_at ELSE NULL END,
         last_error = NULL,
         updated_at = excluded.updated_at`
    ).run(row.id, now, now, now);
    db.prepare(
      "UPDATE diagnoses SET status = 'generating', report_started_at = COALESCE(report_started_at, ?), report_ready_at = NULL, updated_at = ? WHERE id = ? AND status != 'ready'"
    ).run(now, now, row.id);
  });
}

export function adminRetryReport(row: DiagnosisRow): void {
  const db = getDb();
  const now = nowIso();
  withTransaction(() => {
    const existing = db.prepare("SELECT * FROM report_jobs WHERE diagnosis_id = ?").get(row.id);
    if (existing) {
      db.prepare(
        "UPDATE report_jobs SET status = 'queued', attempts = 0, run_after = ?, locked_at = NULL, last_error = NULL, updated_at = ? WHERE diagnosis_id = ?"
      ).run(now, now, row.id);
    } else {
      db.prepare(
        `INSERT INTO report_jobs
          (diagnosis_id, status, attempts, run_after, locked_at, last_error, created_at, updated_at)
         VALUES (?, 'queued', 0, ?, NULL, NULL, ?, ?)`
      ).run(row.id, now, now, now);
    }
    db.prepare(
      "UPDATE diagnoses SET status = 'generating', report_started_at = ?, report_ready_at = NULL, updated_at = ? WHERE id = ?"
    ).run(now, now, row.id);
  });
}

export function markFailed(diagnosisId: string, message: string): void {
  const now = nowIso();
  getDb()
    .prepare("UPDATE diagnoses SET status = 'failed', updated_at = ? WHERE id = ? AND status != 'ready'")
    .run(now, diagnosisId);
  getDb()
    .prepare("UPDATE report_jobs SET status = 'failed', last_error = ?, updated_at = ? WHERE diagnosis_id = ?")
    .run(message.slice(0, 1000), now, diagnosisId);
}

export function markReady(diagnosisId: string): void {
  const now = nowIso();
  getDb()
    .prepare(
      "UPDATE diagnoses SET status = 'ready', report_ready_at = ?, updated_at = ? WHERE id = ? AND status != 'rejected'"
    )
    .run(now, now, diagnosisId);
}
