/* 刚开始 / 已经在做 / 公司化多平台：分支问诊 */

(function () {
  const form = document.getElementById("branchForm");
  if (!form) return;

  const stageId = UI.getQuery("stage") || "starting";
  const schema = BRANCH_SCHEMAS[stageId];
  if (!schema) {
    window.location.replace("form.html?stage=not_started");
    return;
  }
  const stage = STAGES[stageId] || STAGES.starting;
  const DRAFT_KEY = "yueji_branch_v1_" + stageId;
  const state = { step: 1, hasStarted: false, submitted: false };
  const answers = { consent: false };

  Api.captureUtm();
  Api.track("page_view", { page: "branch", stage: stageId });

  const stepsEl = document.getElementById("branchSteps");
  const stepLabel = document.getElementById("stepLabel");
  const progressBar = document.getElementById("progressBar");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const submitBtn = document.getElementById("submitBtn");

  function esc(value) {
    return UI.escapeHTML(value);
  }

  function pad(num) {
    return num < 10 ? "0" + num : String(num);
  }

  function markStart() {
    if (state.hasStarted) return;
    state.hasStarted = true;
    Api.track("form_start", { page: "branch", stage: stage.id });
  }

  function renderChips(question) {
    const options = (question.options || []).slice();
    if (question.other && options.indexOf("其他") < 0) options.push("其他");
    return options.map(function (option) {
      return '<button type="button" class="chip' + (question.multi ? " chip--multi" : "") + '" data-value="' + esc(option) + '">' + esc(option) + "</button>";
    }).join("");
  }

  function renderQuestion(question, index) {
    const head = [
      '<div class="q-head">',
      '  <span class="q-num">' + pad(index) + "</span>",
      "  <div>",
      '    <span class="q-label">' + esc(question.label) + "</span>",
      question.help ? '    <p class="q-help">' + esc(question.help) + "</p>" : "",
      "  </div>",
      "</div>"
    ].join("");
    let body = "";
    if (question.type === "text") {
      body = '<input class="input" data-text="' + esc(question.key) + '" placeholder="' + esc(question.placeholder || "") + '">';
    } else {
      body = '<div class="chip-group" data-key="' + esc(question.key) + '"' + (question.multi ? ' data-multi="true"' : "") + ">" + renderChips(question) + "</div>";
      if (question.other) {
        body += '<input class="input other-input" data-other="' + esc(question.key) + '" placeholder="补充其他内容" hidden>';
      }
    }
    return [
      '<div class="question" data-q="' + esc(question.key) + '">',
      head,
      body,
      '  <p class="error" data-error="' + esc(question.key) + '"></p>',
      "</div>"
    ].join("");
  }

  function consentHtml() {
    return [
      '<label class="checkbox-row">',
      '  <input type="checkbox" id="branchConsent">',
      '  <span>我已阅读并同意<a href="privacy.html" target="_blank" rel="noopener">《隐私政策》</a>，允许越技使用以上信息为我出具诊断报告。</span>',
      "</label>",
      '<p class="error" data-error="consent"></p>'
    ].join("");
  }

  // 恢复草稿
  const draftRaw = (function () {
    try {
      return JSON.parse(window.localStorage.getItem(DRAFT_KEY) || "null");
    } catch (err) {
      return null;
    }
  })();
  if (draftRaw && draftRaw.answers) {
    Object.assign(answers, draftRaw.answers);
    state.step = Math.min(schema.steps.length, Math.max(1, Number(draftRaw.step) || 1));
  }
  answers.consent = !!answers.consent;

  let questionIndex = 0;
  stepsEl.innerHTML = schema.steps.map(function (step, index) {
    const questions = step.questions.map(function (question) {
      questionIndex += 1;
      return renderQuestion(question, questionIndex);
    }).join("");
    const consent = index === schema.steps.length - 1 ? consentHtml() : "";
    return [
      '<section class="form-step" data-step="' + (index + 1) + '"' + (index === 0 ? "" : " hidden") + ">",
      '  <div class="step-intro">',
      '    <p class="eyebrow">第 ' + (index + 1) + " 步 / 共 " + schema.steps.length + " 步</p>",
      '    <h1 class="h2">' + esc(step.title) + "</h1>",
      '    <p class="muted">' + esc(step.intro || "") + "</p>",
      "  </div>",
      questions,
      consent,
      "</section>"
    ].join("");
  }).join("");

  const branchTitle = document.getElementById("branchTitle");
  const branchSubtitle = document.getElementById("branchSubtitle");
  const backLink = document.getElementById("backLink");
  if (branchTitle) branchTitle.textContent = stage.diagnosis + " · " + stage.label;
  if (branchSubtitle) branchSubtitle.textContent = stage.desc;
  if (backLink) backLink.href = "lead.html?stage=" + stage.id;

  function saveDraft() {
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ step: state.step, answers: answers }));
    } catch (err) {
      /* ignore */
    }
  }

  function clearDraft() {
    try {
      window.localStorage.removeItem(DRAFT_KEY);
    } catch (err) {
      /* ignore */
    }
  }

  function clearError(key) {
    const el = document.querySelector('[data-error="' + key + '"]');
    if (el) el.textContent = "";
  }

  function setError(key, text) {
    const el = document.querySelector('[data-error="' + key + '"]');
    if (el) el.textContent = text;
  }

  function syncChips() {
    UI.$$(".chip-group", stepsEl).forEach(function (group) {
      const key = group.getAttribute("data-key");
      const multi = group.getAttribute("data-multi") === "true";
      UI.$$(".chip", group).forEach(function (chip) {
        const value = chip.getAttribute("data-value");
        const selected = multi
          ? (Array.isArray(answers[key]) && answers[key].indexOf(value) >= 0)
          : answers[key] === value;
        chip.classList.toggle("is-selected", selected);
        chip.setAttribute("aria-pressed", selected ? "true" : "false");
      });
    });
    UI.$$("[data-other]", stepsEl).forEach(function (input) {
      const key = input.getAttribute("data-other");
      const selected = Array.isArray(answers[key]) ? answers[key].indexOf("其他") >= 0 : answers[key] === "其他";
      input.hidden = !selected;
      input.value = answers[key + "Other"] || "";
    });
    UI.$$("[data-text]", stepsEl).forEach(function (input) {
      const key = input.getAttribute("data-text");
      input.value = answers[key] || "";
    });
    const consent = document.getElementById("branchConsent");
    if (consent) consent.checked = !!answers.consent;
  }

  function showStep(step) {
    state.step = step;
    UI.$$(".form-step", stepsEl).forEach(function (section) {
      section.hidden = Number(section.getAttribute("data-step")) !== step;
    });
    if (stepLabel) stepLabel.textContent = step + " / " + schema.steps.length;
    if (progressBar) progressBar.style.width = (step / schema.steps.length * 100) + "%";
    if (prevBtn) prevBtn.hidden = step === 1;
    if (nextBtn) nextBtn.hidden = step === schema.steps.length;
    if (submitBtn) submitBtn.hidden = step !== schema.steps.length;
    saveDraft();
    UI.scrollTop("smooth");
  }

  function validateStep(step) {
    const schemaStep = schema.steps[step - 1];
    if (!schemaStep) return true;
    schemaStep.questions.forEach(function (question) {
      clearError(question.key);
      if (!question.required) return;
      if (question.type === "text") {
        if (!String(answers[question.key] || "").trim()) setError(question.key, "填一下这一项。");
      } else if (question.multi) {
        if (!Array.isArray(answers[question.key]) || answers[question.key].length === 0) setError(question.key, "至少选一个。");
      } else if (!answers[question.key]) {
        setError(question.key, "选一下。");
      }
    });
    if (step === schema.steps.length) {
      clearError("consent");
      if (!answers.consent) setError("consent", "需要同意隐私政策，我们才能给你出诊断报告。");
    }
    const bad = UI.$$(".error", stepsEl).find(function (el) { return el.textContent.trim(); });
    if (bad) {
      const question = bad.closest(".question") || bad;
      question.scrollIntoView({ behavior: "smooth", block: "center" });
      return false;
    }
    return true;
  }

  stepsEl.addEventListener("click", function (event) {
    const chip = event.target.closest(".chip");
    if (!chip) return;
    const group = chip.closest(".chip-group");
    if (!group) return;
    markStart();
    const key = group.getAttribute("data-key");
    const multi = group.getAttribute("data-multi") === "true";
    const value = chip.getAttribute("data-value");
    if (multi) {
      const list = Array.isArray(answers[key]) ? answers[key].slice() : [];
      const index = list.indexOf(value);
      if (index >= 0) list.splice(index, 1);
      else list.push(value);
      answers[key] = list;
    } else {
      answers[key] = answers[key] === value ? "" : value;
    }
    syncChips();
    clearError(key);
    saveDraft();
  });

  stepsEl.addEventListener("input", function (event) {
    const textInput = event.target.closest("[data-text]");
    if (textInput) {
      markStart();
      answers[textInput.getAttribute("data-text")] = textInput.value;
      clearError(textInput.getAttribute("data-text"));
      saveDraft();
      return;
    }
    const otherInput = event.target.closest("[data-other]");
    if (otherInput) {
      answers[otherInput.getAttribute("data-other") + "Other"] = otherInput.value;
      saveDraft();
      return;
    }
    if (event.target.id === "branchConsent") {
      markStart();
      answers.consent = event.target.checked;
      clearError("consent");
      saveDraft();
    }
  });

  stepsEl.addEventListener("change", function (event) {
    if (event.target.id === "branchConsent") {
      markStart();
      answers.consent = event.target.checked;
      clearError("consent");
      saveDraft();
    }
  });

  if (nextBtn) {
    nextBtn.addEventListener("click", function () {
      markStart();
      if (!validateStep(state.step)) return;
      Api.track("step_complete", { page: "branch", stage: stage.id, step: state.step });
      showStep(Math.min(schema.steps.length, state.step + 1));
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
    if (!validateStep(schema.steps.length)) return;
    state.submitted = true;
    if (submitBtn) submitBtn.disabled = true;
    Api.createDiagnosis({
      stage: stage.id,
      answers: answers,
      source: Api.source()
    }).then(function (result) {
      clearDraft();
      window.location.href = "lead.html?token=" + encodeURIComponent(result.diagnosis.token);
    }).catch(function (error) {
      state.submitted = false;
      if (submitBtn) submitBtn.disabled = false;
      UI.toast(error.message || "提交失败，请稍后重试");
    });
  });

  showStep(state.step);
  syncChips();
})();