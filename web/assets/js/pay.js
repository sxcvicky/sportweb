/* 完整诊断付款：9.9 元，付款成功后解锁完整版 */

(function () {
  Api.captureUtm();
  Api.track("page_view", { page: "pay" });
  Api.track("pay_page_view", { page: "pay" });

  const token = UI.getQuery("token");
  const refEl = document.getElementById("payRef");
  const priceEls = UI.$$("[data-price]");
  const amountEl = document.querySelector("[data-pay-amount]");
  const actionBtn = document.getElementById("payActionBtn");
  const demoNote = document.getElementById("payDemoNote");
  const statusEl = document.getElementById("payStatus");
  const qrImage = document.getElementById("payQrImage");
  const qrPlaceholder = document.getElementById("payQrPlaceholder");
  const qrFrame = qrImage ? qrImage.closest(".qr-frame") : null;
  const captionEl = document.getElementById("payCaption");
  let order = null;
  let pollTimer = null;

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text;
  }

  function setPrice(price) {
    priceEls.forEach(function (el) { el.textContent = price; });
    if (amountEl) amountEl.textContent = "¥" + price;
  }

  function showQr(dataUrl) {
    if (!qrImage || !qrPlaceholder) return;
    if (dataUrl) {
      qrImage.src = dataUrl;
      qrImage.hidden = false;
      qrPlaceholder.hidden = true;
    } else {
      qrImage.hidden = true;
      qrPlaceholder.hidden = false;
    }
  }

  function goFull() {
    window.location.replace("report.html?token=" + encodeURIComponent(token) + "&view=full");
  }

  function isPaidStatus(value) {
    return value === "paid";
  }

  async function pollOrder() {
    window.clearInterval(pollTimer);
    if (!order || order.mock) return;
    pollTimer = window.setInterval(async function () {
      try {
        const data = await Api.getOrder(order.id);
        order = data.order;
        if (isPaidStatus(order.status)) {
          window.clearInterval(pollTimer);
          Api.track("pay_complete", { page: "pay", amount: order.amount }, refEl ? refEl.textContent : "");
          goFull();
        }
      } catch (error) {
        /* 下一轮再试 */
      }
    }, 3000);
  }

  function renderOrder() {
    if (!order) return;
    if (order.status === "paid") {
      goFull();
      return;
    }
    if (order.mock) {
      if (qrFrame) qrFrame.hidden = true;
      showQr(null);
      if (captionEl) captionEl.textContent = "开发环境模拟付款";
      if (actionBtn) actionBtn.hidden = false;
      if (demoNote) demoNote.hidden = false;
      setStatus("当前为 mock 支付模式。");
      return;
    }

    if (qrFrame) qrFrame.hidden = false;
    showQr(order.qrDataUrl || null);
    if (captionEl) captionEl.textContent = "扫码付款 · 付款后自动解锁";
    if (actionBtn) actionBtn.hidden = true;
    if (demoNote) demoNote.hidden = true;
    if (!order.qrDataUrl) {
      setStatus("收款码加载失败，请刷新页面或联系企微。");
      return;
    }
    setStatus("付款成功后会自动解锁，可以留在这个页面等。");
    pollOrder();
  }

  async function init() {
    if (!token) {
      setStatus("请从诊断报告进入付款页。");
      return;
    }
    let config;
    try {
      config = await Api.config();
      setPrice(config.price);
    } catch (error) {
      setStatus("价格加载失败，请刷新重试。");
      return;
    }

    let diagnosis;
    try {
      const data = await Api.getDiagnosis(token);
      diagnosis = data.diagnosis;
    } catch (error) {
      setStatus(error.message || "找不到这份诊断。");
      return;
    }
    if (refEl) refEl.textContent = diagnosis.id;
    if (diagnosis.paid) {
      goFull();
      return;
    }
    if (diagnosis.status !== "ready") {
      setStatus(diagnosis.status === "generating" ? "报告还在生成，生成后再付款。" : "报告还没生成好。");
      if (actionBtn) actionBtn.hidden = true;
      return;
    }

    try {
      const data = await Api.createOrder(token);
      order = data.order;
      renderOrder();
    } catch (error) {
      setStatus(error.message || "支付暂不可用，请稍后重试或联系企微。");
      if (actionBtn) actionBtn.hidden = true;
    }
  }

  if (actionBtn) {
    actionBtn.addEventListener("click", async function () {
      if (!order) return;
      actionBtn.disabled = true;
      try {
        await Api.mockPay(order.id);
        Api.track("pay_complete", { page: "pay", amount: order.amount }, refEl ? refEl.textContent : "");
        goFull();
      } catch (error) {
        actionBtn.disabled = false;
        UI.toast(error.message || "解锁失败，请稍后重试");
      }
    });
  }

  init();
})();
