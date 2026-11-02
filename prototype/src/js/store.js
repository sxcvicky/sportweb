/* 本地数据层：静态原型用 localStorage 模拟后台数据库。
   正式版会把同样的字段接到 CloudBase。 */

const STORE_KEY = "yueji_h5_v1";
const UTM_KEY = "yueji_h5_utm";
const UID_KEY = "yueji_uid";
const WINDOW_STATE_PREFIX = "__YUEJI_H5_STATE__";
const STORE_VERSION = APP.version;
const SOURCE_LABELS = {
  douyin: "抖音",
  shipinhao: "视频号",
  weixin: "微信",
  wechat: "微信",
  xiaohongshu: "小红书",
  kuaishou: "快手",
  private: "私信",
  referral: "转介绍"
};

let memoryState = null;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function safeGet(key) {
  try {
    return window.localStorage.getItem(key);
  } catch (err) {
    return null;
  }
}

function safeSet(key, value) {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch (err) {
    return false;
  }
}

function safeRemove(key) {
  try {
    window.localStorage.removeItem(key);
  } catch (err) {
    /* 本地存储不可用时退回内存 */
  }
}

function useWindowFallback() {
  return window.location.protocol === "file:";
}

function windowGetState() {
  if (!useWindowFallback()) return null;
  try {
    const raw = window.name || "";
    if (raw.indexOf(WINDOW_STATE_PREFIX) === 0) return raw.slice(WINDOW_STATE_PREFIX.length);
  } catch (err) {
    /* ignore */
  }
  return null;
}

function windowSetState(raw) {
  if (!useWindowFallback()) return;
  try {
    window.name = WINDOW_STATE_PREFIX + raw;
  } catch (err) {
    /* ignore */
  }
}

function parseState(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && parsed.version === STORE_VERSION && Array.isArray(parsed.leads)) return parsed;
  } catch (err) {
    /* ignore */
  }
  return null;
}

function pad(num, size) {
  let s = String(num);
  while (s.length < size) s = "0" + s;
  return s;
}

function dateKey(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return d.getFullYear() + "-" + pad(d.getMonth() + 1, 2) + "-" + pad(d.getDate(), 2);
}

