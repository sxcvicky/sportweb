/* 诊断报告：一次生成完整内容，免费版只显示 preview，69 元解锁 full */

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

  Store.captureUtm();
  if (!sampleMode) Store.track("page_view", { page: "report" });

  function esc(value) {
    return UI.escapeHTML(value);
  }

  function stageOf(lead) {
    return STAGES[(lead && lead.stage) || "not_started"] || STAGES.not_started;
  }

  function trackReal(type, meta) {
    if (sampleMode) return;
    Store.track(type, meta || {});
  }

  function conclusionTone(conclusion) {
    if (conclusion === "建议试" || conclusion === "建议先修利润和合规，再放量" || conclusion === "先保利润，再放量") return "stamp--green";
    if (conclusion === "劝退") return "stamp--red";
    return "stamp--amber";
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
    return [
      '<footer class="report-foot">',
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
      '  <button type="button" data-view="full" class="' + (view === "full" ? "is-active" : "") + '">完整版 69</button>',
      "</div>"
    ].join("");
  }

  function freeTierCta(lead) {
    if (lead.paid) {
      return [
        '<section class="report-deep">',
        '  <p class="eyebrow">完整版</p>',
        "  <h2>完整版已解锁。</h2>",
        '  <p class="lead">完整版包含现状与瓶颈、关键判断、30/60/90 天计划、风险与止损。</p>',
        '  <button class="btn btn--accent btn--block" type="button" data-view="full">查看完整版</button>',
        "</section>"
      ].join("");
    }
    return [
      '<section class="report-deep">',
      '  <p class="eyebrow">完整版 69</p>',
      "  <h2>免费版看结论，完整版看怎么做。</h2>",
      '  <p class="lead">完整版会把判断拆成现状与瓶颈、关键判断、30/60/90 天计划、风险与止损。</p>',
      '  <ul class="deep-teaser-list">',
      "    <li><span>现状与瓶颈</span><span>01</span></li>",
      "    <li><span>关键判断：平台、成本、合规、供应链</span><span>02</span></li>",
      "    <li><span>30 / 60 / 90 天计划</span><span>03</span></li>",
      "    <li><span>风险与止损</span><span>04</span></li>",
      "    <li><span>下一步</span><span>05</span></li>",
      "  </ul>",
      '  <div class="report-cta">',
      '    <div class="report-cta__price"><span>完整诊断</span><strong>69 元</strong></div>',
      '    <button class="btn btn--accent" type="button" data-action="pay">69 元，解锁完整版</button>',
      '    <p class="report-cta__note">付款后立即解锁完整版。</p>',
      "  </div>",
      "</section>"
    ].join("");
  }

  function freeHtml(lead, preview) {
    const opportunity = preview.opportunity || {};
    const hiddenCost = preview.hiddenCost || {};
    const nextStep = preview.nextStep || {};
    return [
      '<article class="report-sheet">',
      reportHead(lead, preview, "外贸出海" + stageOf(lead).diagnosis + "报告 · 免费版"),
      '  <section class="report-conclusion">',
      '    <span class="stamp ' + conclusionTone(preview.conclusion) + '">' + esc(preview.conclusion || "观望") + "</span>",
      '    <div><h2>一句话结论</h2><p>' + esc(preview.reason || "—") + "</p></div>",
      "  </section>",
      '  <section class="report-finding">',
      '    <div class="finding-head"><span class="finding-num">01</span><div><p class="eyebrow">发现一</p><h2>' + esc(opportunity.title || "你的机会") + "</h2></div></div>",
      '    <p class="finding-body">' + esc(opportunity.body || "—") + "</p>",
      opportunity.basis ? '    <div class="finding-basis">' + esc(opportunity.basis) + "</div>" : "",
      "  </section>",
      '  <section class="report-finding">',
      '    <div class="finding-head"><span class="finding-num">02</span><div><p class="eyebrow">发现二</p><h2>' + esc(hiddenCost.title || "最容易被忽略的一笔钱") + "</h2></div></div>",
      '    <p class="finding-body">' + esc(hiddenCost.body || "—") + "</p>",
      hiddenCost.calc ? '    <div class="calc-box">' + esc(hiddenCost.calc) + "</div>" : "",
      "  </section>",
      '  <section class="report-finding">',
      '    <div class="finding-head"><span class="finding-num">03</span><div><p class="eyebrow">发现三</p><h2>下一步先做什么</h2></div></div>',
      '    <div class="next-box">',
      '      <div class="next-box__item"><strong>先做</strong><p>' + esc(nextStep.action || "—") + "</p></div>",
      '      <div class="next-box__item is-dont"><strong>现在不要做</strong><p>' + esc(nextStep.dontDo || "—") + "</p></div>",
      "    </div>",
      "  </section>",
      '  <section class="report-advice">',
      '    <p class="eyebrow">一句话建议</p>',
      "    <p>" + esc(preview.advice || "—") + "</p>",
      "  </section>",
      freeTierCta(lead),
      reportFooter(lead, preview),
      "</article>"
    ].join("");
  }

  function fullHtml(lead, full) {
    const stage = stageOf(lead);
    const sections = (full.sections || []).map(function (section, index) {
      const title = String(section.title || "").replace(/^[一二三四五六七八九十]+、/, "");
      return [
        '<section class="deep-section">',
        '  <div class="deep-section__head"><span class="deep-section__num">' + String(index + 1).padStart(2, "0") + "</span><h2>" + esc(title) + "</h2></div>",
        '  <p class="deep-section__body">' + (section.body ? esc(section.body) : "待补充") + "</p>",
        "</section>"
      ].join("");
    }).join("");
    return [
      '<article class="report-sheet deep-sheet">',
      reportHead(lead, full, "外贸出海" + stage.diagnosis + "报告 · 完整版"),
      sections,
      reportFooter(lead, full),
      "</article>"
    ].join("");
  }

  function lockedFullHtml(lead) {
    const stage = stageOf(lead);
    return [
      '<article class="report-sheet">',
      reportHead(lead, null, "外贸出海" + stage.diagnosis + "报告 · 完整版"),
      '  <div class="report-locked">',
      '    <span class="stamp stamp--amber">完整版 69</span>',
      "    <h2>免费版看结论，完整版看怎么做。</h2>",
      '    <p class="lead">完整版会针对「' + esc(stage.label) + "」这一档，把判断拆成：</p>",
      '    <ul class="report-locked__list">',
      "      <li>现状与瓶颈：你现在最该先解决的 1–2 个问题</li>",
      "      <li>关键判断：平台、市场、成本、合规、供应链</li>",
      "      <li>30 / 60 / 90 天计划：先做什么、先不做什么</li>",
      "      <li>风险与止损：什么情况下该停</li>",
      "      <li>下一步：7 天内能做完的一个动作</li>",
      "    </ul>",
      '    <div class="report-cta">',
      '      <div class="report-cta__price"><span>完整诊断</span><strong>69 元</strong></div>',
      '      <button class="btn btn--accent" type="button" data-action="pay">69 元，解锁完整版</button>',
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
    const status = lead.reportStatus || (lead.report ? "ready" : "pending");

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
        const next = Store.syncLead(lead.id) || lead;
        render(next, currentView);
      });
    });
  }

  function startPolling(lead) {
    window.clearInterval(pollTimer);
    if (sampleMode) return;
    if ((lead.reportStatus || "") !== "generating") return;
    pollTimer = window.setInterval(function () {
      const next = Store.syncLead(lead.id);
      if (next && next.reportStatus !== "generating") {
        window.clearInterval(pollTimer);
        render(next, currentView);
      }
    }, 2000);
  }

  function resolve() {
    if (sampleMode) {
      render(SAMPLE_LEAD, requestedView);
      return;
    }
    const lead = token ? Store.getLeadByToken(token) : null;
    if (!lead) {
      root.innerHTML = invalidHtml();
      return;
    }
    const next = Store.syncLead(lead.id) || lead;
    render(next, requestedView);
  }

  if (printBtn) {
    printBtn.addEventListener("click", function () {
      trackReal("print_report", currentLead ? { leadId: currentLead.id } : {});
      window.print();
    });
  }

  resolve();
})();