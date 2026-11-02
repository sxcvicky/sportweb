/* 诊断报告：一次生成完整内容，免费版只显示 preview，9.9 元解锁 full */

(function () {
  const root = document.getElementById("reportRoot");
  const printBtn = document.getElementById("printBtn");
  if (!root) return;

  const sampleMode = UI.getQuery("sample") === "1";
  const token = UI.getQuery("token");
  const requestedView = UI.getQuery("view") === "full" ? "full" : "free";

  let currentLead = null;
  let currentView = requestedView;
  let pollTimer = null;

  Api.captureUtm();
  if (!sampleMode) Api.track("page_view", { page: "report" });

  function esc(value) {
    return UI.escapeHTML(value);
  }

  function stageOf(lead) {
    return STAGES[(lead && lead.stage) || "not_started"] || STAGES.not_started;
  }

  function trackReal(type, meta) {
    if (sampleMode) return;
    Api.track(type, meta || {});
  }

  function normalize(data) {
    const diagnosis = data.diagnosis;
    return Object.assign({}, diagnosis, {
      report: data.report,
      paid: data.paid,
      reportStatus: diagnosis.status
    });
  }

  function categoryProduct(lead) {
    const a = lead.answers || {};
    return (a.category || "未填品类") + (a.product ? " · " + a.product : "");
  }

  function reportDate(lead, report) {
    return UI.formatDate((report && report.publishedAt) || lead.reportReadyAt || lead.createdAt);
  }

  function metaGrid(lead, report) {
    const stage = stageOf(lead);
    const a = lead.answers || {};
    return [
      '<div class="report-meta">',
      '  <div><span>客户</span><strong>' + esc(lead.customer || "企微用户") + "</strong></div>",
      '  <div><span>阶段</span><strong>' + esc(stage.label) + "</strong></div>",
      '  <div><span>品类</span><strong>' + esc(categoryProduct(lead)) + "</strong></div>",
      '  <div><span>平台</span><strong>' + esc(a.platform || "—") + "</strong></div>",
      '  <div><span>规模/市场</span><strong>' + esc(a.monthlyGMV || a.market || a.budget || "—") + "</strong></div>",
      '  <div><span>日期</span><strong>' + esc(reportDate(lead, report)) + "</strong></div>",
      "</div>",
      '<div class="report-id">诊断编号 ' + esc(lead.id) + " · 越技外贸出海诊断</div>"
    ].join("");
  }

  function reportHead(lead, report, title) {
    return [
      '<header class="report-head">',
      '  <div class="report-brand"><b>越技</b><span>外贸出海诊断</span></div>',
      "  <h1>" + esc(title) + "</h1>",
      metaGrid(lead, report),
      "</header>"
    ].join("");
  }

  function sampleBanner() {
    if (sampleMode) return '<div class="sample-banner">示例诊断报告 · 数据为演示。</div>';
    return "";
  }

  function reportFooter(lead, report) {
    const sources = (report && report.sources) || [];
    return [
      '<footer class="report-foot">',
      sources.length
        ? [
            '  <div class="report-sources">',
            '    <p class="eyebrow">知识库来源</p>',
            sources.map(function (source) {
              return "    <p>" + esc(source.title || "") + (source.updated_at ? " · 更新于 " + esc(source.updated_at) : "") + "</p>";
            }).join(""),
            "  </div>"
          ].join("")
        : "",
      "  <p>数据来源：平台公开规则、公开报价、客户提供信息；截至 " + esc(reportDate(lead, report)) + "。</p>",
      "  <p>本诊断报告只做判断和建议，不构成收入承诺，不替代税务、法律、报关等持牌服务。</p>",
      sampleMode ? "  <p>示例诊断报告，数据为演示，不代表真实客户结果。</p>" : "",
      "</footer>"
    ].join("");
  }

  function tabsHtml(view) {
    return [
      '<div class="report-tabs no-print" role="tablist">',
      '  <button type="button" data-view="free" class="' + (view === "free" ? "is-active" : "") + '">免费版</button>',
      '  <button type="button" data-view="full" class="' + (view === "full" ? "is-active" : "") + '">完整版 9.9</button>',
      "</div>"
    ].join("");
  }

  function freeTierCta(lead) {
    if (lead.paid) {
      return [
        '<section class="report-deep">',
        '  <p class="eyebrow">完整版</p>',
        "  <h2>完整版已解锁。</h2>",
        '  <p class="lead">完整版给 4 个解法：开源、提效、放大、90 天节奏。</p>',
        '  <button class="btn btn--accent btn--block" type="button" data-view="full">查看完整版</button>',
        "</section>"
      ].join("");
    }
    return [
      '<section class="report-deep">',
      '  <p class="eyebrow">完整版 9.9</p>',
      "  <h2>免费版看 6 个卡点，完整版给 4 个解法。</h2>",
      '  <p class="lead">先开源，再提效，再放大，最后排 90 天节奏。</p>',
      '  <ul class="deep-teaser-list">',
      "    <li><span>开源：增量从哪来</span><span>01</span></li>",
      "    <li><span>提效：把现有的钱赚回来</span><span>02</span></li>",
      "    <li><span>放大：供应链、团队、合规</span><span>03</span></li>",
      "    <li><span>90 天节奏与边界</span><span>04</span></li>",
      "  </ul>",
      '  <div class="report-cta">',
      '    <div class="report-cta__price"><span>完整诊断</span><strong>9.9 元</strong></div>',
      '    <button class="btn btn--accent" type="button" data-action="pay">9.9 元，解锁完整版</button>',
      '    <p class="report-cta__note">付款后立即解锁完整版。</p>',
      "  </div>",
      "</section>"
    ].join("");
  }

  function freeHtml(lead, preview) {
    const problems = preview.problems || [];
    const priority = preview.priority || {};
    const problemHtml = problems.map(function (problem, index) {
      const isPriority = problem.dimension === priority.dimension;
      return [
        '<div class="growth-problem' + (isPriority ? " is-priority" : "") + '">',
        '  <span class="growth-problem__num">' + String(index + 1).padStart(2, "0") + "</span>",
        '  <div class="growth-problem__body">',
        '    <div class="growth-problem__title"><h3>' + esc(problem.title || "增长卡点") + "</h3>" + (isPriority ? '<span class="growth-problem__flag">最值得先拿</span>' : "") + "</div>",
        '    <p class="growth-problem__finding">' + esc(problem.finding || "—") + "</p>",
        '    <p class="growth-problem__evidence">' + esc(problem.evidence || "") + "</p>",
        "  </div>",
        "</div>"
      ].join("");
    }).join("");

    return [
      '<article class="report-sheet report-growth">',
      reportHead(lead, preview, "外贸出海" + stageOf(lead).diagnosis + " · 免费版"),
      '  <section class="growth-thesis">',
      '    <p class="eyebrow">你的增长判断</p>',
      "    <h2>" + esc(preview.headline || "你已经有一个可以放大的基础。") + "</h2>",
      '    <p class="growth-thesis__sub">我们看了 10 个维度，你有 6 个增长卡点。</p>',
      "  </section>",
      '  <section class="growth-problems">',
      '    <div class="growth-problems__head"><p class="eyebrow">6 个增长卡点</p><span>按增长空间看</span></div>',
      problemHtml,
      "  </section>",
      '  <section class="growth-priority">',
      '    <p class="eyebrow">最值得先拿的增长</p>',
      "    <h2>" + esc(priority.title || "先拿一个增长") + "</h2>",
      "    <p>" + esc(priority.why || "—") + "</p>",
      '    <div class="growth-priority__upside"><strong>拿到之后</strong><p>' + esc(priority.upside || "—") + "</p></div>",
      "  </section>",
      '  <section class="growth-next">',
      '    <p class="eyebrow">30 天能看到的变化</p>',
      "    <p>" + esc(preview.next30 || "—") + "</p>",
      "  </section>",
      '  <section class="growth-actions">',
      '    <div class="next-box">',
      '      <div class="next-box__item"><strong>先做</strong><p>' + esc(preview.firstMove || "—") + "</p></div>",
      '      <div class="next-box__item is-dont"><strong>先别急着</strong><p>' + esc(preview.dontRush || "—") + "</p></div>",
      "    </div>",
      "  </section>",
      freeTierCta(lead),
      reportFooter(lead, preview),
      "</article>"
    ].join("");
  }

  function fullHtml(lead, full) {
    const stage = stageOf(lead);
    const solutions = (full.solutions || []).map(function (solution, index) {
      const actions = (solution.actions || []).map(function (action) {
        return "<li>" + esc(action) + "</li>";
      }).join("");
      const plan = solution.plan
        ? [
            '<div class="solution-plan">',
            '  <div><span>30 天</span><p>' + esc(solution.plan.d30 || "—") + "</p></div>",
            '  <div><span>60 天</span><p>' + esc(solution.plan.d60 || "—") + "</p></div>",
            '  <div><span>90 天</span><p>' + esc(solution.plan.d90 || "—") + "</p></div>",
            "</div>"
          ].join("")
        : "";
      return [
        '<section class="solution-module">',
        '  <div class="solution-module__head"><span class="solution-module__num">' + String(index + 1).padStart(2, "0") + '</span><div><p class="eyebrow">' + (index === 0 ? "先开源" : "解法") + "</p><h2>" + esc(solution.title || "解法") + "</h2></div></div>",
        '  <p class="solution-module__judgment">' + esc(solution.judgment || "—") + "</p>",
        '  <ul class="solution-actions">' + actions + "</ul>",
        '  <div class="solution-meta">',
        '    <div><span>看什么指标</span><strong>' + esc(solution.metric || "—") + "</strong></div>",
        solution.boundary ? '    <div><span>边界</span><strong>' + esc(solution.boundary) + "</strong></div>" : "",
        "  </div>",
        plan,
        "</section>"
      ].join("");
    }).join("");

    return [
      '<article class="report-sheet deep-sheet report-growth">',
      reportHead(lead, full, "外贸出海" + stage.diagnosis + " · 增长方案"),
      '  <section class="growth-thesis growth-thesis--full">',
      '    <p class="eyebrow">完整版增长判断</p>',
      "    <h2>" + esc(full.headline || "先把增长拿回来。") + "</h2>",
      "  </section>",
      solutions,
      reportFooter(lead, full),
      "</article>"
    ].join("");
  }

  function lockedFullHtml(lead) {
    const stage = stageOf(lead);
    return [
      '<article class="report-sheet report-growth">',
      reportHead(lead, null, "外贸出海" + stage.diagnosis + " · 增长方案"),
      '  <div class="report-locked">',
      '    <span class="stamp stamp--amber">完整版 9.9</span>',
      "    <h2>免费版看 6 个卡点，完整版给 4 个解法。</h2>",
      '    <p class="lead">完整版会针对「' + esc(stage.label) + "」这一档，给出：</p>",
      '    <ul class="report-locked__list">',
      "      <li>开源：增量从哪来</li>",
      "      <li>提效：把现有的钱赚回来</li>",
      "      <li>放大：供应链、团队、合规</li>",
      "      <li>90 天节奏与边界</li>",
      "    </ul>",
      '    <div class="report-cta">',
      '      <div class="report-cta__price"><span>完整诊断</span><strong>9.9 元</strong></div>',
      '      <button class="btn btn--accent" type="button" data-action="pay">9.9 元，解锁完整版</button>',
      '      <p class="report-cta__note">付款后立即解锁完整版。</p>',
      "    </div>",
      "  </div>",
      reportFooter(lead, null),
      "</article>"
    ].join("");
  }

  function generatingHtml(lead) {
    return [
      '<div class="report-state">',
      '  <span class="stamp stamp--amber">生成中</span>',
      "  <h1>诊断报告生成中。</h1>",
      "  <p>诊断编号 <span class=\"mono\">" + esc(lead.id) + "</span>。可以退出；好了会在企微通知你，也可以点下面刷新。</p>",
      '  <button class="btn btn--accent" type="button" data-action="refresh">刷新看看</button>',
      '  <a class="btn btn--ghost" href="my.html">我的诊断</a>',
      "</div>"
    ].join("");
  }

  function pendingHtml(lead) {
    return [
      '<div class="report-state">',
      '  <span class="stamp stamp--amber">待开始</span>',
      "  <h1>先加企微，开始生成。</h1>",
      "  <p>诊断表已填完。加企微后开始生成报告；生成中可以退出。</p>",
      '  <a class="btn btn--accent" href="lead.html?token=' + encodeURIComponent(lead.token) + '">去加企微，开始生成</a>',
      '  <a class="btn btn--ghost" href="my.html">我的诊断</a>',
      "</div>"
    ].join("");
  }

  function failedHtml() {
    return [
      '<div class="report-state">',
      '  <span class="stamp stamp--red">生成失败</span>',
      "  <h1>报告没生成成功。</h1>",
      "  <p>可以刷新重试；如果一直失败，请从“我的诊断”或企微联系我们。</p>",
      '  <button class="btn btn--accent" type="button" data-action="refresh">重新生成</button>',
      '  <a class="btn btn--ghost" href="my.html">我的诊断</a>',
      "</div>"
    ].join("");
  }

  function rejectedHtml() {
    return [
      '<div class="report-state">',
      '  <span class="stamp stamp--red">先别做</span>',
      "  <h1>这份诊断，不建议现在入场。</h1>",
      "  <p>从你填的信息看，预算、货源、风险承受或合规条件还不支持现在开始。先把条件补齐，再回来做一次诊断。</p>",
      "  <p>具体问题可以在企微里回复诊断编号，我们按你的情况说清楚。</p>",
      '  <a class="btn btn--ghost" href="my.html">我的诊断</a>',
      '  <a class="btn btn--ghost" href="index.html">返回首页</a>',
      "</div>"
    ].join("");
  }

  function invalidHtml() {
    return [
      '<div class="report-state">',
      '  <span class="stamp stamp--red">链接无效</span>',
      "  <h1>这份诊断报告找不到了。</h1>",
      "  <p>链接可能过期，或者诊断编号不对。重新做一次诊断，或者从“我的诊断”查看。</p>",
      '  <a class="btn btn--accent" href="index.html">重新做诊断</a>',
      '  <a class="btn btn--ghost" href="my.html">我的诊断</a>',
      "</div>"
    ].join("");
  }

  function render(lead, view) {
    currentLead = lead;
    currentView = view;
    const status = lead.status || lead.reportStatus || (lead.report ? "ready" : "pending");

    if (status === "pending") {
      root.innerHTML = pendingHtml(lead);
      return;
    }
    if (status === "generating") {
      root.innerHTML = generatingHtml(lead);
      bind(lead, status);
      startPolling(lead);
      return;
    }
    if (status === "failed") {
      root.innerHTML = failedHtml();
      bind(lead, status);
      return;
    }
    if (status === "rejected") {
      root.innerHTML = rejectedHtml();
      return;
    }

    const report = lead.report || {};
    const preview = report.preview || {};
    const full = report.full || {};
    const body = view === "full"
      ? (lead.paid ? fullHtml(lead, full) : lockedFullHtml(lead))
      : freeHtml(lead, preview);

    root.innerHTML = sampleBanner() + tabsHtml(view) + body;
    bind(lead, status);
    trackReal("report_view", { leadId: lead.id, view: view });
    startPolling(lead);
  }

  function bind(lead, status) {
    UI.$$("[data-view]", root).forEach(function (button) {
      button.addEventListener("click", function () {
        render(lead, button.getAttribute("data-view") === "full" ? "full" : "free");
      });
    });
    UI.$$('[data-action="pay"]', root).forEach(function (button) {
      button.addEventListener("click", function () {
        trackReal("cta_deep_report", { leadId: lead.id });
        window.location.href = "pay.html?token=" + encodeURIComponent(lead.token);
      });
    });
    UI.$$('[data-action="refresh"]', root).forEach(function (button) {
      button.addEventListener("click", function () {
        const retry = (lead.status || lead.reportStatus) === "failed";
        button.disabled = true;
        const task = retry ? Api.startReport(token) : Promise.resolve();
        task.then(function () {
          return Api.getReport(token);
        }).then(function (data) {
          render(normalize(data), currentView);
        }).catch(function (error) {
          button.disabled = false;
          UI.toast(error.message || "刷新失败，请稍后重试");
        });
      });
    });
  }

  function startPolling(lead) {
    window.clearInterval(pollTimer);
    if (sampleMode) return;
    if ((lead.status || lead.reportStatus || "") !== "generating") return;
    pollTimer = window.setInterval(function () {
      Api.getReport(token).then(function (data) {
        if (data.diagnosis.status !== "generating") {
          window.clearInterval(pollTimer);
          render(normalize(data), currentView);
        }
      }).catch(function () {
        /* 下一轮再试 */
      });
    }, 2000);
  }

  function resolve() {
    if (sampleMode) {
      render(SAMPLE_LEAD, requestedView);
      return;
    }
    if (!token) {
      root.innerHTML = invalidHtml();
      return;
    }
    Api.getReport(token).then(function (data) {
      render(normalize(data), requestedView);
    }).catch(function (error) {
      if (error.status === 404 || error.status === 410) root.innerHTML = invalidHtml();
      else {
        root.innerHTML = [
          '<div class="report-state">',
          '  <span class="stamp stamp--red">加载失败</span>',
          "  <h1>报告暂时打不开。</h1>",
          '  <p>' + esc(error.message || "请稍后重试。") + "</p>",
          '  <button class="btn btn--accent" type="button" data-action="reload">重新加载</button>',
          '  <a class="btn btn--ghost" href="my.html">我的诊断</a>',
          "</div>"
        ].join("");
        const reload = root.querySelector('[data-action="reload"]');
        if (reload) reload.addEventListener("click", function () { window.location.reload(); });
      }
    });
  }

  if (printBtn) {
    printBtn.addEventListener("click", function () {
      trackReal("print_report", currentLead ? { leadId: currentLead.id } : {});
      window.print();
    });
  }

  resolve();
})();