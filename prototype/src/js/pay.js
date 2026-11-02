/* 完整诊断付款：69 元，只收款，不放企微二维码 */

(function () {
  Store.captureUtm();
  Store.track("page_view", { page: "pay" });
  Store.track("pay_page_view", { page: "pay" });

  const token = UI.getQuery("token");
  const lead = token ? Store.getLeadByToken(token) : null;
  const settings = Store.getSettings();

  UI.$$("[data-price]").forEach(function (el) {
    el.textContent = settings.price;
  });
  UI.$$("[data-price-after]").forEach(function (el) {
    el.textContent = settings.priceAfter;
  });
  const amountEl = document.querySelector("[data-pay-amount]");
  if (amountEl) amountEl.textContent = "¥" + settings.price;
  const refEl = document.getElementById("payRef");
  if (refEl && lead) refEl.textContent = lead.id;

  const demoBtn = document.getElementById("demoPaid");
  if (demoBtn) {
    demoBtn.addEventListener("click", function () {
      if (!lead) {
        UI.toast("请从诊断报告进入付款页");
        return;
      }
      Store.markPaid(lead.id);
      window.location.href = "report.html?token=" + encodeURIComponent(lead.token) + "&view=full";
    });
  }
})();