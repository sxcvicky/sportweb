/* 诊断后台：服务端数据 + 登录 + 详情操作 */

(function () {
  const loginView = document.getElementById("adminLogin");
  const loginForm = document.getElementById("loginForm");
  const loginError = document.getElementById("loginError");
  const shell = document.getElementById("adminShell");
  const content = document.getElementById("adminContent");
  const pageTitle = document.getElementById("pageTitle");
  const drawer = document.getElementById("drawer");
  const overlay = document.getElementById("drawerOverlay");
  const refreshBtn = document.getElementById("refreshBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  if (!content) return;

  const STATUS_LABELS = {
    pending: "待加企微",
    generating: "生成中",
    ready: "已生成",
    failed: "失败",
    rejected: "已劝退"
  };
  const STAGE_LABELS = {
    not_started: "还没开始",
    starting: "刚开始",
    operating: "已经在做",
    company: "公司化/多平台"
  };
  const WECOM_LABELS = {
    unbound: "未加企微",
    claimed: "模拟已加",
    bound: "已加企微"
  };
  const ANSWER_LABELS = {
    category: "品类",
    product: "产品",
    sample: "样品",
    source: "货源",
    budget: "预算",
    market: "市场",
    platform: "平台",
    experience: "经验",
    entity: "主体",
    language: "外语",
    time: "投入时间",
    concerns: "担心",
    expected: "预期",
    lossTolerance: "亏损承受",
    months: "上线时长",
    orders: "月单量",
    traffic: "流量",
    aov: "客单价",
    margin: "毛利率",
    grossMargin: "毛利率",
    acos: "广告占比",
    returns: "退货率",
    returnRate: "退货率",
    bottleneck: "卡点",
    goal: "目标",
    team: "团队",
    compliance: "合规",
    supplyChain: "供应链",
    skuCount: "SKU 数",
    monthlyGMV: "月销售额",
    platformCount: "平台数",
    marketCount: "市场数",
    dataSystem: "数据系统",
    brandContent: "品牌内容",
    orgStructure: "组织分工"
  };
  const PAGE_TITLES = {
    leads: "诊断记录",
    reports: "报告与付款",
    stats: "数据统计",
    settings: "运行配置"
  };

  let section = "leads";
  let filters = { status: "", stage: "", q: "", page: 1 };
  let listData = { total: 0, page: 1, limit: 30, diagnoses: [] };
  let stats = null;
  let currentDetail = null;
  let searchTimer = null;

  function esc(value) {
    return UI.escapeHTML(value);
  }

  function showLogin(message) {
    loginView.hidden = false;
    shell.hidden = true;
    closeDrawer();
    if (loginError) loginError.textContent = message || "";
  }

  function showShell() {
    loginView.hidden = true;
    shell.hidden = false;
  }

  function handleAuthError(error) {
    if (error && error.status === 401) {
      showLogin("登录已过期，请重新登录。");
      return true;
    }
    return false;
  }

  async function boot() {
    try {
      const me = await Api.adminMe();
      if (!me.admin) {
        showLogin("");
        return;
      }
      showShell();
      await load();
    } catch (error) {
      showLogin(error.message || "后台暂时连不上。");
    }
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      const input = document.getElementById("adminPassword");
      const button = document.getElementById("loginBtn");
      const password = input ? input.value : "";
      if (!password) return;
      if (loginError) loginError.textContent = "";
      if (button) button.disabled = true;
      try {
        await Api.adminLogin(password);
        if (input) input.value = "";
        showShell();
        await load();
      } catch (error) {
        if (loginError) loginError.textContent = error.message || "登录失败";
      } finally {
        if (button) button.disabled = false;
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async function () {
      try {
        await Api.adminLogout();
      } catch (error) {
        /* ignore */
      }
      showLogin("");
    });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener("click", function () {
      load().catch(function (error) {
        UI.toast(error.message || "刷新失败");
      });
    });
  }

  document.querySelectorAll(".nav-btn").forEach(function (button) {
    button.addEventListener("click", function () {
      section = button.getAttribute("data-section") || "leads";
      document.querySelectorAll(".nav-btn").forEach(function (item) {
        item.classList.toggle("is-active", item === button);
      });
      if (pageTitle) pageTitle.textContent = PAGE_TITLES[section] || "工作台";
      if (section === "leads") filters.status = "";
      if (section === "reports") filters.status = "ready";
      filters.page = 1;
      closeDrawer();
      load().catch(function (error) {
        UI.toast(error.message || "加载失败");
      });
    });
  });

  function statCard(label, value, hint) {
    return [
      '<div class="stat-card">',
      '  <p class="stat-card__label">' + esc(label) + "</p>",
      '  <p class="stat-card__value">' + esc(value) + "</p>",
      hint ? '  <p class="stat-card__hint">' + hint + "</p>" : "",
      "</div>"
    ].join("");
  }

  function statsHtml() {
    if (!stats) return "";
    const d = stats.diagnoses || {};
    const o = stats.orders || {};
    return [
      '<div class="stat-row">',
      statCard("今日诊断", d.today || 0, "提交后即计入"),
      statCard("待加企微", d.pending || 0, "未开始生成"),
      statCard("生成中", d.generating || 0, "队列处理中"),
      statCard("已生成", d.ready || 0, "报告可看"),
      statCard("失败", d.failed || 0, "可在详情重试"),
      statCard("已付款", o.paid || 0, "完整版已解锁"),
      statCard("累计收入", "¥" + ((o.revenue_cents || 0) / 100).toFixed(0), "仅统计已付款"),
      '</div>'
    ].join("");
  }

  function toolbarHtml() {
    const statusOptions = [
      ["", "全部"],
      ["pending", "待加企微"],
      ["generating", "生成中"],
      ["ready", "已生成"],
      ["failed", "失败"],
      ["rejected", "已劝退"]
    ];
    return [
      '<div class="toolbar">',
      '  <div class="search-box"><input id="adminSearch" type="search" placeholder="诊断编号 / 品类 / 产品，回车搜索" value="' + esc(filters.q) + '"></div>',
      '  <div class="filter-group">',
      statusOptions.map(function (item) {
        return '<button class="filter-btn' + (filters.status === item[0] ? " is-active" : "") + '" type="button" data-filter-status="' + item[0] + '">' + item[1] + "</button>";
      }).join(""),
      "  </div>",
      '  <select class="input" id="adminStageFilter" style="min-height:38px;width:150px;">',
      '<option value="">全部档位</option>',
      Object.keys(STAGE_LABELS).map(function (key) {
        return '<option value="' + key + '"' + (filters.stage === key ? " selected" : "") + ">" + STAGE_LABELS[key] + "</option>";
      }).join(""),
      "  </select>",
      '  <div class="toolbar__spacer"></div>',
      '  <span class="cell-sub">共 ' + (listData.total || 0) + " 条</span>",
      "</div>"
    ].join("");
  }

  function statusCell(row) {
    const status = row.status || "pending";
    const dotClass = status === "ready" ? "is-ready" : status === "generating" ? "is-generating" : status === "failed" ? "is-failed" : "";
    return '<span class="status-cell"><i class="status-dot ' + dotClass + '"></i>' + esc(STATUS_LABELS[status] || status) + "</span>";
  }

  function payCell(row) {
    if (row.paid) return '<span class="pill pill--green">已付 9.9</span>';
    if (row.orderStatus === "created") return '<span class="pill pill--amber">待付款</span>';
    return '<span class="cell-sub">—</span>';
  }

  function tableHtml() {
    const rows = listData.diagnoses || [];
    if (!rows.length) {
      return '<div class="table-card"><div class="empty-state"><strong>还没有记录</strong><p>客户提交诊断后会出现在这里。</p></div></div>';
    }
    return [
      '<div class="table-card"><div class="table-wrap"><table class="admin-table">',
      "<thead><tr>",
      "<th>诊断编号</th><th>档位</th><th>品类 / 产品</th><th>状态</th><th>付款</th><th>创建时间</th><th></th>",
      "</tr></thead><tbody>",
      rows.map(function (row) {
        return [
          '<tr class="is-clickable" data-open="' + esc(row.id) + '">',
          '<td><span class="cell-id">' + esc(row.id) + "</span></td>",
          "<td>" + esc(STAGE_LABELS[row.stage] || row.stage) + "</td>",
          '<td><div class="cell-main">' + esc(row.category || "—") + '</div><div class="cell-sub">' + esc(row.product || "") + "</div></td>",
          "<td>" + statusCell(row) + "</td>",
          "<td>" + payCell(row) + "</td>",
          '<td class="cell-nowrap">' + esc(UI.formatDateTime(row.createdAt)) + "</td>",
          '<td class="table-actions"><button class="link-btn link-btn--accent" type="button" data-open="' + esc(row.id) + '">查看</button></td>',
          "</tr>"
        ].join("");
      }).join(""),
      "</tbody></table></div>",
      paginationHtml(),
      "</div>"
    ].join("");
  }

  function paginationHtml() {
    const limit = listData.limit || 30;
    const totalPages = Math.max(1, Math.ceil((listData.total || 0) / limit));
    const page = listData.page || 1;
    return [
      '<div class="pagination">',
      "  <span>第 " + page + " / " + totalPages + " 页</span>",
      '  <div class="pagination__buttons">',
      '    <button class="page-btn" type="button" data-page="' + (page - 1) + '"' + (page <= 1 ? " disabled" : "") + ">上一页</button>",
      '    <button class="page-btn" type="button" data-page="' + (page + 1) + '"' + (page >= totalPages ? " disabled" : "") + ">下一页</button>",
      "  </div>",
      "</div>"
    ].join("");
  }

  function statsSectionHtml() {
    if (!stats) return "";
    const d = stats.diagnoses || {};
    const o = stats.orders || {};
    const rows = [
      ["诊断总量", d.total || 0],
      ["待加企微", d.pending || 0],
      ["生成中", d.generating || 0],
      ["已生成", d.ready || 0],
      ["失败", d.failed || 0],
      ["已劝退", d.rejected || 0],
      ["已付款订单", o.paid || 0],
      ["未付款订单", o.unpaid || 0],
      ["今日报告", stats.reportsToday || 0],
      ["累计收入", "¥" + ((o.revenue_cents || 0) / 100).toFixed(0)]
    ];
    return [
      statsHtml(),
      '<div class="panel" style="margin-top:18px;">',
      '  <div class="panel__head"><h2>关键数字</h2><span>服务端实时统计</span></div>',
      '  <div class="detail-kv">',
      rows.map(function (row) {
        return "<div><span>" + esc(row[0]) + "</span><strong>" + esc(row[1]) + "</strong></div>";
      }).join(""),
      "  </div>",
      "</div>"
    ].join("");
  }

  async function settingsSectionHtml() {
    let config = null;
    try {
      config = await Api.config();
    } catch (error) {
      /* ignore */
    }
    return [
      '<div class="panel">',
      '  <div class="panel__head"><h2>当前运行模式</h2><span>由服务器 .env 控制</span></div>',
      '  <div class="detail-kv">',
      "<div><span>完整版价格</span><strong>" + (config ? "¥" + config.price : "—") + "</strong></div>",
      "<div><span>大模型模式</span><strong>" + (config ? esc(config.llmMode + " / " + config.llmModel) : "—") + "</strong></div>",
      "<div><span>支付模式</span><strong>" + (config ? esc(config.payMode) : "—") + "</strong></div>",
      "<div><span>企微模式</span><strong>" + (config ? esc(config.wecomMode) : "—") + "</strong></div>",
      "<div><span>微信号兜底</span><strong>" + (config ? esc(config.wechatId) : "—") + "</strong></div>",
      "  </div>",
      '  <p class="editor-note" style="margin-top:16px;">LLM key、企微 secret、支付密钥只放服务器 .env，前端和数据库都不保存。修改后重启服务生效。</p>',
      "</div>",
      '<div class="panel" style="margin-top:18px;">',
      '  <div class="panel__head"><h2>后台操作</h2><span>日常交付</span></div>',
      '  <p class="editor-note">报告生成完成后，系统会给员工企微发提醒。员工在企微里把报告链接转发给客户；异常订单可在“报告与付款”里手动标记已付款。</p>',
      "</div>"
    ].join("");
  }

  async function render() {
    if (!content) return;
    if (section === "stats") {
      content.innerHTML = statsSectionHtml();
      return;
    }
    if (section === "settings") {
      content.innerHTML = await settingsSectionHtml();
      return;
    }
    content.innerHTML = statsHtml() + toolbarHtml() + tableHtml();
    bindContent();
  }

  function bindContent() {
    const search = document.getElementById("adminSearch");
    if (search) {
      search.addEventListener("keydown", function (event) {
        if (event.key !== "Enter") return;
        event.preventDefault();
        filters.q = search.value.trim();
        filters.page = 1;
        load().catch(function (error) { UI.toast(error.message || "搜索失败"); });
      });
    }
    const stageFilter = document.getElementById("adminStageFilter");
    if (stageFilter) {
      stageFilter.addEventListener("change", function () {
        filters.stage = stageFilter.value;
        filters.page = 1;
        load().catch(function (error) { UI.toast(error.message || "筛选失败"); });
      });
    }
    content.querySelectorAll("[data-filter-status]").forEach(function (button) {
      button.addEventListener("click", function () {
        filters.status = button.getAttribute("data-filter-status") || "";
        filters.page = 1;
        load().catch(function (error) { UI.toast(error.message || "筛选失败"); });
      });
    });
    content.querySelectorAll("[data-page]").forEach(function (button) {
      button.addEventListener("click", function () {
        const page = Number(button.getAttribute("data-page"));
        if (!Number.isFinite(page) || page < 1) return;
        filters.page = page;
        load().catch(function (error) { UI.toast(error.message || "翻页失败"); });
      });
    });
    content.querySelectorAll("[data-open]").forEach(function (element) {
      element.addEventListener("click", function (event) {
        event.stopPropagation();
        openDetail(element.getAttribute("data-open"));
      });
    });
  }

  async function load() {
    try {
      const tasks = [Api.adminStats(), Api.adminList(Object.assign({ limit: 30 }, filters))];
      const results = await Promise.all(tasks);
      stats = results[0];
      listData = results[1];
      await render();
    } catch (error) {
      if (handleAuthError(error)) return;
      content.innerHTML = [
        '<div class="empty-state">',
        "  <strong>加载失败</strong>",
        "  <p>" + esc(error.message || "请稍后重试。") + "</p>",
        '  <button class="btn btn--accent" type="button" id="adminRetryLoad">重试</button>',
        "</div>"
      ].join("");
      const retry = document.getElementById("adminRetryLoad");
      if (retry) retry.addEventListener("click", function () { load(); });
    }
  }

  function answerValue(value) {
    if (Array.isArray(value)) return value.join("、");
    if (typeof value === "boolean") return value ? "是" : "否";
    if (value === null || value === undefined || value === "") return "—";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  }

  function answersHtml(answers) {
    if (!answers || !Object.keys(answers).length) return '<p class="cell-sub">没有答案。</p>';
    return [
      '<div class="answer-grid">',
      Object.keys(answers).map(function (key) {
        if (key === "consent") return "";
        return '<div class="answer-item"><span>' + esc(ANSWER_LABELS[key] || key) + "</span><strong>" + esc(answerValue(answers[key])) + "</strong></div>";
      }).join(""),
      "</div>"
    ].join("");
  }

  function reportPreviewHtml(report) {
    if (!report || !report.preview) return '<p class="cell-sub">报告还没生成。</p>';
    const preview = report.preview;
    return [
      '<div class="report-block">',
      "  <h4>增长判断</h4>",
      "  <p>" + esc(preview.headline || "—") + "</p>",
      "</div>",
      (preview.problems || []).map(function (problem, index) {
        return [
          '<div class="report-block">',
          "  <h4>" + String(index + 1).padStart(2, "0") + " · " + esc(problem.dimension || "") + "</h4>",
          "  <p><strong>" + esc(problem.title || "") + "</strong></p>",
          "  <p>" + esc(problem.finding || "") + "</p>",
          "  <p>证据：" + esc(problem.evidence || "") + "</p>",
          "</div>"
        ].join("");
      }).join(""),
      '<div class="report-block">',
      "  <h4>最值得先拿的增长 · " + esc((preview.priority || {}).title || "") + "</h4>",
      "  <p>" + esc((preview.priority || {}).why || "") + "</p>",
      "  <p>拿到之后：" + esc((preview.priority || {}).upside || "") + "</p>",
      "</div>",
      '<div class="report-block">',
      "  <h4>30 天 / 先做 / 先别急</h4>",
      "  <p>" + esc(preview.next30 || "") + "</p>",
      "  <p>先做：" + esc(preview.firstMove || "") + "</p>",
      "  <p>先别急着：" + esc(preview.dontRush || "") + "</p>",
      "</div>"
    ].join("");
  }

  function reportFullHtml(report) {
    if (!report || !report.full) return '<p class="cell-sub">完整版还没生成。</p>';
    const full = report.full;
    return [
      '<div class="report-block">',
      "  <h4>完整版增长判断</h4>",
      "  <p>" + esc(full.headline || "") + "</p>",
      "</div>",
      (full.solutions || []).map(function (solution, index) {
        return [
          '<div class="report-block">',
          "  <h4>" + String(index + 1).padStart(2, "0") + " · " + esc(solution.title || "") + "</h4>",
          "  <p>" + esc(solution.judgment || "") + "</p>",
          "  <p>" + (solution.actions || []).map(function (action) { return "→ " + esc(action); }).join("<br>") + "</p>",
          "  <p>指标：" + esc(solution.metric || "") + "</p>",
          solution.boundary ? "  <p>边界：" + esc(solution.boundary) + "</p>" : "",
          solution.plan ? "  <p>30 天：" + esc(solution.plan.d30) + "<br>60 天：" + esc(solution.plan.d60) + "<br>90 天：" + esc(solution.plan.d90) + "</p>" : "",
          "</div>"
        ].join("");
      }).join(""),
      (full.sources || []).length ? [
        '<div class="report-block">',
        "  <h4>知识库来源</h4>",
        "  <p>" + full.sources.map(function (source) { return esc(source.title + (source.updated_at ? " · " + source.updated_at : "")); }).join("<br>") + "</p>",
        "</div>"
      ].join("") : ""
    ].join("");
  }

  function drawerHtml(payload) {
    const diagnosis = payload.diagnosis;
    const report = payload.report;
    const order = payload.order;
    const meta = payload.reportMeta;
    return [
      '<div class="drawer__head">',
      '  <div class="drawer__title">',
      '    <p class="eyebrow">' + esc(STAGE_LABELS[diagnosis.stage] || diagnosis.stage) + "</p>",
      "    <h2>" + esc(diagnosis.id) + "</h2>",
      "    <p>" + esc(UI.formatDateTime(diagnosis.createdAt)) + " · " + esc(STATUS_LABELS[diagnosis.status] || diagnosis.status) + "</p>",
      "  </div>",
      '  <button class="icon-btn" type="button" data-close-drawer aria-label="关闭">×</button>',
      "</div>",
      '<div class="drawer__body">',
      '  <div class="drawer-actions">',
      '    <button class="btn btn--accent btn--sm" type="button" data-detail-action="copy">复制报告链接</button>',
      '    <button class="btn btn--ghost btn--sm" type="button" data-detail-action="retry">重新生成</button>',
      '    <button class="btn btn--ghost btn--sm" type="button" data-detail-action="mark-paid">标记已付款</button>',
      '    <button class="btn btn--ghost btn--sm" type="button" data-detail-action="reject">标记劝退</button>',
      "  </div>",
      '  <section class="drawer__section">',
      '    <div class="drawer__section-title">基本信息</div>',
      '    <div class="detail-kv">',
      "      <div><span>档位</span><strong>" + esc(STAGE_LABELS[diagnosis.stage] || diagnosis.stage) + "</strong></div>",
      "      <div><span>状态</span><strong>" + esc(STATUS_LABELS[diagnosis.status] || diagnosis.status) + "</strong></div>",
      "      <div><span>付款</span><strong>" + (payload.paid ? "已付款" : "未付款") + "</strong></div>",
      "      <div><span>企微</span><strong>" + esc(diagnosis.wecom ? (WECOM_LABELS[diagnosis.wecom.status] || diagnosis.wecom.status) : "—") + "</strong></div>",
      "      <div><span>报告生成</span><strong>" + esc(UI.formatDateTime(diagnosis.reportReadyAt || "")) + "</strong></div>",
      "      <div><span>诊断 token</span><strong style=\"font-family:var(--font-mono);font-size:10px;\">" + esc(diagnosis.token) + "</strong></div>",
      "    </div>",
      "  </section>",
      '  <section class="drawer__section">',
      '    <div class="drawer__section-title">问诊答案</div>',
      answersHtml(diagnosis.answers),
      "  </section>",
      '  <section class="drawer__section">',
      '    <div class="drawer__section-title">免费版</div>',
      reportPreviewHtml(report),
      "  </section>",
      '  <section class="drawer__section">',
      '    <div class="drawer__section-title">完整版</div>',
      reportFullHtml(report),
      "  </section>",
      '  <section class="drawer__section">',
      '    <div class="drawer__section-title">订单与生成记录</div>',
      '    <div class="detail-kv">',
      "      <div><span>订单状态</span><strong>" + esc(order ? order.status : "无订单") + "</strong></div>",
      "      <div><span>金额</span><strong>" + (order ? "¥" + order.amount : "—") + "</strong></div>",
      "      <div><span>支付方式</span><strong>" + esc(order ? order.provider : "—") + "</strong></div>",
      "      <div><span>付款时间</span><strong>" + esc(order && order.paidAt ? UI.formatDateTime(order.paidAt) : "—") + "</strong></div>",
      "      <div><span>模型</span><strong>" + esc(meta ? meta.model : "—") + "</strong></div>",
      "      <div><span>耗时 / tokens</span><strong>" + esc(meta ? (meta.latencyMs + "ms · " + (meta.inputTokens || 0) + "+" + (meta.outputTokens || 0)) : "—") + "</strong></div>",
      "      <div><span>prompt 版本</span><strong>" + esc(meta ? meta.promptVersion : "—") + "</strong></div>",
      "      <div><span>知识库版本</span><strong>" + esc(meta ? meta.kbVersion : "—") + "</strong></div>",
      "    </div>",
      "  </section>",
      '  <section class="drawer__section">',
      '    <div class="drawer__section-title">事件</div>',
      (payload.events || []).length
        ? (payload.events || []).map(function (event) {
            return '<p class="cell-sub">' + esc(UI.formatDateTime(event.at)) + " · " + esc(event.type) + "</p>";
          }).join("")
        : '<p class="cell-sub">暂无事件。</p>',
      "  </section>",
      "</div>"
    ].join("");
  }

  function openDrawer() {
    if (!drawer || !overlay) return;
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    overlay.classList.add("is-open");
  }

  function closeDrawer() {
    if (!drawer || !overlay) return;
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    overlay.classList.remove("is-open");
    currentDetail = null;
  }

  async function openDetail(id) {
    if (!drawer) return;
    openDrawer();
    drawer.innerHTML = '<div class="drawer__body"><p class="cell-sub">加载中…</p></div>';
    try {
      const payload = await Api.adminDetail(id);
      currentDetail = payload;
      drawer.innerHTML = drawerHtml(payload);
      bindDrawerActions();
    } catch (error) {
      if (handleAuthError(error)) return;
      drawer.innerHTML = '<div class="drawer__body"><p class="cell-sub">' + esc(error.message || "加载失败") + "</p></div>";
    }
  }

  function bindDrawerActions() {
    const close = drawer.querySelector("[data-close-drawer]");
    if (close) close.addEventListener("click", closeDrawer);
    const copy = drawer.querySelector('[data-detail-action="copy"]');
    if (copy) copy.addEventListener("click", function () {
      if (!currentDetail) return;
      const url = window.location.origin + "/report.html?token=" + encodeURIComponent(currentDetail.diagnosis.token);
      UI.copyText(url).then(function () {
        UI.toast("报告链接已复制");
      }).catch(function () {
        UI.toast("复制失败，请手动复制");
      });
    });
    const retry = drawer.querySelector('[data-detail-action="retry"]');
    if (retry) retry.addEventListener("click", async function () {
      if (!currentDetail) return;
      if (!window.confirm("重新生成会再调用一次模型，确认？")) return;
      try {
        await Api.adminRetry(currentDetail.diagnosis.id);
        UI.toast("已加入生成队列");
        closeDrawer();
        await load();
      } catch (error) {
        UI.toast(error.message || "重试失败");
      }
    });
    const markPaid = drawer.querySelector('[data-detail-action="mark-paid"]');
    if (markPaid) markPaid.addEventListener("click", async function () {
      if (!currentDetail) return;
      if (!window.confirm("确认这笔订单已经收到 9.9 元？")) return;
      try {
        await Api.adminMarkPaid(currentDetail.diagnosis.id);
        UI.toast("已标记为已付款");
        await openDetail(currentDetail.diagnosis.id);
        await load();
      } catch (error) {
        UI.toast(error.message || "操作失败");
      }
    });
    const reject = drawer.querySelector('[data-detail-action="reject"]');
    if (reject) reject.addEventListener("click", async function () {
      if (!currentDetail) return;
      if (!window.confirm("确认把这份诊断标记为劝退？")) return;
      try {
        await Api.adminReject(currentDetail.diagnosis.id);
        UI.toast("已标记劝退");
        await openDetail(currentDetail.diagnosis.id);
        await load();
      } catch (error) {
        UI.toast(error.message || "操作失败");
      }
    });
  }

  if (overlay) overlay.addEventListener("click", closeDrawer);
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closeDrawer();
  });

  boot();
})();
