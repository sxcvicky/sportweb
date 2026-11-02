/* 落地页交互 */

(function () {
  Api.captureUtm();
  Api.track("page_view", { page: "landing" });
  Api.session().catch(function () {
    /* 身份建立失败不阻塞入口页 */
  });

  document.addEventListener("click", function (event) {
    const target = event.target.closest("[data-track]");
    if (!target) return;
    const action = target.getAttribute("data-track");
    if (action === "view_sample") {
      Api.track("view_sample", { page: "landing" });
      return;
    }
    if (action === "stage_select") {
      Api.track("stage_select", { page: "landing", stage: target.getAttribute("data-stage") || "" });
      return;
    }
    Api.track("cta_form", { page: "landing", target: action });
  });
})();
