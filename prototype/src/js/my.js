/* 我的诊断：按用户身份列出报告状态 */

(function () {
  const listEl = document.getElementById("myList");
  if (!listEl) return;

  Store.track("page_view", { page: "my" });
  const uid = Store.getUid();

  function statusText(lead) {
    const status = lead.reportStatus || (lead.report ? "ready" : "pending");
    if (status === "pending") return "待加企微";
    if (status === "generating") return "生成中";
    if (status === "ready") return lead.paid ? "已解锁完整版" : "免费版已就绪";
    if (status === "failed") return "生成失败";
    return "待处理";
  }

  function card(lead) {
    const stage = STAGES[lead.stage] || STAGES.not_started;
    const status = lead.reportStatus || (lead.report ? "ready" : "pending");
    const reportLink = "report.html?token=" + encodeURIComponent(lead.token);
    const payLink = "pay.html?token=" + encodeURIComponent(lead.token);
    const actions = [];

    if (status === "pending") {
      actions.push('<a class="btn btn--accent btn--sm" href="' + "lead.html?token=" + encodeURIComponent(lead.token) + '">去加企微</a>');
    } else if (status === "ready") {
      actions.push('<a class="btn btn--ghost btn--sm" href="' + reportLink + '">看免费版</a>');
      if (lead.paid) {
        actions.push('<a class="btn btn--accent btn--sm" href="' + reportLink + '&view=full">看完整版</a>');
      } else {
        actions.push('<a class="btn btn--accent btn--sm" href="' + payLink + '">69 元解锁完整版</a>');
      }
    } else {
      actions.push('<a class="btn btn--ghost btn--sm" href="' + reportLink + '">查看生成进度</a>');
    }

    return [
      '<article class="my-card">',
      '  <div class="my-card__head">',
      '    <span class="pill pill--ghost">' + UI.escapeHTML(stage.label) + "</span>",
      '    <span class="cell-id">' + UI.escapeHTML(lead.id) + "</span>",
      "  </div>",
      "  <h2>外贸出海" + UI.escapeHTML(stage.diagnosis) + "报告</h2>",
      '  <p class="my-card__meta">' + UI.escapeHTML(UI.formatDateTime(lead.createdAt)) + " · " + statusText(lead) + "</p>",
      '  <div class="my-card__actions">' + actions.join("") + "</div>",
      "</article>"
    ].join("");
  }

  function render() {
    const leads = uid ? Store.getLeadsByUid(uid).map(function (lead) {
      return Store.syncLead(lead.id);
    }) : [];
    if (!leads.length) {
      listEl.innerHTML = [
        '<div class="my-empty">',
        "  <h1 class=\"h2\">还没有诊断。</h2>",
        '  <p class="muted">先选你现在到哪一步，免费做一次诊断。</p>',
        '  <a class="btn btn--accent btn--block" href="index.html">去选档位</a>',
        "</div>"
      ].join("");
      return;
    }
    listEl.innerHTML = '<div class="my-list">' + leads.map(card).join("") + "</div>";
  }

  render();
  window.setInterval(render, 3000);
})();