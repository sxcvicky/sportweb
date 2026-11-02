/* 提交后加企微，再开始生成报告 */

(function () {
  const token = UI.getQuery("token");
  const lead = token ? Store.getLeadByToken(token) : null;
  const main = document.getElementById("leadMain");

  if (!lead) {
    if (main) {
      main.innerHTML = [
        '<p class="eyebrow">链接无效</p>',
        '<h1 class="h1">找不到这份诊断。</h1>',
        '<p class="lead">请从诊断结果或“我的诊断”进入。</p>',
        '<div class="qr-actions">',
        '  <a class="btn btn--accent btn--block" href="index.html">重新做诊断</a>',
        '  <a class="btn btn--ghost btn--block" href="my.html">我的诊断</a>',
        "</div>"
      ].join("");
    }
    return;
  }

  Store.captureUtm();
  Store.track("page_view", { page: "lead", stage: lead.stage });
  Store.track("lead_page_view", { page: "lead", stage: lead.stage });

  const settings = Store.getSettings();
  const wechatEl = document.getElementById("leadWechatId");
  if (wechatEl) wechatEl.textContent = settings.wechatId || "yueji-service";

  const stage = STAGES[lead.stage] || STAGES.not_started;
  const stageEl = document.getElementById("leadStageLabel");
  if (stageEl) stageEl.textContent = stage.label;
  const idEl = document.getElementById("leadIdLabel");
  if (idEl) idEl.textContent = lead.id;

  const continueBtn = document.getElementById("continueBtn");
  if (continueBtn) {
    if (lead.reportStatus !== "pending") {
      continueBtn.textContent = "查看报告状态";
    }
    continueBtn.addEventListener("click", function () {
      Store.track("lead_continue", { page: "lead", stage: lead.stage, leadId: lead.id });
      if (lead.reportStatus === "pending") {
        Store.startReport(lead.id);
      }
      window.location.href = "report.html?token=" + encodeURIComponent(lead.token);
    });
  }

  const copyBtn = document.getElementById("copyLeadWechat");
  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      UI.copyText(settings.wechatId || "").then(function () {
        UI.toast("微信号已复制");
        Store.track("copy_wechat", { page: "lead", stage: lead.stage });
      }).catch(function () {
        UI.toast("复制失败，请长按微信号手动复制");
      });
    });
  }
})();