/* 12 题诊断表单 */

(function () {
  const form = document.getElementById("intakeForm");
  if (!form) return;

  const DRAFT_KEY = "yueji_h5_draft_v1";
  const answers = Object.assign({}, EMPTY_ANSWERS);
  const state = { step: 1, hasStarted: false, submitted: false };
  const stage = UI.getQuery("stage") || "not_started";
  const uid = Store.ensureUid();

  const stepLabel = document.getElementById("stepLabel");
  const progressBar = document.getElementById("progressBar");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const submitBtn = document.getElementById("submitBtn");
  const successView = document.getElementById("successView");
  const formTop = document.querySelector(".form-top");
  const progress = document.querySelector(".progress");

  Store.captureUtm();
  Store.track("page_view", { page: "form" });

  function safeGetDraft() {
    try {
      return JSON.parse(window.localStorage.getItem(DRAFT_KEY) || "null");
    } catch (err) {
      return null;
    }
  }

  function safeSetDraft() {
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify({
        step: state.step,
        answers: answers
      }));
    } catch (err) {
      /* 本地存储不可用时不影响填写 */
    }
  }

  function clearDraft() {
    try {
      window.localStorage.removeItem(DRAFT_KEY);
    } catch (err) {
      /* ignore */
    }
  }

  function normalizeAnswers(source) {
    const merged = Object.assign({}, EMPTY_ANSWERS, source || {});
    if (!Array.isArray(merged.concerns)) {
      merged.concerns = merged.concerns ? [merged.concerns] : [];
    }
    merged.consent = !!merged.consent;
    return merged;
  }

  function markStart() {
    if (state.hasStarted) return;
    state.hasStarted = true;
    Store.track("form_start", { page: "form" });
  }

  function buildChips() {
    UI.$$("[data-options]").forEach(function (group) {
      const key = group.getAttribute("data-options");
      const name = group.getAttribute("data-name");
      const multi = group.getAttribute("data-multi") === "true";
      const options = FORM_CONFIG[key] || [];
      group.innerHTML = options.map(function (option) {
        return '<button type="button" class="chip' + (multi ? " chip--multi" : "") + '" data-value="' + UI.escapeHTML(option) + '" aria-pressed="false">' + UI.escapeHTML(option) + "</button>";
      }).join("");
      group.setAttribute("data-bound", "true");
      group.addEventListener("click", function (event) {
        const chip = event.target.closest(".chip");
        if (!chip) return;
        markStart();
        const value = chip.getAttribute("data-value");
        if (multi) {
          const list = Array.isArray(answers[name]) ? answers[name].slice() : [];
          const index = list.indexOf(value);
          if (index >= 0) list.splice(index, 1);
          else list.push(value);
          answers[name] = list;
        } else {
          answers[name] = answers[name] === value ? "" : value;
        }
        syncChips();
        syncOtherInputs();
        clearError(name);
        if (name === "category") clearError("category");
        saveAndSummarize();
      });
    });
  }

  function syncChips() {
    UI.$$("[data-options]").forEach(function (group) {
      const name = group.getAttribute("data-name");
      const multi = group.getAttribute("data-multi") === "true";
      UI.$$(".chip", group).forEach(function (chip) {
        const value = chip.getAttribute("data-value");
        const selected = multi
          ? (Array.isArray(answers[name]) && answers[name].indexOf(value) >= 0)
          : answers[name] === value;
        chip.classList.toggle("is-selected", selected);
        chip.setAttribute("aria-pressed", selected ? "true" : "false");
      });
    });
  }

  function syncOtherInputs() {
    const experienceOther = document.getElementById("experienceOther");
    const concernsOther = document.getElementById("concernsOther");
    if (experienceOther) {
      experienceOther.hidden = answers.experience !== "其他";
      if (experienceOther.hidden) experienceOther.value = "";
    }
    if (concernsOther) {
      concernsOther.hidden = !(Array.isArray(answers.concerns) && answers.concerns.indexOf("其他") >= 0);
      if (concernsOther.hidden) concernsOther.value = "";
    }
  }

  function saveAndSummarize() {
    safeSetDraft();
    if (state.step === 3) updateSummary();
  }

  function updateSummary() {
    const category = document.getElementById("sumCategory");
    const budget = document.getElementById("sumBudget");
    const market = document.getElementById("sumMarket");
    const platform = document.getElementById("sumPlatform");
    if (category) category.textContent = (answers.category || "—") + (answers.product ? " · " + answers.product : "");
    if (budget) budget.textContent = answers.budget || "—";
    if (market) market.textContent = answers.market || "—";
    if (platform) platform.textContent = answers.platform || "—";
  }

  function setError(name, message) {
    const el = document.querySelector('[data-error="' + name + '"]');
    if (el) el.textContent = message || "";
  }

  function clearError(name) {
    setError(name, "");
  }

  function clearErrors() {
    UI.$$(".error").forEach(function (el) {
      el.textContent = "";
    });
  }

  function firstErrorName() {
    const el = UI.$$(".error").find(function (item) {
      return item.textContent.trim().length > 0;
    });
    return el ? el.getAttribute("data-error") : "";
  }

  function validateStep(step) {
    clearErrors();
    if (step === 1) {
      if (!answers.category) setError("category", "先选一个品类。");
      else if (!answers.product.trim()) setError("category", "写一个具体产品，报告才有针对性。");
      else if (!answers.sample) setError("category", "选一下样品状态。");
      if (!answers.source) setError("source", "选一下货源。");
      if (!answers.budget) setError("budget", "选一下启动预算。");
      if (!answers.market) setError("market", "选一下目标市场。");
    }
    if (step === 2) {
      if (!answers.platform) setError("platform", "选一个平台，或者选“还没定”。");
      if (!answers.experience) setError("experience", "选一下你的卖货经验。");
      if (!answers.entity) setError("entity", "选一下经营主体情况。");
      if (!answers.language) setError("language", "选一下外语水平。");
    }
    if (step === 3) {
      if (!answers.time) setError("time", "选一下每天能投入的时间。");
      if (!Array.isArray(answers.concerns) || answers.concerns.length === 0) setError("concerns", "至少选一个你最担心的问题。");
      if (!answers.expected) setError("expected", "选一下你希望多久看到结果。");
      if (!answers.lossTolerance) setError("lossTolerance", "选一下亏掉 30% 预算能不能接受。");
      if (!answers.consent) setError("consent", "需要同意隐私政策，我们才能给你出报告。");
    }
    const bad = firstErrorName();
    if (bad) {
      const el = document.querySelector('[data-error="' + bad + '"]');
      if (el) {
        const question = el.closest(".question") || el;
        question.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return false;
    }
    return true;
  }

  function showStep(step) {
    state.step = step;
    UI.$$(".form-step").forEach(function (section) {
      section.hidden = Number(section.getAttribute("data-step")) !== step;
    });
    if (stepLabel) stepLabel.textContent = step + " / 3";
    if (progressBar) progressBar.style.width = (step / 3 * 100) + "%";
    if (prevBtn) prevBtn.hidden = step === 1;
    if (nextBtn) nextBtn.hidden = step === 3;
    if (submitBtn) submitBtn.hidden = step !== 3;
    if (step === 3) updateSummary();
    safeSetDraft();
    UI.scrollTop("smooth");
  }

  function collectAnswers() {
    const out = Object.assign({}, answers);
    out.product = out.product.trim();
    out.contact = out.contact.trim();
    out.category = out.category.trim();
    if (out.experience !== "其他") out.experienceOther = "";
    if (!Array.isArray(out.concerns) || out.concerns.indexOf("其他") < 0) out.concernsOther = "";
    return out;
  }

  function showSuccess(lead) {
    state.submitted = true;
    if (formTop) formTop.hidden = true;
    if (progress) progress.hidden = true;
    form.hidden = true;
    if (successView) successView.hidden = false;
    const idEl = document.getElementById("leadIdText");
    if (idEl) idEl.textContent = lead.id;
    const viewMyReport = document.getElementById("viewMyReport");
    if (viewMyReport) viewMyReport.href = "report.html?token=" + encodeURIComponent(lead.token);
    UI.scrollTop("smooth");
  }

  // 恢复草稿
  const draft = safeGetDraft();
  if (draft && draft.answers) {
    Object.assign(answers, normalizeAnswers(draft.answers));
    state.step = Math.min(3, Math.max(1, Number(draft.step) || 1));
  }

  buildChips();
  syncChips();
  syncOtherInputs();

  const productInput = document.getElementById("product");
  const contactInput = document.getElementById("contact");
  const consentInput = document.getElementById("consent");
  const experienceOther = document.getElementById("experienceOther");
  const concernsOther = document.getElementById("concernsOther");

  if (productInput) productInput.value = answers.product || "";
  if (contactInput) contactInput.value = answers.contact || "";
  if (consentInput) consentInput.checked = !!answers.consent;
  if (experienceOther) experienceOther.value = answers.experienceOther || "";
  if (concernsOther) concernsOther.value = answers.concernsOther || "";
  showStep(state.step);

  const hasDraftContent = !!(answers.category || answers.product || answers.source || answers.budget || answers.platform || answers.contact);
  if (hasDraftContent) {
    window.setTimeout(function () {
      UI.toast("已恢复上次填写");
    }, 500);
  }

  if (productInput) {
    productInput.addEventListener("input", function () {
      markStart();
      answers.product = productInput.value;
      clearError("category");
      saveAndSummarize();
    });
  }

  if (contactInput) {
    contactInput.addEventListener("input", function () {
      markStart();
      answers.contact = contactInput.value;
      clearError("contact");
      saveAndSummarize();
    });
  }

  if (consentInput) {
    consentInput.addEventListener("change", function () {
      markStart();
      answers.consent = consentInput.checked;
      clearError("consent");
      saveAndSummarize();
    });
  }

  if (experienceOther) {
    experienceOther.addEventListener("input", function () {
      answers.experienceOther = experienceOther.value;
      saveAndSummarize();
    });
  }

  if (concernsOther) {
    concernsOther.addEventListener("input", function () {
      answers.concernsOther = concernsOther.value;
      saveAndSummarize();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", function () {
      markStart();
      if (!validateStep(state.step)) return;
      Store.track("step_complete", { page: "form", step: state.step });
      showStep(Math.min(3, state.step + 1));
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", function () {
      showStep(Math.max(1, state.step - 1));
    });
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    markStart();
    if (state.submitted) return;
    if (!validateStep(3)) return;
    const payload = collectAnswers();
    try {
      const lead = Store.addLead(payload, { stage: stage, uid: uid });
      clearDraft();
      window.location.href = "lead.html?token=" + encodeURIComponent(lead.token);
    } catch (err) {
      UI.toast("提交失败，请稍后重试");
    }
  });

})();
