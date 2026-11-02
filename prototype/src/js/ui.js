/* 共用 UI 工具 */

const UI = {
  $: function (selector, root) {
    return (root || document).querySelector(selector);
  },

  $$: function (selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  },

  escapeHTML: function (value) {
    return String(value === undefined || value === null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  },

  formatDate: function (value) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    const pad = function (n) { return n < 10 ? "0" + n : String(n); };
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  },

  formatDateTime: function (value) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    const pad = function (n) { return n < 10 ? "0" + n : String(n); };
    return pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
  },

  formatNumber: function (value) {
    const n = Number(value || 0);
    return n.toLocaleString("zh-CN");
  },

  toast: function (message) {
    const el = document.getElementById("toast");
    if (!el) return;
    el.textContent = message;
    el.classList.add("is-show");
    window.clearTimeout(this._toastTimer);
    this._toastTimer = window.setTimeout(function () {
      el.classList.remove("is-show");
    }, 2200);
  },

  copyText: function (text) {
    const value = String(text || "");
    if (!value) return Promise.reject(new Error("empty"));
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(value);
    }
    return new Promise(function (resolve, reject) {
      const input = document.createElement("textarea");
      input.value = value;
      input.setAttribute("readonly", "");
      input.style.position = "fixed";
      input.style.top = "-1000px";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      try {
        const ok = document.execCommand("copy");
        document.body.removeChild(input);
        if (ok) resolve();
        else reject(new Error("copy failed"));
      } catch (err) {
        document.body.removeChild(input);
        reject(err);
      }
    });
  },

  statusLabel: function (status) {
    const map = {
      submitted: "待出报告",
      ready: "报告待发",
      published: "已发布",
      rejected: "已劝退"
    };
    return map[status] || "待处理";
  },

  statusTone: function (status) {
    const map = {
      submitted: "amber",
      ready: "blue",
      published: "green",
      rejected: "red"
    };
    return map[status] || "ghost";
  },

  judgeTone: function (level) {
    if (level === "建议试") return "green";
    if (level === "劝退") return "red";
    return "amber";
  },

  getQuery: function (name) {
    return new URLSearchParams(window.location.search || "").get(name) || "";
  },

  scrollTop: function (behavior) {
    window.scrollTo({ top: 0, behavior: behavior || "smooth" });
  }
};