function randomId(size) {
  const chars = "abcdefghijkmnpqrstuvwxyz23456789";
  const len = size || 16;
  let out = "";
  const cryptoObj = window.crypto || window.msCrypto;
  if (cryptoObj && cryptoObj.getRandomValues) {
    const bytes = new Uint8Array(len);
    cryptoObj.getRandomValues(bytes);
    for (let i = 0; i < len; i += 1) out += chars[bytes[i] % chars.length];
    return out;
  }
  for (let i = 0; i < len; i += 1) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function defaultSettings() {
  return {
    wechatId: APP.wechatId,
    wechatLabel: APP.wechatLabel,
    price: APP.price,
    priceAfter: APP.priceAfter,
    sla: APP.sla,
    deepSla: APP.deepSla
  };
}

function seedState() {
  return {
    version: STORE_VERSION,
    savedAt: new Date().toISOString(),
    leads: clone(MOCK_LEADS),
    stats: clone(MOCK_STATS),
    events: [],
    settings: defaultSettings()
  };
}

function readState() {
  if (memoryState) return memoryState;
  const localState = parseState(safeGet(STORE_KEY));
  const windowState = parseState(windowGetState());
  let chosen = null;
  if (localState && windowState) {
    const localTime = new Date(localState.savedAt || 0).getTime();
    const windowTime = new Date(windowState.savedAt || 0).getTime();
    chosen = windowTime >= localTime ? windowState : localState;
  } else {
    chosen = localState || windowState;
  }
  if (chosen) {
    if (chosen.settings && chosen.settings.sla === "24 小时内") {
      chosen.settings.sla = APP.sla;
    }
    memoryState = chosen;
    const raw = JSON.stringify(chosen);
    safeSet(STORE_KEY, raw);
    windowSetState(raw);
    return memoryState;
  }
  const seeded = seedState();
  memoryState = seeded;
  const raw = JSON.stringify(seeded);
  safeSet(STORE_KEY, raw);
  windowSetState(raw);
  return memoryState;
}

function writeState(state) {
  state.savedAt = new Date().toISOString();
  memoryState = state;
  const raw = JSON.stringify(state);
  safeSet(STORE_KEY, raw);
  windowSetState(raw);
  return state;
}

const Store = {
  getState: function () {
    return readState();
  },

  save: function () {
    return writeState(readState());
  },

  reset: function () {
    safeRemove(STORE_KEY);
    memoryState = seedState();
    writeState(memoryState);
    return memoryState;
  },

  getLeads: function () {
    return readState().leads.slice();
  },

  getLeadById: function (id) {
    return readState().leads.find(function (lead) {
      return lead.id === id;
    }) || null;
  },

  getLeadByToken: function (token) {
    return readState().leads.find(function (lead) {
      return lead.token === token;
    }) || null;
  },

  getLatestLead: function () {
    const leads = readState().leads;
    return leads.length ? leads[0] : null;
  },

  getUid: function () {
    return safeGet(UID_KEY) || "";
  },

  ensureUid: function () {
    let uid = safeGet(UID_KEY);
    if (!uid) {
      uid = "u" + randomId(20);
      safeSet(UID_KEY, uid);
    }
    return uid;
  },

  getLeadsByUid: function (uid) {
    if (!uid) return [];
    return readState().leads.filter(function (lead) {
      return lead.uid === uid;
    }).sort(function (a, b) {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  },

  addLead: function (answers, meta) {
    const state = readState();
    const now = new Date();
    const today = dateKey(now);
    const todayCount = state.leads.filter(function (lead) {
      return String(lead.id).indexOf("YD-" + today.replace(/-/g, "")) === 0;
    }).length;
    const id = "YD-" + today.replace(/-/g, "") + "-" + pad(todayCount + 1, 3);
    const utm = this.getUtm();
    const rawSource = (meta && meta.source) || utm.source || "H5 直接";
    const source = SOURCE_LABELS[String(rawSource).toLowerCase()] || rawSource;
    const stage = (meta && meta.stage) || "not_started";
    const lead = {
      id: id,
      token: "r" + randomId(22),
      stage: stage,
      uid: (meta && meta.uid) || this.ensureUid(),
      customer: answers.contact || "企微用户",
      source: source,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      status: "submitted",
      reportStatus: "pending",
      reportStartedAt: null,
      reportReadyAt: null,
      answers: Object.assign({}, EMPTY_ANSWERS, answers),
      report: null,
      deepReport: null,
      paid: false,
      notes: "",
      utm: utm
    };
    state.leads.unshift(lead);
    state.events.unshift({
      id: "e" + randomId(14),
      type: "submit",
      leadId: lead.id,
      at: now.toISOString(),
      source: source,
      stage: stage
    });
    state.events = state.events.slice(0, 2000);
    writeState(state);
    return lead;
  },

  startReport: function (id) {
    const now = new Date().toISOString();
    const lead = this.updateLead(id, {
      reportStatus: "generating",
      reportStartedAt: now,
      reportReadyAt: null
    });
    if (lead) {
      const state = readState();
      state.events.unshift({
        id: "e" + randomId(14),
        type: "report_start",
        leadId: id,
        at: now
      });
      state.events = state.events.slice(0, 2000);
      writeState(state);
    }
    return lead;
  },

  syncLead: function (id) {
    const state = readState();
    const lead = state.leads.find(function (item) {
      return item.id === id;
    });
    if (!lead) return null;
    const now = Date.now();
    let changed = false;

    if (lead.reportStatus === "generating" && lead.reportStartedAt) {
      if (now - new Date(lead.reportStartedAt).getTime() >= 5000) {
        lead.report = buildDiagnosisReport(lead);
        lead.reportStatus = "ready";
        lead.reportReadyAt = new Date().toISOString();
        if (lead.status === "submitted") lead.status = "ready";
        changed = true;
      }
    }

    if (changed) {
      lead.updatedAt = new Date().toISOString();
      state.events.unshift({
        id: "e" + randomId(14),
        type: "report_ready",
        leadId: lead.id,
        at: lead.updatedAt
      });
      state.events = state.events.slice(0, 2000);
      writeState(state);
    }
    return lead;
  },

  updateLead: function (id, patch) {
    const state = readState();
    const index = state.leads.findIndex(function (lead) {
      return lead.id === id;
    });
    if (index < 0) return null;
    state.leads[index] = Object.assign({}, state.leads[index], patch, {
      updatedAt: new Date().toISOString()
    });
    writeState(state);
    return state.leads[index];
  },

  saveReport: function (id, report, publish) {
    const state = readState();
    const lead = state.leads.find(function (item) {
      return item.id === id;
    });
    if (!lead) return null;
    const now = new Date().toISOString();
    const next = Object.assign({}, report, {
      published: !!publish,
      publishedAt: publish ? now : (report.publishedAt || null),
      updatedAt: now
    });
    lead.report = next;
    if (publish) {
      lead.status = "published";
      lead.updatedAt = now;
    } else if (lead.status !== "rejected") {
      lead.status = "ready";
      lead.updatedAt = now;
    }
    state.events.unshift({
      id: "e" + randomId(14),
      type: publish ? "report_published" : "report_saved",
      leadId: id,
      at: now
    });
    state.events = state.events.slice(0, 2000);
    writeState(state);
    return next;
  },

  saveDeepReport: function (id, deepReport, publish) {
    const state = readState();
    const lead = state.leads.find(function (item) {
      return item.id === id;
    });
    if (!lead) return null;
    const now = new Date().toISOString();
    const next = Object.assign({}, deepReport, {
      published: !!publish,
      publishedAt: publish ? now : (deepReport.publishedAt || null),
      updatedAt: now
    });
    lead.deepReport = next;
    if (publish) {
      lead.status = lead.report && lead.report.published ? "published" : "ready";
      lead.updatedAt = now;
    }
    state.events.unshift({
      id: "e" + randomId(14),
      type: publish ? "deep_report_published" : "deep_report_saved",
      leadId: id,
      at: now
    });
    state.events = state.events.slice(0, 2000);
    writeState(state);
    return next;
  },

  markRejected: function (id, note) {
    const lead = this.updateLead(id, {
      status: "rejected",
      notes: note || "不适合现在入场，已劝退。"
    });
    if (lead) {
      const state = readState();
      state.events.unshift({
        id: "e" + randomId(14),
        type: "rejected",
        leadId: id,
        at: new Date().toISOString()
      });
      state.events = state.events.slice(0, 2000);
      writeState(state);
    }
    return lead;
  },

  markPaid: function (id) {
    const now = new Date().toISOString();
    const lead = this.updateLead(id, { paid: true, status: "published" });
    if (lead) {
      const state = readState();
      state.events.unshift({
        id: "e" + randomId(14),
        type: "pay_complete",
        leadId: id,
        at: now
      });
      state.events = state.events.slice(0, 2000);
      writeState(state);
    }
    return lead;
  },

  track: function (type, meta) {
    const state = readState();
    const event = Object.assign({}, meta || {}, {
      id: "e" + randomId(14),
      type: type,
      at: new Date().toISOString()
    });
    state.events.unshift(event);
    state.events = state.events.slice(0, 2000);
    writeState(state);
    return event;
  },

  getEvents: function () {
    return readState().events.slice();
  },

  getSettings: function () {
    return Object.assign(defaultSettings(), readState().settings || {});
  },

  updateSettings: function (patch) {
    const state = readState();
    state.settings = Object.assign({}, defaultSettings(), state.settings || {}, patch || {});
    writeState(state);
    return state.settings;
  },

  captureUtm: function () {
    const params = new URLSearchParams(window.location.search || "");
    const utm = {
      source: params.get("utm_source") || "",
      medium: params.get("utm_medium") || "",
      campaign: params.get("utm_campaign") || "",
      content: params.get("utm_content") || ""
    };
    const hasUtm = !!(utm.source || utm.medium || utm.campaign || utm.content);
    if (hasUtm) {
      safeSet(UTM_KEY, JSON.stringify(utm));
    }
    return this.getUtm();
  },

  getUtm: function () {
    const raw = safeGet(UTM_KEY);
    if (!raw) return { source: "", medium: "", campaign: "", content: "" };
    try {
      return Object.assign({ source: "", medium: "", campaign: "", content: "" }, JSON.parse(raw));
    } catch (err) {
      return { source: "", medium: "", campaign: "", content: "" };
    }
  },

  getStatsSummary: function (days) {
    const state = readState();
    const dayCount = days || 7;
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    const rows = [];
    const baseByDate = {};
    (state.stats || []).forEach(function (row) {
      baseByDate[row.date] = row;
    });
    const realByDate = {};
    (state.events || []).forEach(function (event) {
      const key = dateKey(event.at);
      if (!realByDate[key]) {
        realByDate[key] = { page_view: 0, form_start: 0, submit: 0, report_view: 0, cta_deep_report: 0 };
      }
      if (event.type === "page_view" && event.page && event.page !== "landing") return;
      if (realByDate[key][event.type] !== undefined) realByDate[key][event.type] += 1;
    });
    for (let i = dayCount - 1; i >= 0; i -= 1) {
      const d = new Date(end.getTime() - i * 86400000);
      const key = dateKey(d);
      const base = baseByDate[key] || { visits: 0, starts: 0, submits: 0, reportViews: 0, ctaClicks: 0 };
      const real = realByDate[key] || { page_view: 0, form_start: 0, submit: 0, report_view: 0, cta_deep_report: 0 };
      rows.push({
        date: key,
        label: (d.getMonth() + 1) + "/" + d.getDate(),
        visits: (base.visits || 0) + real.page_view,
        starts: (base.starts || 0) + real.form_start,
        submits: (base.submits || 0) + real.submit,
        reportViews: (base.reportViews || 0) + real.report_view,
        ctaClicks: (base.ctaClicks || 0) + real.cta_deep_report
      });
    }
    const total = rows.reduce(function (acc, row) {
      acc.visits += row.visits;
      acc.starts += row.starts;
      acc.submits += row.submits;
      acc.reportViews += row.reportViews;
      acc.ctaClicks += row.ctaClicks;
      return acc;
    }, { visits: 0, starts: 0, submits: 0, reportViews: 0, ctaClicks: 0 });

    const statusCounts = { submitted: 0, ready: 0, published: 0, rejected: 0 };
    const sourceCounts = {};
    state.leads.forEach(function (lead) {
      if (statusCounts[lead.status] !== undefined) statusCounts[lead.status] += 1;
      sourceCounts[lead.source] = (sourceCounts[lead.source] || 0) + 1;
    });
    const sources = Object.keys(sourceCounts).map(function (name) {
      return { name: name, count: sourceCounts[name] };
    }).sort(function (a, b) {
      return b.count - a.count;
    });

    return {
      rows: rows,
      total: total,
      statusCounts: statusCounts,
      sources: sources,
      leadCount: state.leads.length,
      paidCount: state.leads.filter(function (lead) { return lead.paid; }).length,
      todaySubmits: state.leads.filter(function (lead) {
        return dateKey(lead.createdAt) === dateKey(new Date());
      }).length
    };
  }
};
