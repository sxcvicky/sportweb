/* 落地页交互 */

(function () {
  Store.captureUtm();
  Store.track("page_view", { page: "landing" });

  document.addEventListener("click", function (event) {
    const target = event.target.closest("[data-track]");
    if (!target) return;
    const action = target.getAttribute("data-track");
    if (action === "view_sample") {
      Store.track("view_sample", { page: "landing" });
      return;
    }
    if (action === "stage_select") {
      Store.track("stage_select", { page: "landing", stage: target.getAttribute("data-stage") || "" });
      return;
    }
    Store.track("cta_form", { page: "landing", target: action });
  });
})();
