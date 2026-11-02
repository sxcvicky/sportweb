/* 提交后加企微，再开始生成报告 */

(function () {
  const token = UI.getQuery("token");
  const main = document.getElementById("leadMain");
  let lead = null;
  let config = { wecomMode: "mock", wechatId: "yueji-service" };
  let pollTimer = null;
  let starting = false;

  function invalid() {
    if (!main) return;
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

  if (!token) {
    invalid();
    return;
  }

  Api.captureUtm();
  Api.track("page_view", { page: "lead" });
  Api.config().then(function (data) {
    config = data;
    const wechatEl = document.getElementById("leadWechatId");
    if (wechatEl) wechatEl.textContent = data.wechatId || "yueji-service";
  }).catch(function () {});

  const continueBtn = document.getElementById("continueBtn");
  const copyBtn = document.getElementById("copyLeadWechat");
  const qrImage = document.getElementById("leadQrImage");
  const qrPlaceholder = document.getElementById("leadQrPlaceholder");
  const demoNote = document.getElementById("leadDemoNote");
  const hint = document.getElementById("leadHint");
  const wecomCard = document.getElementById("leadWecomCard");

  function setQr(url) {
    if (!qrImage || !qrPlaceholder) return;
    if (url) {
      qrImage.src = url;
      qrImage.hidden = false;
      qrPlaceholder.hidden = true;
    } else {
      qrImage.hidden = true;
      qrPlaceholder.hidden = false;
    }
  }

  function stageLabel(stage) {
    return (STAGES[stage] || STAGES.not_started).label;
  }

  function render(data) {
    lead = data.diagnosis;
    const stageEl = document.getElementById("leadStageLabel");
    if (stageEl) stageEl.textContent = stageLabel(lead.stage);
    const idEl = document.getElementById("leadIdLabel");
    if (idEl) idEl.textContent = lead.id;
    setQr(lead.wecom && lead.wecom.qrUrl);

    if (!continueBtn) return;
    if (lead.status !== "pending") {
      continueBtn.textContent = "查看报告状态";
      continueBtn.disabled = false;
      if (demoNote) demoNote.hidden = true;
      if (hint) hint.textContent = "报告已经生成，可以点上面查看。";
      return;
    }

    const isMock = !lead.wecom || lead.wecom.mode === "mock";
    const isBound = lead.wecom && lead.wecom.status === "bound";
    if (demoNote) demoNote.hidden = !isMock;
    if (hint) {
      hint.textContent = isMock
        ? "生成中可以退出；报告会保存在“我的诊断”。"
        : isBound
          ? "已识别企微，点上面按钮开始生成。"
          : "先扫码加企微，加完会自动开始；也可以点上面按钮刷新状态。";
    }
    continueBtn.textContent = "开始生成报告";
    continueBtn.disabled = starting;
  }

  async function refresh() {
    const data = await Api.getDiagnosis(token);
    render(data);
    return data.diagnosis;
  }

  async function start() {
    if (!lead || starting) return;
    if (lead.status !== "pending") {
      window.location.href = "report.html?token=" + encodeURIComponent(token);
      return;
    }
    if (lead.wecom && lead.wecom.mode === "wecom" && lead.wecom.status !== "bound") {
      const fresh = await refresh();
      if (fresh.wecom.status !== "bound") {
        UI.toast("先扫码加企微，加完会自动开始。");
        if (wecomCard) wecomCard.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
    }
    starting = true;
    if (continueBtn) continueBtn.disabled = true;
    try {
      if (lead.wecom && lead.wecom.mode === "mock" && lead.wecom.status === "unbound") {
        await Api.claimWecom(token);
      }
      Api.track("lead_continue", { page: "lead", stage: lead.stage }, lead.id);
      await Api.startReport(token);
      window.location.href = "report.html?token=" + encodeURIComponent(token);
    } catch (error) {
      UI.toast(error.message || "开始生成失败，请稍后重试");
      starting = false;
      if (continueBtn) continueBtn.disabled = false;
    }
  }

  if (continueBtn) {
    continueBtn.addEventListener("click", function () {
      if (lead && lead.status !== "pending") {
        window.location.href = "report.html?token=" + encodeURIComponent(token);
        return;
      }
      start().catch(function (error) {
        UI.toast(error.message || "加载失败");
      });
    });
  }

  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      UI.copyText(config.wechatId || "").then(function () {
        UI.toast("微信号已复制");
        Api.track("copy_wechat", { page: "lead" });
      }).catch(function () {
        UI.toast("复制失败，请长按微信号手动复制");
      });
    });
  }

  function poll() {
    window.clearInterval(pollTimer);
    if (!lead || lead.status !== "pending") return;
    if (!lead.wecom || lead.wecom.mode !== "wecom") return;
    pollTimer = window.setInterval(async function () {
      try {
        const fresh = await refresh();
        if (fresh.status !== "pending") {
          window.clearInterval(pollTimer);
          window.location.href = "report.html?token=" + encodeURIComponent(token);
        } else if (fresh.wecom.status === "bound" && !starting) {
          window.clearInterval(pollTimer);
          await start();
        }
      } catch (error) {
        /* 网络抖动时下一轮再试 */
      }
    }, 3000);
  }

  Api.getDiagnosis(token).then(function (data) {
    Api.track("lead_page_view", { page: "lead", stage: data.diagnosis.stage }, data.diagnosis.id);
    render(data);
    poll();
  }).catch(function (error) {
    if (error.status === 404) invalid();
    else UI.toast(error.message || "加载失败，请稍后重试");
  });
})();
