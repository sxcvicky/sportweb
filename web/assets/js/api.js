/* 正式版 API 客户端：页面只通过这里读写数据 */
const Api = (function () {
  const UTM_KEY = "yueji_utm_v1";

  function captureUtm() {
    try {
      const params = new URLSearchParams(window.location.search);
      const utm = {
        source: params.get("utm_source") || "",
        medium: params.get("utm_medium") || "",
        campaign: params.get("utm_campaign") || ""
      };
      if (utm.source || utm.medium || utm.campaign) {
        window.sessionStorage.setItem(UTM_KEY, JSON.stringify(utm));
      }
    } catch (err) {
      /* ignore */
    }
  }

  function source() {
    try {
      const raw = window.sessionStorage.getItem(UTM_KEY);
      if (!raw) return "H5 直接";
      const utm = JSON.parse(raw);
      return utm.source || "H5 直接";
    } catch (err) {
      return "H5 直接";
    }
  }

  async function request(path, options) {
    const opts = Object.assign({ credentials: "same-origin" }, options || {});
    if (opts.body && typeof opts.body !== "string") {
      opts.headers = Object.assign({ "Content-Type": "application/json" }, opts.headers || {});
      opts.body = JSON.stringify(opts.body);
    }
    const response = await fetch(path, opts);
    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (err) {
      data = { message: text };
    }
    if (!response.ok) {
      const error = new Error((data && data.message) || "请求失败，请稍后再试。");
      error.status = response.status;
      error.data = data;
      throw error;
    }
    return data;
  }

  function track(type, meta, diagnosisId) {
    if (!type) return;
    const payload = meta || {};
    request("/api/events", {
      method: "POST",
      body: {
        type: type,
        meta: payload,
        diagnosisId: diagnosisId || payload.leadId || payload.diagnosisId || ""
      }
    }).catch(function () {
      /* 埋点失败不影响主流程 */
    });
  }

  return {
    captureUtm: captureUtm,
    source: source,
    request: request,
    track: track,
    session: function () {
      return request("/api/session");
    },
    config: function () {
      return request("/api/config");
    },
    createDiagnosis: function (payload) {
      return request("/api/diagnoses", { method: "POST", body: payload });
    },
    getDiagnosis: function (token) {
      return request("/api/diagnoses/by-token/" + encodeURIComponent(token));
    },
    claimWecom: function (token) {
      return request("/api/diagnoses/by-token/" + encodeURIComponent(token) + "/wecom-claim", {
        method: "POST"
      });
    },
    startReport: function (token) {
      return request("/api/diagnoses/by-token/" + encodeURIComponent(token) + "/start", {
        method: "POST"
      });
    },
    getReport: function (token) {
      return request("/api/reports/by-token/" + encodeURIComponent(token));
    },
    createOrder: function (token) {
      return request("/api/orders", { method: "POST", body: { token: token } });
    },
    getOrder: function (id) {
      return request("/api/orders/" + encodeURIComponent(id));
    },
    mockPay: function (id) {
      return request("/api/orders/" + encodeURIComponent(id) + "/mock-pay", { method: "POST" });
    },
    myDiagnoses: function () {
      return request("/api/my/diagnoses");
    },
    adminLogin: function (password) {
      return request("/api/admin/login", { method: "POST", body: { password: password } });
    },
    adminLogout: function () {
      return request("/api/admin/logout", { method: "POST" });
    },
    adminMe: function () {
      return request("/api/admin/me");
    },
    adminStats: function () {
      return request("/api/admin/stats");
    },
    adminList: function (params) {
      const query = new URLSearchParams();
      Object.keys(params || {}).forEach(function (key) {
        const value = params[key];
        if (value !== undefined && value !== null && value !== "") query.set(key, value);
      });
      return request("/api/admin/diagnoses?" + query.toString());
    },
    adminDetail: function (id) {
      return request("/api/admin/diagnoses/" + encodeURIComponent(id));
    },
    adminRetry: function (id) {
      return request("/api/admin/diagnoses/" + encodeURIComponent(id) + "/retry", { method: "POST" });
    },
    adminMarkPaid: function (id) {
      return request("/api/admin/diagnoses/" + encodeURIComponent(id) + "/mark-paid", { method: "POST" });
    },
    adminReject: function (id) {
      return request("/api/admin/diagnoses/" + encodeURIComponent(id) + "/reject", { method: "POST" });
    }
  };
})();
