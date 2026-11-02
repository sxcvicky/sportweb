export type Stage = "not_started" | "starting" | "operating" | "company";
export type DiagnosisStatus = "pending" | "generating" | "ready" | "failed" | "rejected";
export type WecomStatus = "unbound" | "bound" | "claimed";
export type OrderStatus = "created" | "paid" | "failed" | "refunded";
export type JobStatus = "queued" | "running" | "done" | "failed";

export interface UserRow {
  id: string;
  wecom_external_userid: string | null;
  created_at: string;
  last_seen_at: string;
}

export interface DiagnosisRow {
  id: string;
  public_id: string;
  user_id: string;
  stage: Stage;
  answers_json: string;
  status: DiagnosisStatus;
  token: string;
  wecom_status: WecomStatus;
  wecom_external_userid: string | null;
  wecom_qr_url: string | null;
  source: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
  report_started_at: string | null;
  report_ready_at: string | null;
}

export interface ReportRow {
  diagnosis_id: string;
  preview_json: string;
  full_json: string;
  prompt_version: string;
  kb_version: string;
  model: string;
  latency_ms: number;
  input_tokens: number | null;
  output_tokens: number | null;
  created_at: string;
}

export interface ReportJobRow {
  diagnosis_id: string;
  status: JobStatus;
  attempts: number;
  run_after: string;
  locked_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderRow {
  id: string;
  diagnosis_id: string;
  user_id: string;
  amount_cents: number;
  currency: string;
  provider: string;
  provider_order_id: string | null;
  status: OrderStatus;
  code_url: string | null;
  paid_at: string | null;
  raw_callback_json: string | null;
  created_at: string;
  updated_at: string;
}

export interface GrowthProblem {
  dimension: string;
  title: string;
  finding: string;
  evidence: string;
}

export interface PreviewReport {
  headline: string;
  problems: GrowthProblem[];
  priority: {
    dimension: string;
    title: string;
    why: string;
    upside: string;
  };
  next30: string;
  firstMove: string;
  dontRush: string;
  assumptions: string[];
}

export interface SolutionModule {
  key: "growth" | "efficiency" | "scale" | "rhythm";
  title: string;
  judgment: string;
  actions: string[];
  metric: string;
  boundary?: string;
  plan?: {
    d30: string;
    d60: string;
    d90: string;
  };
}

export interface FullReport {
  headline: string;
  assumptions: string[];
  solutions: SolutionModule[];
  sources: Array<{ title: string; updated_at?: string; url?: string }>;
}

export interface GeneratedReport {
  preview: PreviewReport;
  full: FullReport;
}
