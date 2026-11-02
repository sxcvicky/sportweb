/* 诊断后台 */

(function () {
  const content = document.getElementById("adminContent");
  const pageTitle = document.getElementById("pageTitle");
  const topbarActions = document.getElementById("topbarActions");
  const drawer = document.getElementById("drawer");
  const overlay = document.getElementById("drawerOverlay");
  if (!content || !drawer) return;

  const state = {
    section: "leads",
    filter: "all",
    search: "",
    page: 1,
    pageSize: 10,
    selectedId: null,
    drawerMode: "lead",
    editorTab: "basic"
  };

  Store.captureUtm();
  Store.track("admin_view", { page: "admin" });

  function esc(value) {
    return UI.escapeHTML(value);
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function getPath(obj, path) {
    return path.split(".").reduce(function (acc, key) {
      return acc && acc[key] !== undefined ? acc[key] : "";
    }, obj);
  }

  function setPath(obj, path, value) {
    const keys = path.split(".");
    let target = obj;
    keys.forEach(function (key, index) {
      if (index === keys.length - 1) {
        target[key] = value;
      } else {
        if (!target[key] || typeof target[key] !== "object") target[key] = {};
        target = target[key];
      }
    });
  }

  function percent(part, total) {
    if (!total) return "0%";
    return Math.round((part / total) * 100) + "%";
  }

  function download(filename, text, mime) {
    const blob = new Blob([text], { type: mime || "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 800);
  }

  function todayStamp() {
    const d = new Date();
    const pad = function (n) { return n < 10 ? "0" + n : String(n); };
    return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate());
  }

  function linkFor(lead) {
    return new URL("report.html?token=" + encodeURIComponent(lead.token), window.location.href).href;
  }

  function previewLink(lead, tab) {
    return new URL(
      "report.html?token=" + encodeURIComponent(lead.token) + "&preview=1&view=" + (tab || "basic"),
      window.location.href
    ).href;
  }

  function hasPublished(lead) {
    return !!((lead.report && lead.report.published) || (lead.deepReport && lead.deepReport.published) || lead.reportStatus === "ready");
  }

  function judgePill(level) {
    return '<span class="pill pill--' + UI.judgeTone(level) + '">' + esc(level) + "</span>";
  }

  function statusPill(status) {
    return '<span class="pill pill--' + UI.statusTone(status) + '">' + esc(UI.statusLabel(status)) + "</span>";
  }

  function navActive() {
    UI.$$(".nav-btn").forEach(function (btn) {
      btn.classList.toggle("is-active", btn.getAttribute("data-section") === state.section);
    });
  }

  function renderTopbar() {
    const titles = {
      leads: "诊断提交",
      reports: "诊断报告",
      stats: "数据统计",
      settings: "设置"
    };
    pageTitle.textContent = titles[state.section] || "诊断后台";
    const exportBtn = state.section === "leads"
      ? '<button class="btn btn--ghost btn--sm" type="button" data-action="export-csv">导出 CSV</button>'
      : "";
    topbarActions.innerHTML = exportBtn + '<span class="pill pill--amber">旧版演示 · 正式版 LLM 自动生成</span>' + '<span class="demo-badge">演示数据 · 本机浏览器</span>';
  }

  function render() {
    navActive();
    renderTopbar();
    if (state.section === "leads") renderLeads();
    else if (state.section === "reports") renderReports();
    else if (state.section === "stats") renderStats();
    else renderSettings();
  }

  /* ---------- 诊断提交 ---------- */

  function renderLeads() {
    Store.getLeads().forEach(function (lead) {
      if (lead.freeStatus) Store.syncLead(lead.id);
    });
    const summary = Store.getStatsSummary(7);
    const cards = [
      { label: "待出报告", value: summary.statusCounts.submitted, hint: "今日提交 " + summary.todaySubmits },
      { label: "报告待发", value: summary.statusCounts.ready, hint: "草稿或待发布" },
      { label: "已发布", value: summary.statusCounts.published, hint: "客户可打开链接" },
      { label: "已劝退", value: summary.statusCounts.rejected, hint: "不推深度诊断" }
    ];
    const filters = [
      { key: "all", label: "全部" },
      { key: "submitted", label: "待出报告" },
      { key: "ready", label: "报告待发" },
      { key: "published", label: "已发布" },
      { key: "rejected", label: "已劝退" }
    ];
    content.innerHTML = [
      '<div class="stat-row">',
      cards.map(function (card) {
        return [
          '<div class="stat-card">',
          '  <p class="stat-card__label">' + esc(card.label) + "</p>",
          '  <p class="stat-card__value">' + esc(card.value) + "</p>",
          '  <p class="stat-card__hint">' + esc(card.hint) + "</p>",
          "</div>"
        ].join("");
      }).join(""),
      "</div>",
      '<div class="toolbar">',
      '  <div class="search-box"><input id="leadSearch" type="search" placeholder="搜客户、品类、编号" autocomplete="off"></div>',
      '  <div class="filter-group" role="group" aria-label="按状态筛选">',
      filters.map(function (filter) {
        return '<button class="filter-btn ' + (state.filter === filter.key ? "is-active" : "") + '" type="button" data-action="filter-leads" data-filter="' + filter.key + '">' + esc(filter.label) + "</button>";
      }).join(""),
      "  </div>",
      '  <div class="toolbar__spacer"></div>',
      '  <span class="tiny muted">按提交时间倒序</span>',
      "</div>",
      '<div id="leadTableWrap"></div>'
    ].join("");

    const search = document.getElementById("leadSearch");
    if (search) {
      search.value = state.search;
      search.addEventListener("input", function () {
        state.search = this.value;
        state.page = 1;
        renderLeadTable();
      });
    }
    renderLeadTable();
  }

  function filteredLeads() {
    let leads = Store.getLeads();
    leads.sort(function (a, b) {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    if (state.filter !== "all") {
      leads = leads.filter(function (lead) { return lead.status === state.filter; });
    }
    const q = state.search.trim().toLowerCase();
    if (q) {
      leads = leads.filter(function (lead) {
        const a = lead.answers || {};
        return [lead.id, lead.customer, a.category, a.product, a.platform, a.contact, a.market]
          .join(" ")
          .toLowerCase()
          .indexOf(q) >= 0;
      });
    }
    return leads;
  }

  function renderLeadTable() {
    const wrap = document.getElementById("leadTableWrap");
    if (!wrap) return;
    const leads = filteredLeads();
    const pages = Math.max(1, Math.ceil(leads.length / state.pageSize));
    if (state.page > pages) state.page = pages;
    if (!leads.length) {
      wrap.innerHTML = '<div class="table-card"><div class="empty-state"><strong>没有符合条件的诊断</strong>换个筛选条件，或者等新的提交。</div></div>';
      return;
    }
    const start = (state.page - 1) * state.pageSize;
    const pageLeads = leads.slice(start, start + state.pageSize);
    const rows = pageLeads.map(function (lead) {
      const a = lead.answers || {};
      const assess = assessLead(lead);
      const product = a.category ? a.category + (a.product ? " · " + a.product : "") : (a.product || "未填品类");
      return [
        '<tr class="is-clickable" data-action="view-lead" data-id="' + esc(lead.id) + '">',
        '  <td><span class="cell-main">' + esc(lead.customer || a.contact || "未命名") + '</span><span class="cell-sub mono">' + esc(lead.id) + "</span></td>",
        '  <td><span class="cell-main">' + esc(product) + '</span><span class="cell-sub">' + (STAGES[lead.stage] ? esc(STAGES[lead.stage].label) + " · " : "") + esc(a.platform || "平台未定") + "</span></td>",
        '  <td><span class="cell-main">' + esc(a.budget || "预算未填") + '</span><span class="cell-sub">' + esc(a.market || "市场未定") + "</span></td>",
        "  <td>" + judgePill(assess.level) + "</td>",
        "  <td>" + statusPill(lead.status) + "</td>",
        '  <td><span class="cell-sub">' + esc(UI.formatDateTime(lead.createdAt)) + "</span></td>",
        '  <td class="cell-nowrap"><button class="link-btn" type="button" data-action="view-lead" data-id="' + esc(lead.id) + '">查看</button></td>',
        "</tr>"
      ].join("");
    }).join("");

    let pageButtons = "";
    for (let i = 1; i <= pages; i += 1) {
      pageButtons += '<button class="page-btn ' + (i === state.page ? "is-active" : "") + '" type="button" data-action="page" data-page="' + i + '">' + i + "</button>";
    }

    wrap.innerHTML = [
      '<div class="table-card">',
      '  <div class="table-wrap">',
      '    <table class="admin-table">',
      "      <thead><tr><th>客户</th><th>品类 / 平台</th><th>预算 / 市场</th><th>初判</th><th>状态</th><th>提交时间</th><th></th></tr></thead>",
      "      <tbody>" + rows + "</tbody>",
      "    </table>",
      "  </div>",
      '  <div class="pagination">',
      "    <span>共 " + leads.length + " 条 · 第 " + state.page + " / " + pages + " 页</span>",
      '    <div class="pagination__buttons">' + pageButtons + "</div>",
      "  </div>",
      "</div>"
    ].join("");
  }

  /* ---------- 抽屉 ---------- */

  function openDrawer(html, mode) {
    drawer.innerHTML = html;
    drawer.classList.add("is-open");
    overlay.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    document.body.classList.add("drawer-open");
    state.drawerMode = mode;
  }

  function closeDrawer() {
    drawer.classList.remove("is-open");
    overlay.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    document.body.classList.remove("drawer-open");
    if (state.drawerMode !== "editor") state.selectedId = null;
  }

  function drawerHead(lead, title, subtitle) {
    return [
      '<div class="drawer__head">',
      '  <div class="drawer__title"><h2>' + esc(title) + '</h2><p>' + esc(subtitle || lead.id) + "</p></div>",
      "  " + statusPill(lead.status),
      '  <button class="icon-btn" type="button" data-action="close-drawer" aria-label="关闭">×</button>',
      "</div>"
    ].join("");
  }

  function answerItem(label, value) {
    return '<div class="answer-item"><span>' + esc(label) + "</span><strong>" + esc(value || "—") + "</strong></div>";
  }

  function openLeadDrawer(id) {
    const lead = Store.getLeadById(id);
    if (!lead) return;
    state.selectedId = id;
    const a = lead.answers || {};
    const assess = assessLead(lead);
    const concerns = Array.isArray(a.concerns) ? a.concerns.join("、") : "";
    const experience = (a.experience || "") + (a.experienceOther ? " / " + a.experienceOther : "");
    const concernText = concerns + (a.concernsOther ? " / " + a.concernsOther : "");
    const newFlow = !!lead.reportStatus;
    const published = hasPublished(lead);
    const reportExists = !!(lead.report || lead.deepReport || lead.reportStatus);

    const answerHtml = [
      answerItem("品类", a.category),
      answerItem("具体产品", a.product),
      answerItem("样品", a.sample),
      answerItem("货源", a.source),
      answerItem("预算", a.budget),
      answerItem("市场", a.market),
      answerItem("平台", a.platform),
      answerItem("卖货经验", experience),
      answerItem("经营主体", a.entity),
      answerItem("外语水平", a.language),
      answerItem("每天投入", a.time),
      answerItem("最担心", concernText),
      answerItem("多久看结果", a.expected),
      answerItem("亏 30% 能接受", a.lossTolerance),
      answerItem("联系方式", a.contact),
      answerItem("隐私授权", a.consent ? "已同意" : "未同意")
    ].join("");

    const linkSection = published
      ? [
        '<div class="drawer__section">',
        '  <p class="drawer__section-title">客户链接 <span>只发本人</span></p>',
        '  <div class="report-link-box">',
        '    <input type="text" readonly value="' + esc(linkFor(lead)) + '">',
        '    <button class="btn btn--ghost btn--sm" type="button" data-action="copy-link" data-id="' + esc(lead.id) + '">复制</button>',
        "  </div>",
        '  <p class="tiny muted" style="margin-top:6px;">链接被转发后，任何人都能打开。正式版会加访问校验。</p>',
        "</div>"
      ].join("")
      : '<p class="tiny muted" style="margin-top:6px;">基础诊断或深度诊断发布后，这里生成客户链接。</p>';

    openDrawer([
      drawerHead(lead, lead.customer || a.contact || "未命名客户", lead.id + " · " + (lead.source || "H5")),
      '<div class="drawer__body">',
      '  <div class="drawer__section">',
      '    <p class="drawer__section-title">系统初判 <span>只作参考</span></p>',
      '    <div class="judge-card">',
      '      <span class="stamp stamp--sm stamp--' + UI.judgeTone(assess.level) + '">' + esc(assess.level) + "</span>",
      "      <div>",
      "        <h3>" + esc(assess.level) + "</h3>",
      "        <p>" + esc(assess.reason) + "</p>",
      '        <button class="link-btn link-btn--accent" type="button" data-action="adopt-judge" data-id="' + esc(lead.id) + '">采用初判，填入报告</button>',
      "      </div>",
      "    </div>",
      "  </div>",
      '  <div class="drawer__section">',
      '    <p class="drawer__section-title">12 题答案</p>',
      '    <div class="answer-grid">' + answerHtml + "</div>",
      "  </div>",
      lead.notes ? '  <div class="drawer__section"><p class="drawer__section-title">备注</p><p class="small muted" style="margin:0;">' + esc(lead.notes) + "</p></div>" : "",
      '  <div class="drawer__section">',
      '    <p class="drawer__section-title">操作</p>',
      '    <div class="drawer-actions">',
      newFlow
        ? '      <a class="btn btn--accent btn--sm" href="report.html?token=' + encodeURIComponent(lead.token) + '" target="_blank">打开诊断报告</a>'
        : '      <button class="btn btn--accent btn--sm" type="button" data-action="edit-report" data-id="' + esc(lead.id) + '" data-tab="basic">编辑基础诊断</button>' +
          '      <button class="btn btn--ghost btn--sm" type="button" data-action="edit-report" data-id="' + esc(lead.id) + '" data-tab="deep">编辑深度诊断</button>',
      !newFlow && reportExists ? '      <button class="btn btn--ghost btn--sm" type="button" data-action="preview-report" data-id="' + esc(lead.id) + '" data-tab="basic">预览</button>' : "",
      lead.paid ? '      <span class="pill pill--green">已付款</span>' : '      <button class="btn btn--ghost btn--sm" type="button" data-action="mark-paid" data-id="' + esc(lead.id) + '">标记已付款</button>',
      '      <button class="btn btn--ghost btn--sm" type="button" data-action="mark-rejected" data-id="' + esc(lead.id) + '">标记劝退</button>',
      "    </div>",
      "  </div>",
      linkSection,
      "</div>"
    ].join(""), "lead");
  }

  /* ---------- 报告编辑 ---------- */

  function editorTabs(lead, tab) {
    return [
      '<div class="editor-tabs">',
      '  <button class="editor-tab ' + (tab === "basic" ? "is-active" : "") + '" type="button" data-action="edit-report" data-id="' + esc(lead.id) + '" data-tab="basic">基础诊断</button>',
      '  <button class="editor-tab ' + (tab === "deep" ? "is-active" : "") + '" type="button" data-action="edit-report" data-id="' + esc(lead.id) + '" data-tab="deep">深度诊断</button>',
      "</div>"
    ].join("");
  }

  function inputRow(label, path, value, placeholder) {
    return [
      '<div class="editor-row">',
      "  <label>" + esc(label) + "</label>",
      '  <input class="input" type="text" data-field="' + path + '" value="' + esc(value) + '" placeholder="' + esc(placeholder || "") + '">',
      "</div>"
    ].join("");
  }

  function textareaRow(label, path, value, placeholder, extraClass) {
    return [
      '<div class="editor-row">',
      "  <label>" + esc(label) + "</label>",
      '  <textarea class="textarea ' + (extraClass || "") + '" data-field="' + path + '" placeholder="' + esc(placeholder || "") + '">' + esc(value) + "</textarea>",
      "</div>"
    ].join("");
  }

  function basicEditorHtml(lead) {
    const report = lead.report ? clone(lead.report) : makeBasicReport({});
    const published = !!(lead.report && lead.report.published);
    const conclusions = ["建议试", "观望", "劝退"];
    return [
      editorTabs(lead, "basic"),
      published ? '<div class="sample-banner" style="border-color:var(--green);color:var(--green);background:rgba(46,106,78,.05);">基础诊断已发布；修改后再次发布，客户链接会看到最新版本。</div>' : "",
      '<p class="editor-note">发布前至少填完结论、理由、三个发现和一句话建议。带【】的模板文字不能直接发布。</p>',
      '<div class="editor-row"><label>结论</label><select class="select" data-field="conclusion">',
      conclusions.map(function (item) {
        return '<option value="' + esc(item) + '"' + (report.conclusion === item ? " selected" : "") + ">" + esc(item) + "</option>";
      }).join(""),
      "</select></div>",
      textareaRow("一句话理由", "reason", report.reason || "", "这个品、这个预算、这个平台，最关键的判断"),
      textareaRow("发现一 · 标题", "opportunity.title", getPath(report, "opportunity.title"), "例如：小件、认证门槛相对低"),
      textareaRow("发现一 · 正文", "opportunity.body", getPath(report, "opportunity.body"), "具体机会，不写“市场很大”"),
      textareaRow("发现一 · 依据", "opportunity.basis", getPath(report, "opportunity.basis"), "平台数据 / 品类趋势 / 客户原话，1~2 条"),
      textareaRow("发现二 · 标题", "hiddenCost.title", getPath(report, "hiddenCost.title"), "只写一个最容易被忽略的成本或风险"),
      textareaRow("发现二 · 正文", "hiddenCost.body", getPath(report, "hiddenCost.body"), "写透：为什么、会影响什么"),
      textareaRow("发现二 · 粗算", "hiddenCost.calc", getPath(report, "hiddenCost.calc"), "金额或比例，写清假设", "textarea--lg"),
      textareaRow("发现三 · 7 天内先做", "nextStep.action", getPath(report, "nextStep.action"), "一个 7 天内能做完的动作"),
      textareaRow("发现三 · 现在不要做", "nextStep.dontDo", getPath(report, "nextStep.dontDo"), "现在不该花的一笔钱或不该做的事"),
      textareaRow("一句话建议", "advice", report.advice || "", "一句人话，客户能记住"),
      '<div class="editor-actions">',
      '  <button class="btn btn--ghost btn--sm" type="button" data-action="fill-template" data-id="' + esc(lead.id) + '">套用模板</button>',
      '  <button class="btn btn--ghost btn--sm" type="button" data-action="save-report" data-id="' + esc(lead.id) + '" data-publish="false">保存草稿</button>',
      '  <button class="btn btn--accent btn--sm" type="button" data-action="save-report" data-id="' + esc(lead.id) + '" data-publish="true">发布基础诊断</button>',
      '  <button class="btn btn--ghost btn--sm" type="button" data-action="preview-report" data-id="' + esc(lead.id) + '" data-tab="basic">预览</button>',
      "</div>"
    ].join("");
  }

  function deepEditorHtml(lead) {
    const deep = lead.deepReport ? clone(lead.deepReport) : deepTemplate();
    const published = !!(lead.deepReport && lead.deepReport.published);
    return [
      editorTabs(lead, "deep"),
      published ? '<div class="sample-banner" style="border-color:var(--blue);color:var(--blue);background:rgba(45,79,102,.05);">深度诊断已发布；客户在诊断报告页切换“深度诊断”查看。</div>' : "",
      '<p class="editor-note">深度诊断 8 节。发布前每一节都要有内容，不能留【】。</p>',
      (deep.sections || []).map(function (section, index) {
        return [
          '<div class="editor-row">',
          "  <label>" + esc(section.title) + "</label>",
          '  <textarea class="textarea editor-deep" data-deep-index="' + index + '" placeholder="写这一节的内容">' + esc(section.body || "") + "</textarea>",
          "</div>"
        ].join("");
      }).join(""),
      '<div class="editor-actions">',
      '  <button class="btn btn--ghost btn--sm" type="button" data-action="save-deep" data-id="' + esc(lead.id) + '" data-publish="false">保存深度草稿</button>',
      '  <button class="btn btn--accent btn--sm" type="button" data-action="save-deep" data-id="' + esc(lead.id) + '" data-publish="true">发布深度诊断</button>',
      '  <button class="btn btn--ghost btn--sm" type="button" data-action="preview-report" data-id="' + esc(lead.id) + '" data-tab="deep">预览</button>',
      "</div>"
    ].join("");
  }

  function openReportEditor(id, tab) {
    const lead = Store.getLeadById(id);
    if (!lead) return;
    state.selectedId = id;
    state.editorTab = tab === "deep" ? "deep" : "basic";
    openDrawer([
      drawerHead(lead, "编辑诊断 · " + (lead.customer || "客户"), lead.id + " · " + (lead.source || "H5")),
      '<div class="drawer__body">',
      state.editorTab === "deep" ? deepEditorHtml(lead) : basicEditorHtml(lead),
      "</div>"
    ].join(""), "editor");
  }

  function collectBasicForm() {
    const report = makeBasicReport({});
    UI.$$("[data-field]", drawer).forEach(function (el) {
      setPath(report, el.getAttribute("data-field"), String(el.value || "").trim());
    });
    return report;
  }

  function collectDeepForm() {
    const lead = Store.getLeadById(state.selectedId);
    const deep = lead && lead.deepReport ? clone(lead.deepReport) : deepTemplate();
    UI.$$("[data-deep-index]", drawer).forEach(function (el) {
      const index = Number(el.getAttribute("data-deep-index"));
      if (deep.sections[index]) deep.sections[index].body = String(el.value || "").trim();
    });
    return deep;
  }

  function validateBasic(report) {
    const missing = [];
    if (!report.reason.trim()) missing.push("一句话理由");
    if (!getPath(report, "opportunity.body").trim()) missing.push("发现一正文");
    if (!getPath(report, "hiddenCost.body").trim()) missing.push("发现二正文");
    if (!getPath(report, "nextStep.action").trim()) missing.push("发现三下一步");
    if (!report.advice.trim()) missing.push("一句话建议");
    if (missing.length) return "还缺：" + missing.join("、");
    if (JSON.stringify(report).indexOf("【") >= 0) return "还有【待补充】的模板文字，先改成具体内容";
    return "";
  }

  function validateDeep(deep) {
    const blank = [];
    (deep.sections || []).forEach(function (section, index) {
      if (!String(section.body || "").trim()) blank.push("第 " + (index + 1) + " 节");
    });
    if (blank.length) return "还缺：" + blank.join("、");
    if (JSON.stringify(deep).indexOf("【") >= 0) return "还有【待补充】的模板文字，先改成具体内容";
    return "";
  }

  function saveReportAction(publish) {
    const id = state.selectedId;
    if (!id) return;
    const report = collectBasicForm();
    if (publish) {
      const error = validateBasic(report);
      if (error) {
        UI.toast(error);
        return;
      }
    }
    Store.saveReport(id, report, publish);
    render();
    if (publish) {
      openLeadDrawer(id);
      UI.toast("基础诊断已发布，客户链接已生成");
    } else {
      openReportEditor(id, "basic");
      UI.toast("草稿已保存");
    }
  }

  function saveDeepAction(publish) {
    const id = state.selectedId;
    if (!id) return;
    const deep = collectDeepForm();
    if (publish) {
      const error = validateDeep(deep);
      if (error) {
        UI.toast(error);
        return;
      }
    }
    Store.saveDeepReport(id, deep, publish);
    render();
    if (publish) {
      openLeadDrawer(id);
      UI.toast("深度诊断已发布");
    } else {
      openReportEditor(id, "deep");
      UI.toast("深度草稿已保存");
    }
  }

  function fillTemplateAction() {
    const t = BASIC_TEMPLATE;
    const values = {
      reason: t.reason,
      "opportunity.title": t.opportunity.title,
      "opportunity.body": t.opportunity.body,
      "opportunity.basis": t.opportunity.basis,
      "hiddenCost.title": t.hiddenCost.title,
      "hiddenCost.body": t.hiddenCost.body,
      "hiddenCost.calc": t.hiddenCost.calc,
      "nextStep.action": t.nextStep.action,
      "nextStep.dontDo": t.nextStep.dontDo,
      advice: t.advice
    };
    Object.keys(values).forEach(function (path) {
      const el = drawer.querySelector('[data-field="' + path + '"]');
      if (el && (!String(el.value || "").trim() || String(el.value).indexOf("【") >= 0)) el.value = values[path];
    });
    UI.toast("模板已填入，改完再发布");
  }

  function adoptJudgeAction(id) {
    const lead = Store.getLeadById(id);
    if (!lead) return;
    const assess = assessLead(lead);
    const report = lead.report ? clone(lead.report) : makeBasicReport({});
    report.conclusion = assess.level;
    report.reason = assess.reason;
    Store.saveReport(id, report, false);
    render();
    openReportEditor(id, "basic");
    UI.toast("已采用初判，补充三个发现后发布");
  }

  function previewReportAction(id, tab) {
    const lead = Store.getLeadById(id);
    if (!lead) return;
    window.open(previewLink(lead, tab || "basic"), "_blank");
  }

  function copyLinkAction(id) {
    const lead = Store.getLeadById(id);
    if (!lead) return;
    if (!hasPublished(lead)) {
      UI.toast("先发布基础诊断或深度诊断");
      return;
    }
    UI.copyText(linkFor(lead)).then(function () {
      UI.toast("客户链接已复制");
      Store.track("copy_report_link", { leadId: id });
    }).catch(function () {
      UI.toast("复制失败，请手动选中链接");
    });
  }

  function markPaidAction(id) {
    if (!window.confirm("确认已收到这份深度诊断的钱？")) return;
    Store.markPaid(id);
    render();
    openLeadDrawer(id);
    UI.toast("已标记付款");
  }

  function markRejectedAction(id) {
    if (!window.confirm("确认这份诊断不适合现在做？标记后会归到“已劝退”。")) return;
    Store.markRejected(id);
    render();
    closeDrawer();
    UI.toast("已标记劝退");
  }

  /* ---------- 诊断报告 ---------- */

  function renderReports() {
    const leads = Store.getLeads().filter(function (lead) {
      return !lead.reportStatus && !!(lead.report || lead.deepReport);
    }).sort(function (a, b) {
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    if (!leads.length) {
      content.innerHTML = '<div class="table-card"><div class="empty-state"><strong>还没有报告</strong>从“诊断提交”里打开一份诊断，编辑并发布报告。</div></div>';
      return;
    }

    const rows = leads.map(function (lead) {
      const badges = [];
      if (lead.report) badges.push('<span class="pill pill--' + (lead.report.published ? "green" : "amber") + '">基础' + (lead.report.published ? "已发布" : "草稿") + "</span>");
      if (lead.deepReport) badges.push('<span class="pill pill--' + (lead.deepReport.published ? "blue" : "ghost") + '">深度' + (lead.deepReport.published ? "已发布" : "草稿") + "</span>");
      const updated = (lead.report && lead.report.updatedAt) || (lead.deepReport && lead.deepReport.updatedAt) || lead.updatedAt;
      return [
        '<tr data-id="' + esc(lead.id) + '">',
        '  <td><span class="cell-main">' + esc(lead.customer || "未命名") + '</span><span class="cell-sub mono">' + esc(lead.id) + "</span></td>",
        '  <td><div style="display:flex;gap:5px;flex-wrap:wrap;">' + badges.join("") + "</div></td>",
        '  <td><span class="cell-sub">' + esc(UI.formatDateTime(updated)) + "</span></td>",
        '  <td><div class="table-actions">',
        '    <button class="link-btn" type="button" data-action="edit-report" data-id="' + esc(lead.id) + '" data-tab="basic">基础</button>',
        '    <button class="link-btn" type="button" data-action="edit-report" data-id="' + esc(lead.id) + '" data-tab="deep">深度</button>',
        '    <button class="link-btn" type="button" data-action="preview-report" data-id="' + esc(lead.id) + '" data-tab="basic">预览</button>',
        hasPublished(lead)
          ? '    <button class="link-btn link-btn--accent" type="button" data-action="copy-link" data-id="' + esc(lead.id) + '">复制链接</button>'
          : '    <span class="cell-sub">未发布</span>',
        "  </div></td>",
        "</tr>"
      ].join("");
    }).join("");

    content.innerHTML = [
      '<div class="panel" style="margin-bottom:16px;">',
      '  <div class="panel__head"><h2>诊断报告</h2><span>发布后客户通过唯一链接查看</span></div>',
      '  <p class="small muted" style="margin:0;">基础诊断和深度诊断分开编辑；修改已发布报告后，再次发布即可更新客户看到的内容。</p>',
      "</div>",
      '<div class="table-card"><div class="table-wrap"><table class="admin-table">',
      "<thead><tr><th>客户</th><th>诊断状态</th><th>最近更新</th><th>操作</th></tr></thead>",
      "<tbody>" + rows + "</tbody>",
      "</table></div></div>"
    ].join("");
  }

  /* ---------- 数据统计 ---------- */

  function funnelRow(label, value, total, accent) {
    const pct = total ? Math.round((value / total) * 100) : 0;
    const width = value === 0 ? 0 : Math.max(2, pct);
    return [
      '<div class="funnel-row">',
      "  <span>" + esc(label) + "</span>",
      '  <div class="funnel-track"><div class="funnel-fill ' + (accent ? "funnel-fill--accent" : "") + '" style="width:' + width + '%"></div></div>',
      "  <span>" + esc(value) + " · " + pct + "%</span>",
      "</div>"
    ].join("");
  }

  function renderStats() {
    const summary = Store.getStatsSummary(7);
    const total = summary.total;
    const cards = [
      { label: "访问", value: total.visits, hint: "近 7 天落地页访问" },
      { label: "提交", value: total.submits, hint: "提交率 " + percent(total.submits, total.visits) },
      { label: "诊断报告打开", value: total.reportViews, hint: "打开率 " + percent(total.reportViews, total.submits) },
      { label: "深度预约", value: total.ctaClicks, hint: "预约率 " + percent(total.ctaClicks, total.reportViews) }
    ];
    const maxVisits = Math.max.apply(null, summary.rows.map(function (row) { return row.visits; }).concat([1]));
    const maxSubmits = Math.max.apply(null, summary.rows.map(function (row) { return row.submits; }).concat([1]));

    const chart = summary.rows.map(function (row) {
      const visitHeight = row.visits ? Math.max(2, Math.round(row.visits / maxVisits * 100)) : 0;
      const submitHeight = row.submits ? Math.max(2, Math.round(row.submits / maxSubmits * 100)) : 0;
      return [
        '<div class="chart-col">',
        '  <div class="chart-col__bars">',
        '    <div class="chart-bar" style="height:' + visitHeight + '%"></div>',
        '    <div class="chart-bar chart-bar--submits" style="height:' + submitHeight + '%"></div>',
        "  </div>",
        '  <span class="chart-col__label">' + esc(row.label) + "</span>",
        "</div>"
      ].join("");
    }).join("");

    const sourceRows = summary.sources.length
      ? summary.sources.map(function (source) {
        return [
          "<tr>",
          "  <td>" + esc(source.name) + "</td>",
          "  <td>" + esc(source.count) + "</td>",
          "  <td>" + percent(source.count, summary.leadCount) + "</td>",
          "</tr>"
        ].join("");
      }).join("")
      : "<tr><td colspan=\"3\" class=\"muted\">还没有线索</td></tr>";

    const statusRows = [
      ["待出报告", "submitted", summary.statusCounts.submitted],
      ["报告待发", "ready", summary.statusCounts.ready],
      ["已发布", "published", summary.statusCounts.published],
      ["已劝退", "rejected", summary.statusCounts.rejected]
    ].map(function (item) {
      return [
        "<tr>",
        '  <td><span class="pill pill--' + UI.statusTone(item[1]) + '">' + esc(item[0]) + "</span></td>",
        "  <td>" + esc(item[2]) + "</td>",
        "  <td>" + percent(item[2], summary.leadCount) + "</td>",
        "</tr>"
      ].join("");
    }).join("");

    content.innerHTML = [
      '<div class="stat-row">',
      cards.map(function (card) {
        return [
          '<div class="stat-card">',
          '  <p class="stat-card__label">' + esc(card.label) + "</p>",
          '  <p class="stat-card__value">' + esc(card.value) + "</p>",
          '  <p class="stat-card__hint">' + esc(card.hint) + "</p>",
          "</div>"
        ].join("");
      }).join(""),
      "</div>",
      '<div class="stats-grid">',
      '  <div class="panel">',
      '    <div class="panel__head"><h2>转化漏斗</h2><span>近 7 天</span></div>',
      funnelRow("访问", total.visits, total.visits, false),
      funnelRow("开始填写", total.starts, total.visits, false),
      funnelRow("提交", total.submits, total.visits, true),
      funnelRow("打开诊断报告", total.reportViews, total.visits, false),
      funnelRow("预约深度", total.ctaClicks, total.visits, true),
      "  </div>",
      '  <div class="panel">',
      '    <div class="panel__head"><h2>每日访问与提交</h2><span>深色=访问 · 红色=提交</span></div>',
      '    <div class="chart-bars">' + chart + "</div>",
      '    <div class="chart-legend"><span>访问</span><span>提交</span></div>',
      "  </div>",
      "</div>",
      '<div class="stats-grid">',
      '  <div class="panel">',
      '    <div class="panel__head"><h2>线索来源</h2><span>按提交来源</span></div>',
      '    <table class="source-table"><thead><tr><th>来源</th><th>数量</th><th>占比</th></tr></thead><tbody>' + sourceRows + "</tbody></table>",
      "  </div>",
      '  <div class="panel">',
      '    <div class="panel__head"><h2>提交状态</h2><span>共 ' + summary.leadCount + " 条</span></div>",
      '    <table class="source-table"><thead><tr><th>状态</th><th>数量</th><th>占比</th></tr></thead><tbody>' + statusRows + "</tbody></table>",
      "  </div>",
      "</div>",
      '<p class="tiny muted" style="margin-top:14px;">当前统计 = 演示数据 + 本机真实事件。正式版接 CloudBase 后沿用同一口径：访问 → 开始填写 → 提交 → 打开诊断报告 → 预约深度。</p>'
    ].join("");
  }

  /* ---------- 设置 ---------- */

  function renderSettings() {
    const settings = Store.getSettings();
    content.innerHTML = [
      '<div class="settings-grid">',
      '  <div class="settings-card">',
      "    <h2>交付设置</h2>",
      "    <p>这些值会同步到留资页、付款页和诊断报告页。改完保存，刷新页面生效。</p>",
      '    <div class="settings-row"><label for="setWechatId">微信号</label><input class="input" id="setWechatId" value="' + esc(settings.wechatId) + '"></div>',
      '    <div class="settings-row"><label for="setWechatLabel">微信显示名</label><input class="input" id="setWechatLabel" value="' + esc(settings.wechatLabel) + '"></div>',
      '    <div class="settings-row"><label for="setPrice">完整版价格（元）</label><input class="input" id="setPrice" type="number" min="0" value="' + esc(settings.price) + '"></div>',

      '    <div class="settings-actions"><button class="btn btn--accent btn--sm" type="button" data-action="save-settings">保存设置</button></div>',
      "  </div>",
      '  <div>',
      '    <div class="settings-card" style="margin-bottom:16px;">',
      "      <h2>数据</h2>",
      "      <p>静态演示版的数据只存在本机浏览器。换浏览器、清缓存都会丢。</p>",
      '      <div class="settings-actions">',
      '        <button class="btn btn--ghost btn--sm" type="button" data-action="export-json">导出全部数据 JSON</button>',
      "      </div>",
      "    </div>",
      '    <div class="settings-card danger-zone">',
      "      <h2>重置演示数据</h2>",
      "      <p>会清空本机所有提交和报告，恢复初始 13 条演示线索。正式数据不要在这里重置。</p>",
      '      <div class="settings-actions"><button class="btn btn--ghost btn--sm" type="button" data-action="reset-demo">重置演示数据</button></div>',
      "    </div>",
      "  </div>",
      "</div>",
      '<div class="settings-grid" style="margin-top:16px;">',
      '  <div class="settings-card">',
      "    <h2>上线前还要补</h2>",
      "    <ul class=\"note-list\">",
      "      <li>腾讯云 CloudBase：数据库、静态托管、访问统计</li>",
      "      <li>后台登录与权限：只让交付人员看客户信息</li>",
      "      <li>唯一链接校验：加过期时间或访问码</li>",
      "      <li>企微活码：免费留资页单独放，和收款码分开</li>",
      "      <li>交付：企微发报告链接；等待页轮询/推送；不做短信和邮箱</li>",
      "      <li>收款码：只在深度诊断付款页，后台人工标记已付</li>",
      "      <li>隐私政策：补公司主体、保存期限、删除流程</li>",
      "      <li>备份：客户数据和报告定期导出</li>",
      "    </ul>",
      "  </div>",
      '  <div class="settings-card">',
      "    <h2>当前口径</h2>",
      "    <p>“敢劝退”是差异点：预算、货源、风险承受力不支持时，不卖深度诊断。系统初判只作参考，发布前由人确认。</p>",
      "    <p>留客资免费；付款只对深度诊断；企微二维码和收款码不同页。</p>",
      "    <p>免费版 1 页；完整版 69 元；报告异步生成，可以退出；交付统一走企微。</p>",
      "    <p>正式版由 LLM 直接生成报告，不做人工审核；平台规则/合规/税率必须引用知识库。</p>",
      "    <p>报告只做入场判断，不承诺出单、不承诺赚钱、不替代持牌服务。</p>",
      "  </div>",
      "</div>"
    ].join("");
  }

  function saveSettingsAction() {
    const read = function (id, fallback) {
      const el = document.getElementById(id);
      return el ? String(el.value || "").trim() : fallback;
    };
    Store.updateSettings({
      wechatId: read("setWechatId", APP.wechatId) || APP.wechatId,
      wechatLabel: read("setWechatLabel", APP.wechatLabel) || APP.wechatLabel,
      price: Number(read("setPrice", APP.price)) || APP.price,
      priceAfter: Number(read("setPrice", APP.price)) || APP.price,
      sla: APP.sla,
      deepSla: APP.deepSla
    });
    UI.toast("设置已保存");
    renderSettings();
  }

  function resetDemoAction() {
    if (!window.confirm("确认重置演示数据？本机所有提交和报告都会被清空。")) return;
    Store.reset();
    state.filter = "all";
    state.search = "";
    state.page = 1;
    state.section = "leads";
    closeDrawer();
    render();
    UI.toast("演示数据已重置");
  }

  function exportJsonAction() {
    download("越技诊断数据-" + todayStamp() + ".json", JSON.stringify(Store.getState(), null, 2), "application/json;charset=utf-8");
    UI.toast("数据已导出");
  }

  function csvCell(value) {
    return '"' + String(value === undefined || value === null ? "" : value).replace(/"/g, '""') + '"';
  }

  function exportLeadsCsv() {
    const leads = Store.getLeads().sort(function (a, b) {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    if (!leads.length) {
      UI.toast("没有可导出的线索");
      return;
    }
    const header = [
      "客户/微信名", "来源", "平台/品类", "预算", "当前节点", "下一步", "最近更新", "备注",
      "诊断编号", "市场", "产品", "货源", "经验", "主体", "外语", "每天投入", "担心", "期望", "风险承受",
      "诊断状态", "报告链接"
    ];
    const nodeMap = {
      submitted: "清单已填",
      ready: "基础诊断待发",
      published: "基础诊断已发",
      rejected: "已劝退"
    };
    const nextMap = {
      submitted: "出基础诊断",
      ready: "发基础诊断",
      published: "问深度诊断",
      rejected: "不跟进"
    };
    const rows = leads.map(function (lead) {
      const a = lead.answers || {};
      const assess = assessLead(lead);
      const concerns = Array.isArray(a.concerns) ? a.concerns.join("、") : "";
      const reportStatus = [
        lead.report ? (lead.report.published ? "基础已发布" : "基础草稿") : "",
        lead.deepReport ? (lead.deepReport.published ? "深度已发布" : "深度草稿") : ""
      ].filter(Boolean).join(" / ") || "未出报告";
      const notes = [lead.notes, "初判：" + assess.level].filter(Boolean).join("；");
      return [
        lead.customer || a.contact || "",
        lead.source || "",
        (a.category || "") + " / " + (a.platform || ""),
        a.budget || "",
        nodeMap[lead.status] || lead.status,
        nextMap[lead.status] || "",
        UI.formatDate(lead.updatedAt || lead.createdAt),
        notes,
        lead.id,
        a.market || "",
        a.product || "",
        a.source || "",
        a.experience || "",
        a.entity || "",
        a.language || "",
        a.time || "",
        concerns + (a.concernsOther ? " / " + a.concernsOther : ""),
        a.expected || "",
        a.lossTolerance || "",
        reportStatus,
        hasPublished(lead) ? linkFor(lead) : ""
      ];
    });
    const csv = "\ufeff" + [header].concat(rows).map(function (row) {
      return row.map(csvCell).join(",");
    }).join("\r\n");
    download("跨境诊断线索-" + todayStamp() + ".csv", csv, "text/csv;charset=utf-8");
    Store.track("export_csv", { count: leads.length });
    UI.toast("已导出 " + leads.length + " 条");
  }

  /* ---------- 事件 ---------- */

  function handleAction(event) {
    const el = event.target.closest("[data-action]");
    if (!el) return;
    const action = el.getAttribute("data-action");
    const id = el.getAttribute("data-id") || state.selectedId;
    const tab = el.getAttribute("data-tab") || "basic";

    if (action === "view-lead") {
      openLeadDrawer(id);
      return;
    }
    if (action === "edit-report") {
      openReportEditor(id, tab);
      return;
    }
    if (action === "filter-leads") {
      state.filter = el.getAttribute("data-filter");
      state.page = 1;
      renderLeads();
      return;
    }
    if (action === "page") {
      state.page = Number(el.getAttribute("data-page")) || 1;
      renderLeadTable();
      return;
    }
    if (action === "close-drawer") {
      closeDrawer();
      return;
    }
    if (action === "adopt-judge") {
      adoptJudgeAction(id);
      return;
    }
    if (action === "save-report") {
      saveReportAction(el.getAttribute("data-publish") === "true");
      return;
    }
    if (action === "save-deep") {
      saveDeepAction(el.getAttribute("data-publish") === "true");
      return;
    }
    if (action === "fill-template") {
      fillTemplateAction();
      return;
    }
    if (action === "preview-report") {
      previewReportAction(id, tab);
      return;
    }
    if (action === "copy-link") {
      copyLinkAction(id);
      return;
    }
    if (action === "mark-paid") {
      markPaidAction(id);
      return;
    }
    if (action === "mark-rejected") {
      markRejectedAction(id);
      return;
    }
    if (action === "export-csv") {
      exportLeadsCsv();
      return;
    }
    if (action === "export-json") {
      exportJsonAction();
      return;
    }
    if (action === "reset-demo") {
      resetDemoAction();
      return;
    }
    if (action === "save-settings") {
      saveSettingsAction();
    }
  }

  UI.$$(".nav-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      state.section = btn.getAttribute("data-section");
      state.page = 1;
      closeDrawer();
      render();
      UI.scrollTop("auto");
    });
  });

  document.addEventListener("click", handleAction);
  overlay.addEventListener("click", closeDrawer);
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closeDrawer();
  });

  render();
})();
