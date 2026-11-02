const base = (process.env.SMOKE_BASE_URL || "http://127.0.0.1:8787").replace(/\/$/, "");
const adminPassword = process.env.SMOKE_ADMIN_PASSWORD || "admin123";
let userCookie = "";
let adminCookie = "";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function captureCookie(response, kind) {
  const cookies = response.headers.getSetCookie ? response.headers.getSetCookie() : [];
  for (const raw of cookies) {
    const pair = raw.split(";")[0];
    if (kind === "user" && pair.startsWith("yj_uid=")) userCookie = pair;
    if (kind === "admin" && pair.startsWith("yj_admin=")) adminCookie = pair;
  }
}

async function request(path, options = {}, kind = "user") {
  const headers = Object.assign({}, options.headers || {});
  const cookie = kind === "admin" ? adminCookie : userCookie;
  if (cookie) headers.cookie = cookie;
  if (options.body && typeof options.body !== "string") {
    headers["content-type"] = "application/json";
    options.body = JSON.stringify(options.body);
  }
  const response = await fetch(base + path, Object.assign({}, options, { headers }));
  captureCookie(response, kind);
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`${path} 返回非 JSON：${text.slice(0, 200)}`);
  }
  if (!response.ok) {
    throw new Error(`${path} ${response.status}: ${data && data.message}`);
  }
  return data;
}

function assert(condition, message) {
  if (!condition) throw new Error("断言失败：" + message);
}

async function main() {
  const health = await request("/api/health");
  assert(health.ok, "health");

  await request("/api/session");
  const created = await request("/api/diagnoses", {
    method: "POST",
    body: {
      stage: "starting",
      source: "smoke",
      answers: {
        category: "3C 配件",
        product: "手机支架",
        platform: "Amazon",
        months: "1–3 个月",
        orders: "10–50 单",
        traffic: ["平台广告"],
        aov: "50–150 元",
        margin: "20–30%",
        returns: "10–20%",
        bottleneck: "广告亏",
        goal: "提高利润",
        team: "2–3 人",
        consent: true
      }
    }
  });
  const token = created.diagnosis.token;
  assert(created.diagnosis.status === "pending", "创建后为 pending");

  await request(`/api/diagnoses/by-token/${token}/wecom-claim`, { method: "POST" });
  await request(`/api/diagnoses/by-token/${token}/start`, { method: "POST" });

  let report = null;
  for (let i = 0; i < 240; i += 1) {
    await sleep(500);
    report = await request(`/api/reports/by-token/${token}`);
    if (report.diagnosis.status === "ready" || report.diagnosis.status === "failed") break;
  }
  assert(report && report.diagnosis.status === "ready", "报告生成成功");
  assert(report.report && report.report.preview, "免费 preview 存在");
  assert(!report.report.full, "未付款不返回 full");
  assert(report.report.preview.problems.length === 6, "preview 6 个增长卡点");
  assert(report.report.preview.priority.dimension === "增长来源", "优先项来自增长来源");
  assert(report.report.preview.priority.title, "preview 有最值得先拿的增长");

  const order = await request("/api/orders", { method: "POST", body: { token } });
  assert(order.order.mock, "mock 支付模式");
  await request(`/api/orders/${order.order.id}/mock-pay`, { method: "POST" });

  const paidReport = await request(`/api/reports/by-token/${token}`);
  assert(paidReport.paid, "付款后 paid=true");
  assert(paidReport.report.full, "付款后返回 full");
  assert(paidReport.report.full.solutions.length === 4, "full 4 个解法");
  assert(paidReport.report.full.solutions[0].title === "开源", "第一个解法是开源");

  await request("/api/admin/login", { method: "POST", body: { password: adminPassword } }, "admin");
  const list = await request("/api/admin/diagnoses?limit=10", {}, "admin");
  assert(list.diagnoses.some((item) => item.id === report.diagnosis.id), "后台能看到诊断");
  const detail = await request(`/api/admin/diagnoses/${report.diagnosis.id}`, {}, "admin");
  assert(detail.report && detail.report.full, "后台能看完整版");
  assert(detail.diagnosis.answers.product === "手机支架", "中文答案未损坏");

  console.log("SMOKE PASS");
  console.log(
    JSON.stringify(
      {
        diagnosis: report.diagnosis.id,
        problems: report.report.preview.problems.length,
        solutions: paidReport.report.full.solutions.length,
        sources: paidReport.report.full.sources.length,
        order: order.order.id,
        adminTotal: list.total
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error("SMOKE FAIL:", error.message);
  process.exit(1);
});
