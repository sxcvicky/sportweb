/* 越技 · 外贸出海诊断 H5
   页面配置、12 题字段、示例报告
   正式版数据走 /api，本文件只保留静态配置和示例。 */

const APP = {
  brand: "越技",
  product: "外贸出海诊断",
  version: "0.1.0",
  wechatId: "yueji-service",
  wechatLabel: "越技诊断助手",
  price: 9.9,
  priceAfter: 9.9,
  sla: "几分钟",
  deepSla: "几分钟",
  privacyUrl: "privacy.html",
  reportTitle: "外贸出海诊断报告",
  deepTitle: "外贸出海完整诊断报告"
};

const STAGES = {
  not_started: {
    id: "not_started",
    label: "还没开始",
    desc: "有想法，或手里有货，还没正式卖。",
    diagnosis: "入场诊断",
    form: "form.html?stage=not_started"
  },
  starting: {
    id: "starting",
    label: "刚开始",
    desc: "店铺或账号已开，单量还不稳定。",
    diagnosis: "起步诊断",
    form: "branch.html?stage=starting"
  },
  operating: {
    id: "operating",
    label: "已经在做",
    desc: "有稳定单量，卡在增长、利润或合规。",
    diagnosis: "经营诊断",
    form: "branch.html?stage=operating"
  },
  company: {
    id: "company",
    label: "公司化/多平台",
    desc: "有团队、多平台或多市场，卡在体系、供应链或组织。",
    diagnosis: "体系诊断",
    form: "branch.html?stage=company"
  }
};

const FORM_CONFIG = {
  categories: ["3C 配件", "家居小件", "服饰饰品", "美妆工具", "宠物小件", "户外小件", "其他"],
  samples: ["有样品", "没有", "能拿到"],
  sources: ["自己工厂", "合作工厂", "批发市场", "一件代发", "还没定"],
  budgets: ["1 万以下", "1~5 万", "5~15 万", "15 万以上"],
  markets: ["美国", "欧洲", "东南亚", "日本", "中东", "巴西", "智利", "拉美", "还没定"],
  platforms: ["Amazon", "TikTok Shop", "Temu", "Ozon", "Mercado Libre", "独立站", "还没定"],
  experiences: ["没有", "国内电商", "跨境", "外贸", "其他"],
  entities: ["有", "没有", "正在办"],
  languages: ["能读能写", "靠翻译工具", "完全不行"],
  times: ["1 小时以内", "1~3 小时", "全职"],
  concerns: ["选品", "成本", "合规", "物流", "广告", "被骗", "没订单", "其他"],
  expected: ["1 个月", "3 个月", "6 个月", "不确定"],
  losses: ["能", "勉强", "不能"]
};

const BRANCH_SCHEMAS = {
  starting: {
    title: "刚开始：先看单量为什么不稳",
    intro: "你已经有店和初步单量，诊断重点放在流量、转化、毛利和卡点。",
    steps: [
      {
        title: "你现在的基础",
        intro: "先看平台、品类和单量，判断你在哪个阶段。",
        questions: [
          { key: "category", type: "chips", label: "你卖什么？", options: FORM_CONFIG.categories, required: true, other: true },
          { key: "product", type: "text", label: "具体产品", placeholder: "例如：手机支架、收纳盒", required: true },
          { key: "platform", type: "chips", label: "主做哪个平台？", options: FORM_CONFIG.platforms, required: true, other: true },
          { key: "months", type: "chips", label: "开店/上线多久？", options: ["1 个月内", "1–3 个月", "3–6 个月", "6–12 个月", "1 年以上"], required: true },
          { key: "orders", type: "chips", label: "现在月单量大概多少？", options: ["0–10 单", "10–50 单", "50–200 单", "200–500 单", "500 单以上"], required: true }
        ]
      },
      {
        title: "流量和利润",
        intro: "单量不稳，通常卡在流量、转化或利润。",
        questions: [
          { key: "traffic", type: "chips", label: "流量主要从哪来？", options: ["平台自然", "平台广告", "短视频/内容", "达人/联盟", "私域/老客", "还没跑通"], required: true, multi: true },
          { key: "aov", type: "chips", label: "客单价大概多少？", options: ["50 元以下", "50–150 元", "150–500 元", "500 元以上"], required: true },
          { key: "margin", type: "chips", label: "毛利率大概多少？", options: ["10% 以下", "10–20%", "20–30%", "30% 以上", "还没算清"], required: true },
          { key: "returns", type: "chips", label: "退货率大概多少？", options: ["5% 以下", "5–10%", "10–20%", "20% 以上", "还没看"], required: true }
        ]
      },
      {
        title: "卡点和目标",
        intro: "最后看最大的卡点和 90 天目标。",
        questions: [
          { key: "bottleneck", type: "chips", label: "现在最大的卡点是什么？", options: ["没流量", "转化低", "广告亏", "利润薄", "退货高", "合规", "供应链", "团队"], required: true },
          { key: "goal", type: "chips", label: "90 天最想解决什么？", options: ["稳定出单", "提高利润", "放大单量", "换平台/市场", "先止损"], required: true },
          { key: "team", type: "chips", label: "现在几个人在做？", options: ["1 人", "2–3 人", "4–10 人", "10 人以上"], required: true }
        ]
      }
    ]
  },
  operating: {
    title: "已经在做：先找增长、利润和合规的卡点",
    intro: "你已经有稳定单量，诊断重点放在利润结构、广告、退货、合规和供应链。",
    steps: [
      {
        title: "规模和结构",
        intro: "先看平台、市场和月销，确定诊断的基准。",
        questions: [
          { key: "category", type: "chips", label: "你卖什么？", options: FORM_CONFIG.categories, required: true, other: true },
          { key: "product", type: "text", label: "具体产品", placeholder: "例如：手机支架、收纳盒", required: true },
          { key: "platform", type: "chips", label: "主做哪个平台？", options: FORM_CONFIG.platforms, required: true, other: true },
          { key: "market", type: "chips", label: "主做哪个市场？", options: FORM_CONFIG.markets, required: true },
          { key: "monthlyGMV", type: "chips", label: "月销售额大概多少？", options: ["5 万以下", "5–20 万", "20–50 万", "50–200 万", "200 万以上"], required: true },
          { key: "skuCount", type: "chips", label: "大概多少个 SKU？", options: ["1–5 个", "6–20 个", "21–50 个", "50 个以上"], required: true }
        ]
      },
      {
        title: "经营质量",
        intro: "单量有了，下一步看利润和效率。",
        questions: [
          { key: "traffic", type: "chips", label: "流量主要从哪来？", options: ["平台自然", "平台广告", "短视频/内容", "达人/联盟", "私域/老客"], required: true, multi: true },
          { key: "acos", type: "chips", label: "广告花费大概占销售额多少？", options: ["0–10%", "10–20%", "20–30%", "30% 以上", "还没算清"], required: true },
          { key: "grossMargin", type: "chips", label: "毛利率大概多少？", options: ["10% 以下", "10–20%", "20–30%", "30% 以上", "还没算清"], required: true },
          { key: "returnRate", type: "chips", label: "退货率大概多少？", options: ["5% 以下", "5–10%", "10–20%", "20% 以上", "还没看"], required: true }
        ]
      },
      {
        title: "组织、风险和优先级",
        intro: "最后看团队、合规、供应链，以及 90 天最想解决的问题。",
        questions: [
          { key: "team", type: "chips", label: "现在几个人在做？", options: ["1 人", "2–3 人", "4–10 人", "10 人以上"], required: true },
          { key: "compliance", type: "chips", label: "合规现在做到哪一步？", options: ["主体/店铺齐全", "VAT/EPR 已处理", "认证齐全", "还没系统梳理", "不确定"], required: true },
          { key: "supplyChain", type: "chips", label: "供应链稳定吗？", options: ["稳定", "一般", "不稳定", "单一供应商"], required: true },
          { key: "bottleneck", type: "chips", label: "现在最大的瓶颈是什么？", options: ["增长停滞", "利润太薄", "广告亏损", "退货太高", "合规风险", "供应链", "团队", "现金流"], required: true },
          { key: "goal", type: "chips", label: "90 天最想解决什么？", options: ["提高利润", "放大单量", "补合规", "上新品", "开新市场", "先止损"], required: true }
        ]
      }
    ]
  },
  company: {
    title: "公司化/多平台：先看体系短板",
    intro: "你已经有团队和多平台/多市场，诊断重点放在组织、供应链、合规、数据和资源配置。",
    steps: [
      {
        title: "盘子和结构",
        intro: "先看平台、市场、规模和团队，确定体系诊断的范围。",
        questions: [
          { key: "category", type: "chips", label: "主要品类", options: FORM_CONFIG.categories, required: true, other: true },
          { key: "product", type: "text", label: "核心产品", placeholder: "例如：3C 配件、家居收纳", required: true },
          { key: "platformCount", type: "chips", label: "现在做几个平台？", options: ["1 个", "2–3 个", "4–5 个", "5 个以上"], required: true },
          { key: "marketCount", type: "chips", label: "现在做几个市场？", options: ["1 个", "2–3 个", "4–5 个", "5 个以上"], required: true },
          { key: "monthlyGMV", type: "chips", label: "月销售额大概多少？", options: ["20 万以下", "20–50 万", "50–200 万", "200–500 万", "500 万以上"], required: true }
        ]
      },
      {
        title: "体系能力",
        intro: "多平台之后，卡点通常在组织、供应链、合规和数据。",
        questions: [
          { key: "team", type: "chips", label: "团队规模", options: ["1–3 人", "4–10 人", "11–30 人", "30 人以上"], required: true },
          { key: "supplyChain", type: "chips", label: "供应链/库存状态", options: ["稳定，有备选", "一般", "经常断货/压货", "多供应商但没统一管理"], required: true },
          { key: "compliance", type: "chips", label: "合规/税务体系", options: ["有专人/系统", "有人兼管", "还没系统梳理", "不确定"], required: true },
          { key: "dataSystem", type: "chips", label: "数据/系统", options: ["有 ERP/报表", "靠表格", "各平台各看各的", "还没建"], required: true }
        ]
      },
      {
        title: "优先级",
        intro: "最后看最大的体系短板和 90 天优先级。",
        questions: [
          { key: "bottleneck", type: "chips", label: "最大的体系短板是什么？", options: ["组织/人效", "供应链/库存", "合规/税务", "多平台协同", "品牌/内容", "数据/决策", "现金流"], required: true },
          { key: "goal", type: "chips", label: "90 天最优先做什么？", options: ["降风险", "提利润", "扩市场", "建组织", "上系统", "稳现金流"], required: true },
          { key: "brandContent", type: "chips", label: "品牌/内容现在什么状态？", options: ["有稳定内容", "偶尔做", "基本没做", "靠达人/合作"], required: true },
          { key: "orgStructure", type: "chips", label: "组织分工清楚吗？", options: ["清楚，有负责人", "有分工但不清楚", "老板一个人盯", "还在搭"], required: true }
        ]
      }
    ]
  }
};

const EMPTY_ANSWERS = {
  category: "",
  product: "",
  sample: "",
  source: "",
  budget: "",
  market: "",
  platform: "",
  experience: "",
  experienceOther: "",
  entity: "",
  language: "",
  time: "",
  concerns: [],
  concernsOther: "",
  expected: "",
  lossTolerance: "",
  contact: "",
  consent: false
};

const DEEP_SECTION_TITLES = [
  "一、结论与关键假设",
  "二、现状与瓶颈",
  "三、关键判断",
  "四、30 / 60 / 90 天计划",
  "五、风险与止损",
  "六、下一步"
];

const BASIC_TEMPLATE = {
  conclusion: "观望",
  reason: "【这个品、这个预算、这个平台，最关键的判断】",
  opportunity: {
    title: "你的机会",
    body: "【具体机会，不写“市场很大”】",
    basis: "【平台数据 / 品类趋势 / 供给缺口 / 客户原话，1~2 条】"
  },
  hiddenCost: {
    title: "最容易被忽略的一笔钱或一个风险",
    body: "【只写一个，写透】",
    calc: "【金额或比例，写清假设】"
  },
  nextStep: {
    action: "【7 天内能做完的一个动作】",
    dontDo: "【现在不该花的一笔钱或不该做的事】"
  },
  advice: "【一句人话，客户能记住】"
};

function makeBasicReport(overrides) {
  const o = overrides || {};
  const opportunity = Object.assign({}, BASIC_TEMPLATE.opportunity, o.opportunity || {});
  const hiddenCost = Object.assign({}, BASIC_TEMPLATE.hiddenCost, o.hiddenCost || {});
  const nextStep = Object.assign({}, BASIC_TEMPLATE.nextStep, o.nextStep || {});
  return {
    conclusion: o.conclusion || BASIC_TEMPLATE.conclusion,
    reason: o.reason || BASIC_TEMPLATE.reason,
    findings: [
      { label: "发现一", title: opportunity.title, body: opportunity.body, basis: opportunity.basis },
      { label: "发现二", title: hiddenCost.title, body: hiddenCost.body, calc: hiddenCost.calc },
      { label: "发现三", title: "下一步先做什么", body: nextStep.action, dontDo: nextStep.dontDo }
    ],
    opportunity: opportunity,
    hiddenCost: hiddenCost,
    nextStep: nextStep,
    advice: o.advice || BASIC_TEMPLATE.advice,
    published: !!o.published,
    publishedAt: o.publishedAt || null,
    updatedAt: o.updatedAt || null
  };
}

function makeDeepReport(bodies, published, publishedAt) {
  return {
    sections: DEEP_SECTION_TITLES.map(function (title, i) {
      return {
        title: title,
        body: (bodies && bodies[i]) || ""
      };
    }),
    published: !!published,
    publishedAt: publishedAt || null,
    updatedAt: publishedAt || null
  };
}

const SAMPLE_BASIC = {
  headline: "你已经有稳定单量和评价，接下来要把“有单”变成“有净利、有第二条增长曲线”。",
  problems: [
    {
      dimension: "阶段与增长目标",
      title: "增长目标要和净利、现金流对齐",
      finding: "你现在更多在冲单量，净利和现金流还没跟上。",
      evidence: "月销 20–50 万、团队 4–10 人。"
    },
    {
      dimension: "品类与产品机会",
      title: "现有产品线还有价格带空间",
      finding: "主力产品已经跑通，价格带、组合装和复购还没充分做。",
      evidence: "3C 配件 · 手机支架，21–50 个 SKU。"
    },
    {
      dimension: "市场与平台机会",
      title: "主平台还有位置，第二市场还没验证",
      finding: "主平台还能做深，第二市场/平台还没排优先级。",
      evidence: "主做 Mercado Libre / 拉美。"
    },
    {
      dimension: "流量与转化",
      title: "现有流量还有转化空间",
      finding: "流量和评价已经有基础，内容和详情页还能接住更多。",
      evidence: "流量：平台广告、短视频/内容；广告占比 20–30%。"
    },
    {
      dimension: "增长来源",
      title: "第二条增长曲线还没开始",
      finding: "现有平台还能做深，第二曲线还没形成。",
      evidence: "当前主要平台 Mercado Libre，90 天目标提高利润。"
    },
    {
      dimension: "成本与利润",
      title: "还有一笔钱可以留住",
      finding: "广告、退货、合规和供应链还有优化空间。",
      evidence: "毛利 20–30%、广告 20–30%、退货 10–20%。"
    }
  ],
  priority: {
    dimension: "增长来源",
    title: "先开第二条增长曲线",
    why: "你已经有稳定单量和主平台基础，第二条曲线跑通，增长不再只靠一个平台。",
    upside: "第二曲线跑通后，主平台波动也不会影响整体盘子。"
  },
  next30: "先测第二曲线，30 天最可能看到 1 个新价格带、组合装或新市场跑出真实询单。",
  firstMove: "列 3 个第二曲线候选（新价格带、组合装、第二市场/平台），各拿 10 个真实询单或小批量订单。",
  dontRush: "先别同时开三个新方向，选一个最有把握的先跑。",
  assumptions: [
    "示例数据，依据演示客户填写的信息，未核对真实后台。",
    "成本和税率为估算口径，实际以账单和官方规则为准。"
  ]
};

const SAMPLE_DEEP = {
  headline: "先留住利润，再开第二条增长曲线。",
  assumptions: [
    "示例数据，未拿到真实订单、广告和退货明细。",
    "平台规则和合规要求以知识库来源为准。"
  ],
  solutions: [
    {
      key: "growth",
      title: "开源",
      judgment: "先做深主平台，再开第二条增长曲线。",
      actions: ["给主力 SKU 做组合装或新价格带", "用老客做一次复购测试", "选 1 个最接近的新市场/平台做小测试"],
      metric: "30 天找到 1 条可复制的增量来源",
      boundary: "主平台利润没修好，先别开新市场"
    },
    {
      key: "efficiency",
      title: "提效",
      judgment: "把广告、退货和履约里的钱赚回来。",
      actions: ["按 SKU 拆广告、退货、佣金和物流", "先停转化最差的 3 个词，把预算挪到最好的 3 个词", "把退货最高的 3 个原因改到产品、详情页和包装里"],
      metric: "30 天广告占比下降、退货率下降",
      boundary: "30 天单均利润没有改善，先别扩品"
    },
    {
      key: "scale",
      title: "放大",
      judgment: "把供应链和团队补到能接住更大单量。",
      actions: ["找 1 个备选供应商", "把合规清单补成可执行表", "给运营和客服定一个负责人"],
      metric: "60 天核心 SKU 不断货、合规有结论",
      boundary: "供应链或合规有硬缺口，先别扩张"
    },
    {
      key: "rhythm",
      title: "90 天节奏与边界",
      judgment: "先修利润，再开第二曲线。",
      actions: ["30 天修利润", "60 天测试第二曲线", "90 天决定加码或换打法"],
      metric: "90 天净利和第二曲线同时改善",
      boundary: "90 天第二曲线没有起色，回到主平台做深",
      plan: {
        d30: "30 天：按 SKU 修利润，广告和退货先动。",
        d60: "60 天：测试 1 个新市场/平台/组合装。",
        d90: "90 天：根据净利和第二曲线决定加码。"
      }
    }
  ],
  sources: [
    { title: "跨境成本的基本构成", updated_at: "2026-10-30" },
    { title: "主流平台的基本差异", updated_at: "2026-10-30" },
    { title: "退货成本怎么估", updated_at: "2026-10-30" }
  ]
};

const SAMPLE_LEAD = {
  id: "YD-20261023-018",
  token: "sample-chen-3c",
  customer: "陈先生",
  source: "示例",
  stage: "operating",
  uid: "sample",
  createdAt: "2026-10-22T16:40:00+08:00",
  updatedAt: "2026-10-23T10:24:00+08:00",
  status: "published",
  reportStatus: "ready",
  paid: true,
  answers: Object.assign({}, EMPTY_ANSWERS, {
    category: "3C 配件",
    product: "手机支架",
    platform: "Mercado Libre",
    market: "拉美",
    platformCount: "2–3 个",
    marketCount: "2–3 个",
    monthlyGMV: "20–50 万",
    skuCount: "21–50 个",
    traffic: ["平台广告", "短视频/内容"],
    acos: "20–30%",
    grossMargin: "20–30%",
    returnRate: "10–20%",
    team: "4–10 人",
    compliance: "VAT/EPR 已处理",
    supplyChain: "一般",
    bottleneck: "利润太薄",
    goal: "提高利润",
    consent: true
  }),
  report: {
    preview: SAMPLE_BASIC,
    full: SAMPLE_DEEP
  },
  paid: true,
  notes: "示例客户：3C 配件，已经在做，卡在利润和合规。"
};

function makeLead(config) {
  const c = config || {};
  return {
    id: c.id,
    token: c.token || ("demo-" + String(c.id || "").toLowerCase()),
    customer: c.customer || "未命名",
    source: c.source || "H5 直接",
    createdAt: c.createdAt || "2026-10-23T09:00:00+08:00",
    updatedAt: c.updatedAt || c.createdAt || "2026-10-23T09:00:00+08:00",
    status: c.status || "submitted",
    answers: Object.assign({}, EMPTY_ANSWERS, c.answers || {}),
    report: c.report || null,
    deepReport: c.deepReport || null,
    paid: !!c.paid,
    notes: c.notes || ""
  };
}

const MOCK_LEADS = [
  makeLead({
    id: "YD-20261023-018",
    customer: "陈先生",
    source: "抖音",
    createdAt: "2026-10-22T16:40:00+08:00",
    updatedAt: "2026-10-23T10:24:00+08:00",
    status: "published",
    answers: {
      category: "3C 配件", product: "手机支架", sample: "有样品", source: "合作工厂", budget: "5~15 万", market: "拉美", platform: "Mercado Libre", experience: "国内电商", entity: "有", language: "能读能写", time: "1~3 小时", concerns: ["成本", "物流"], expected: "3 个月", lossTolerance: "勉强", contact: "chen_3c", consent: true
    },
    report: SAMPLE_BASIC,
    deepReport: SAMPLE_DEEP,
    paid: true,
    notes: "示例客户：3C 轻配件，墨西哥。"
  }),
  makeLead({
    id: "YD-20261023-017",
    customer: "李女士",
    source: "视频号",
    createdAt: "2026-10-23T09:12:00+08:00",
    updatedAt: "2026-10-23T11:05:00+08:00",
    status: "ready",
    answers: {
      category: "家居小件", product: "桌面收纳盒", sample: "能拿到", source: "批发市场", budget: "1~5 万", market: "美国", platform: "Amazon", experience: "没有", entity: "没有", language: "靠翻译工具", time: "1~3 小时", concerns: ["选品", "广告"], expected: "3 个月", lossTolerance: "能", contact: "li_home", consent: true
    },
    report: makeBasicReport({
      conclusion: "观望",
      reason: "收纳盒体积和运费可控，但美国站同类竞争激烈；先把广告和退货算进去，再决定备货。",
      opportunity: { title: "轻小件适合先测", body: "桌面收纳客单价适中，体积可控；先用 3 个 ASIN 对比价格带和评价数。", basis: "平台公开售价和评论数，示例口径。" },
      hiddenCost: { title: "广告会吃掉第一轮利润", body: "新品没有评价，广告成本通常高于成熟链接；首批 200 个的广告预算要单独留。", calc: "广告预算建议按货值的 20%–30% 预留。" },
      nextStep: { action: "7 天内找 3 个同类 ASIN，记录售价、评论数、广告位。", dontDo: "不要先做定制包装。" },
      advice: "先测 3 个链接，再定 1 个。"
    }),
    notes: "初判观望，等客户补广告预算。"
  }),
  makeLead({
    id: "YD-20261023-016",
    customer: "王先生",
    source: "抖音",
    createdAt: "2026-10-22T20:22:00+08:00",
    updatedAt: "2026-10-23T09:40:00+08:00",
    status: "rejected",
    answers: {
      category: "宠物小件", product: "宠物牵引绳", sample: "没有", source: "一件代发", budget: "1 万以下", market: "东南亚", platform: "TikTok Shop", experience: "没有", entity: "没有", language: "完全不行", time: "1 小时以内", concerns: ["被骗", "没订单"], expected: "1 个月", lossTolerance: "不能", contact: "wang_pet", consent: true
    },
    notes: "预算、货源、风险承受力都不支持现在入场，已劝退。"
  }),
  makeLead({
    id: "YD-20261022-015",
    customer: "赵先生",
    source: "私信",
    createdAt: "2026-10-22T14:08:00+08:00",
    updatedAt: "2026-10-23T08:30:00+08:00",
    status: "published",
    answers: {
      category: "3C 配件", product: "数据线", sample: "有样品", source: "自己工厂", budget: "15 万以上", market: "欧洲", platform: "Amazon", experience: "外贸", entity: "有", language: "能读能写", time: "全职", concerns: ["合规", "关税"], expected: "6 个月", lossTolerance: "能", contact: "zhao_cable", consent: true
    },
    report: makeBasicReport({
      conclusion: "建议试",
      reason: "有工厂、有外贸经验，欧洲合规是主要门槛；先把 CE / RoHS 和包装法做对，再谈放量。",
      opportunity: { title: "工厂直供，适合做差异款", body: "数据线是标准品，价格战激烈；工厂背景适合做长度、材质或包装差异。", basis: "平台公开售价与认证要求，示例口径。" },
      hiddenCost: { title: "合规和包装法容易漏", body: "欧洲站除了 CE / RoHS，还涉及包装法、WEEE 等注册；不做会下架。", calc: "首年合规预算建议预留 1–2 万。" },
      nextStep: { action: "7 天内确认 CE / RoHS 报告和目的国包装法注册要求。", dontDo: "不要先做大批量定制。" },
      advice: "先把合规做完，再谈爆款。",
      published: true,
      publishedAt: "2026-10-23T08:30:00+08:00",
      updatedAt: "2026-10-23T08:30:00+08:00"
    }),
    notes: "工厂型客户，欧洲合规优先。"
  }),
  makeLead({
    id: "YD-20261022-014",
    customer: "周女士",
    source: "视频号",
    createdAt: "2026-10-22T11:35:00+08:00",
    updatedAt: "2026-10-22T11:35:00+08:00",
    status: "submitted",
    answers: {
      category: "美妆工具", product: "化妆刷套装", sample: "能拿到", source: "合作工厂", budget: "5~15 万", market: "日本", platform: "独立站", experience: "跨境", entity: "正在办", language: "靠翻译工具", time: "1~3 小时", concerns: ["物流", "广告"], expected: "3 个月", lossTolerance: "勉强", contact: "zhou_beauty", consent: true
    },
    notes: "想做日本独立站，等基础报告。"
  }),
  makeLead({
    id: "YD-20261021-013",
    customer: "孙先生",
    source: "抖音",
    createdAt: "2026-10-21T19:50:00+08:00",
    updatedAt: "2026-10-21T19:50:00+08:00",
    status: "submitted",
    answers: {
      category: "服饰饰品", product: "不锈钢饰品", sample: "有样品", source: "批发市场", budget: "1~5 万", market: "中东", platform: "Temu", experience: "国内电商", entity: "有", language: "完全不行", time: "1~3 小时", concerns: ["成本", "选品"], expected: "不确定", lossTolerance: "勉强", contact: "sun_jewelry", consent: true
    },
    notes: "饰品低价走量，等基础报告。"
  }),
  makeLead({
    id: "YD-20261021-012",
    customer: "吴女士",
    source: "私信",
    createdAt: "2026-10-21T10:18:00+08:00",
    updatedAt: "2026-10-21T15:20:00+08:00",
    status: "rejected",
    answers: {
      category: "3C 配件", product: "充电器", sample: "没有", source: "还没定", budget: "1 万以下", market: "美国", platform: "Amazon", experience: "没有", entity: "没有", language: "靠翻译工具", time: "1 小时以内", concerns: ["合规", "被骗"], expected: "1 个月", lossTolerance: "不能", contact: "wu_charger", consent: true
    },
    notes: "带电产品 + 无货源 + 预算低，已劝退。"
  }),
  makeLead({
    id: "YD-20261020-011",
    customer: "郑先生",
    source: "社群",
    createdAt: "2026-10-20T15:42:00+08:00",
    updatedAt: "2026-10-22T09:10:00+08:00",
    status: "published",
    answers: {
      category: "户外小件", product: "露营灯", sample: "有样品", source: "合作工厂", budget: "5~15 万", market: "欧洲", platform: "Ozon", experience: "外贸", entity: "有", language: "能读能写", time: "全职", concerns: ["物流", "关税"], expected: "6 个月", lossTolerance: "能", contact: "zheng_outdoor", consent: true
    },
    report: makeBasicReport({
      conclusion: "建议试",
      reason: "露营灯有工厂配合，欧洲户外需求稳定；先确认电池运输和目的国认证，再测 Ozon 的物流时效。",
      opportunity: { title: "户外小件有稳定需求", body: "露营灯体积可控、场景明确，适合用内容展示使用场景。", basis: "平台公开售价和类目趋势，示例口径。" },
      hiddenCost: { title: "带电池产品的物流限制", body: "含电池产品空运和平台入仓限制多，头程报价要单独确认。", calc: "头程成本可能比普通小件高 30%–60%。" },
      nextStep: { action: "7 天内拿到 3 家货代的带电产品报价。", dontDo: "不要先按普通小件估运费。" },
      advice: "先把带电物流问清楚。",
      published: true,
      publishedAt: "2026-10-22T09:10:00+08:00",
      updatedAt: "2026-10-22T09:10:00+08:00"
    }),
    notes: "带电池，物流先确认。"
  }),
  makeLead({
    id: "YD-20261020-010",
    customer: "冯女士",
    source: "抖音",
    createdAt: "2026-10-20T11:06:00+08:00",
    updatedAt: "2026-10-22T16:20:00+08:00",
    status: "ready",
    answers: {
      category: "家居小件", product: "厨房收纳架", sample: "能拿到", source: "一件代发", budget: "1~5 万", market: "拉美", platform: "Mercado Libre", experience: "没有", entity: "没有", language: "靠翻译工具", time: "1~3 小时", concerns: ["选品", "物流"], expected: "3 个月", lossTolerance: "勉强", contact: "feng_home", consent: true
    },
    report: makeBasicReport({
      conclusion: "观望",
      reason: "一件代发适合先测，但厨房收纳体积偏大，拉美尾程运费可能吃掉毛利；先算清运费再上。",
      opportunity: { title: "代发可以先测款", body: "不用先压货，适合用 3–5 个链接测试咨询和转化。", basis: "平台公开售价与运费，示例口径。" },
      hiddenCost: { title: "体积重会抬高运费", body: "收纳架体积大，尾程按体积重计费，轻小件的算法不适用。", calc: "先让货代按实际包装尺寸报一次价。" },
      nextStep: { action: "7 天内让 2 家货代按包装尺寸报尾程价。", dontDo: "不要先按小件运费估。" },
      advice: "先报运费，再谈选品。"
    }),
    notes: "体积重是卡点。"
  }),
  makeLead({
    id: "YD-20261019-009",
    customer: "何先生",
    source: "视频号",
    createdAt: "2026-10-19T17:25:00+08:00",
    updatedAt: "2026-10-19T17:25:00+08:00",
    status: "submitted",
    answers: {
      category: "3C 配件", product: "机械键盘", sample: "有样品", source: "自己工厂", budget: "15 万以上", market: "美国", platform: "独立站", experience: "跨境", entity: "有", language: "能读能写", time: "全职", concerns: ["广告", "退货"], expected: "6 个月", lossTolerance: "能", contact: "he_keyboard", consent: true
    },
    notes: "工厂型，独立站，等基础报告。"
  }),
  makeLead({
    id: "YD-20261018-008",
    customer: "蒋女士",
    source: "转介绍",
    createdAt: "2026-10-18T13:14:00+08:00",
    updatedAt: "2026-10-20T10:00:00+08:00",
    status: "published",
    answers: {
      category: "美妆工具", product: "美妆蛋", sample: "有样品", source: "批发市场", budget: "5~15 万", market: "东南亚", platform: "TikTok Shop", experience: "国内电商", entity: "有", language: "靠翻译工具", time: "1~3 小时", concerns: ["广告", "退货"], expected: "3 个月", lossTolerance: "勉强", contact: "jiang_beauty", consent: true
    },
    report: makeBasicReport({
      conclusion: "建议试",
      reason: "美妆蛋单价低、视觉演示强，适合 TikTok Shop；先把退货和内容成本算进去。",
      opportunity: { title: "适合短视频演示", body: "产品使用前后对比明显，适合用短视频测内容。", basis: "平台公开内容与售价，示例口径。" },
      hiddenCost: { title: "退货和内容成本", body: "低价品的退货绝对值不高，但内容制作和投流会吃掉毛利。", calc: "内容成本按每条 200–500 元预留。" },
      nextStep: { action: "7 天内发 5 条使用场景视频，记录完播和咨询。", dontDo: "不要先投大预算。" },
      advice: "先测内容，再谈投流。",
      published: true,
      publishedAt: "2026-10-20T10:00:00+08:00",
      updatedAt: "2026-10-20T10:00:00+08:00"
    }),
    notes: "转介绍客户，内容型。"
  }),
  makeLead({
    id: "YD-20261018-007",
    customer: "韩先生",
    source: "抖音",
    createdAt: "2026-10-18T09:30:00+08:00",
    updatedAt: "2026-10-18T09:30:00+08:00",
    status: "submitted",
    answers: {
      category: "户外小件", product: "折叠水壶", sample: "能拿到", source: "合作工厂", budget: "1~5 万", market: "日本", platform: "Amazon", experience: "没有", entity: "正在办", language: "完全不行", time: "1 小时以内", concerns: ["选品", "合规"], expected: "6 个月", lossTolerance: "勉强", contact: "han_outdoor", consent: true
    },
    notes: "日本站，食品接触类，合规待确认。"
  }),
  makeLead({
    id: "YD-20261017-006",
    customer: "沈女士",
    source: "社群",
    createdAt: "2026-10-17T16:05:00+08:00",
    updatedAt: "2026-10-17T16:05:00+08:00",
    status: "submitted",
    answers: {
      category: "宠物小件", product: "宠物碗", sample: "有样品", source: "批发市场", budget: "1~5 万", market: "美国", platform: "Amazon", experience: "国内电商", entity: "有", language: "靠翻译工具", time: "1~3 小时", concerns: ["合规", "物流"], expected: "3 个月", lossTolerance: "能", contact: "shen_pet", consent: true
    },
    notes: "宠物碗，食品接触材料，等报告。"
  })
];

const MOCK_STATS = [
  { date: "2026-10-17", visits: 38, starts: 11, submits: 4, reportViews: 3, ctaClicks: 1 },
  { date: "2026-10-18", visits: 46, starts: 14, submits: 5, reportViews: 4, ctaClicks: 2 },
  { date: "2026-10-19", visits: 33, starts: 9, submits: 3, reportViews: 2, ctaClicks: 1 },
  { date: "2026-10-20", visits: 57, starts: 17, submits: 6, reportViews: 4, ctaClicks: 2 },
  { date: "2026-10-21", visits: 64, starts: 20, submits: 7, reportViews: 5, ctaClicks: 3 },
  { date: "2026-10-22", visits: 51, starts: 16, submits: 5, reportViews: 3, ctaClicks: 2 },
  { date: "2026-10-23", visits: 72, starts: 23, submits: 8, reportViews: 5, ctaClicks: 3 }
];

const ASSESS = {
  trialText: "有货源、有预算、平台意向明确，适合先小批量验证。",
  watchText: "信息还不够明确，或者风险承受力偏弱，建议先补关键信息。",
  rejectText: "预算、货源和风险承受力都不支持现在入场，建议先别做。"
};

function assessLead(lead) {
  const a = (lead && lead.answers) || {};
  const hasSupply = ["自己工厂", "合作工厂", "批发市场"].indexOf(a.source) >= 0;
  const lowBudget = a.budget === "1 万以下";
  const noSupply = !a.source || a.source === "还没定";
  const cannotLose = a.lossTolerance === "不能";
  const urgent = a.expected === "1 个月";
  const clearPlatform = a.platform && a.platform !== "还没定";

  if (lowBudget && cannotLose) {
    return { level: "劝退", tone: "red", reason: "预算 1 万以下，又无法接受前 3 个月亏 30%，现在不适合入场。" };
  }
  if (noSupply && cannotLose) {
    return { level: "观望", tone: "amber", reason: "货源还没定，风险承受力也偏弱；先把货源和止损线想清楚，再做。" };
  }
  if (hasSupply && !lowBudget && clearPlatform) {
    return { level: "建议试", tone: "green", reason: ASSESS.trialText };
  }
  if (urgent) {
    return { level: "观望", tone: "amber", reason: "预期 1 个月见结果偏急，跨境首单通常需要更长的验证周期。" };
  }
  return { level: "观望", tone: "amber", reason: ASSESS.watchText };
}

function deepTemplate() {
  return makeDeepReport(["", "", "", "", "", ""], false, null);
}

function stageOf(lead) {
  return STAGES[(lead && lead.stage) || "not_started"] || STAGES.not_started;
}

function aText(lead, key, fallback) {
  const a = (lead && lead.answers) || {};
  const value = a[key];
  if (Array.isArray(value)) return value.length ? value.join("、") : (fallback || "—");
  return value || fallback || "—";
}

function buildFreeReport(lead) {
  const stage = stageOf(lead);
  const category = aText(lead, "category", "你的品类");
  const platform = aText(lead, "platform", "目标平台");
  const bottleneck = aText(lead, "bottleneck", "当前卡点");

  if (stage.id === "not_started") {
    return makeBasicReport({
      conclusion: "先小批量验证，不急着备货",
      reason: "你有" + category + "方向，先把平台、市场和真实成本算清，再用小批量验证，不要先压一批货。",
      opportunity: {
        title: "先从轻小件、低认证品类切",
        body: "你现在更适合用" + category + "里体积小、售后简单的产品试水；平台先选一个主攻，别同时铺。",
        basis: "示例口径：平台公开费率、品类公开售价；具体以实际查询为准。"
      },
      hiddenCost: {
        title: "运费和退货会吃掉毛利",
        body: "新手最容易漏算头程、尾程和退货。先把这三笔算进去，再决定首批货量。",
        calc: "按首批小批量估算，运费和退货通常占售价的 25%–40%。"
      },
      nextStep: {
        action: "7 天内找 3 个同类链接，记录售价、运费、评价数和卖家类型。",
        dontDo: "不要先囤大批货，不要先做定制包装，不要先交年费。"
      },
      advice: "先卖 50 个，再谈 500 个。"
    });
  }

  if (stage.id === "starting") {
    return makeBasicReport({
      conclusion: "先修转化和毛利，再放量",
      reason: "你已经有店和初步单量，当前最大的卡点是" + bottleneck + "。先把单均利润做正，再谈放大。",
      opportunity: {
        title: "已有店和单量，先优化现有链接",
        body: "你不需要重新选品，先把" + platform + "上已经出单的链接做深：主图、价格、评价、广告词，一项一项测。",
        basis: "示例口径：平台公开数据 + 客户提供的经营数据。"
      },
      hiddenCost: {
        title: "广告和退货在吃利润",
        body: "有单不代表赚钱。广告花费和退货率一叠加，毛利很容易被吃掉。",
        calc: "先按最近 30 天算：广告费 + 退货损失 + 平台佣金，占销售额多少。"
      },
      nextStep: {
        action: "30 天内做 3 个对比测试：主图、价格带、广告词，每次只改一个。",
        dontDo: "不要先扩 SKU，不要先开新平台，不要先加大广告预算。"
      },
      advice: "先把单均利润做正。"
    });
  }

  if (stage.id === "company") {
    return makeBasicReport({
      conclusion: "先补体系和供应链短板，再扩市场",
      reason: "你已经有团队和多平台基础，当前最大的体系短板是" + bottleneck + "。先补短板，再谈扩张。",
      opportunity: {
        title: "多平台/多市场有基础，适合做体系化",
        body: "你已经有" + category + "的盘子，下一步把平台、供应链、合规和数据拉成一套可复制的体系。",
        basis: "示例口径：客户提供的经营数据 + 公开平台规则。"
      },
      hiddenCost: {
        title: "组织和库存会拖住扩张",
        body: "多平台之后，库存、组织和合规的成本会放大；不先建指标，扩张会把问题放大。",
        calc: "先算库存周转、缺货率、人效和合规成本四项。"
      },
      nextStep: {
        action: "90 天内先做一个体系诊断：平台、供应链、组织、合规、数据五项各打一分。",
        dontDo: "不要先开新市场，不要先上大系统，不要先扩团队。"
      },
      advice: "先建指标，再扩市场。"
    });
  }

  return makeBasicReport({
    conclusion: "先修利润和合规，再放量",
    reason: "你已经有稳定单量，当前最大的瓶颈是" + bottleneck + "。先把利润和合规做扎实，再谈增长。",
    opportunity: {
      title: "已有稳定单量，适合做利润优化",
      body: "你已经有" + category + "的稳定单量，下一步把广告、退货、合规和供应链逐项拆开，找出真正吃利润的环节。",
      basis: "示例口径：客户提供的经营数据 + 平台公开规则。"
    },
    hiddenCost: {
      title: "广告、退货、合规在吃净利",
      body: "单量有了，净利不一定有。先把广告、退货和合规三项单独算，再决定放不放量。",
      calc: "按最近 30 天：广告费 + 退货损失 + 合规成本，占销售额多少。"
    },
    nextStep: {
      action: "60 天内按 SKU 做一张利润表，停掉亏损款，把广告和退货降下来。",
      dontDo: "不要先开新市场，不要先扩 SKU，不要先加大广告预算。"
    },
    advice: "先保利润，再放量。"
  });
}

function buildFullReport(lead) {
  const stage = stageOf(lead);
  const category = aText(lead, "category", "你的品类");
  const platform = aText(lead, "platform", "主平台");
  const market = aText(lead, "market", "主市场");
  const bottleneck = aText(lead, "bottleneck", "当前卡点");
  const goal = aText(lead, "goal", "90 天目标");
  const scale = aText(lead, "monthlyGMV", "当前规模未填");
  const team = aText(lead, "team", "团队规模未填");

  let bodies = [];

  if (stage.id === "not_started") {
    bodies = [
      "建议小批量试，不急着备货。\n关键假设：首批小批量能在 30 天内跑出询盘或首单；如果 30 天没有任何有效询盘，先停。",
      "你想做" + category + "，主平台" + platform + "，主市场" + market + "。\n当前缺口：平台选择、真实成本、合规要求和第一步动作还没有算清。",
      "平台：先选一个主攻，别同时铺。\n成本：货值、头程、佣金、广告、退货、合规、关税逐项列。\n合规：主体、认证、标签、税务按目的国确认。\n供应链：先找 1 个主供应商 + 1 个备选。",
      "7 天：找 3 个同类链接，记录售价、运费、评价数。\n30 天：小批量上架，跑首批询盘/订单，看点击、加购、退货。\n90 天：有稳定询盘再补货；没有就换品或换平台。",
      "选品失败：先小批量，不压大货。\n物流延误：备选货代，预留时效。\n退货过高：先查产品和描述。\n合规下架：先停问题 SKU，补资料。\n止损条件：30 天无有效询盘，或退货率 > 15%。",
      "先做这一件事：找 3 个同类链接，记录售价、运费、评价数。\n完整版只做判断和建议，不构成收入承诺；平台规则和合规要求以官方最新口径为准。"
    ];
  } else if (stage.id === "starting") {
    bodies = [
      "建议先修转化和毛利，再放量。\n关键假设：现有链接还有优化空间；如果 30 天测试后单均利润仍为负，先停广告。",
      "你已经在" + platform + "出单，当前规模" + scale + "，团队" + team + "。\n最大卡点：" + bottleneck + "。\n判断：先优化现有链接，不急着扩品。",
      "流量：先分清自然、广告、内容各占多少。\n转化：主图、价格、评价、详情页逐项测。\n利润：广告费 + 退货 + 佣金占销售额多少。\n合规：主体、认证、标签先补齐。",
      "30 天：做 3 个对比测试，每次只改一个变量。\n60 天：把单均利润做正，退货率降到 10% 以内。\n90 天：有稳定利润再考虑扩 SKU 或开新平台。",
      "广告继续亏：先砍低转化词，不加预算。\n退货高：先查产品和描述。\n合规风险：先停下架 SKU，补资料。\n止损条件：30 天测试后单均利润仍为负。",
      "先做这一件事：按最近 30 天算一张单均利润表，找出最亏的一项。\n完整版只做判断和建议，不构成收入承诺。"
    ];
  } else if (stage.id === "company") {
    bodies = [
      "建议先补体系和供应链短板，再扩市场。\n关键假设：现有盘子还能通过组织和供应链优化提升效率；如果 90 天库存周转和缺货率没有改善，先停扩张。",
      "你在" + aText(lead, "platformCount", "多个") + "平台、" + aText(lead, "marketCount", "多个") + "市场做" + category + "，月销" + scale + "，团队" + team + "。\n最大体系短板：" + bottleneck + "。",
      "组织：先明确平台、供应链、合规、数据四个负责人。\n供应链：库存周转、缺货率、备选供应商。\n合规：多市场税务/认证/标签统一管理。\n数据：平台、库存、利润用一套口径。",
      "30 天：把五项体系能力各打一分，找出最低两项。\n60 天：先补最低的一项，设一个可量化指标。\n90 天：指标改善后再决定扩市场还是扩团队。",
      "组织跟不上：先定负责人和指标，不急着招人。\n库存压货：先清滞销，再谈扩张。\n合规风险：先统一清单，按市场分级。\n止损条件：90 天库存周转和缺货率没有改善。",
      "先做这一件事：把平台、供应链、组织、合规、数据五项各打一分。\n完整版只做判断和建议，不构成收入承诺；合规要求以持牌服务意见为准。"
    ];
  } else {
    bodies = [
      "建议先修利润和合规，再放量。\n关键假设：广告 ACOS ≤ 25%、退货率 ≤ 8%、毛利率 ≥ 25%；如果 60 天净利率仍低于 5%，先停扩量。",
      "你在" + platform + "、月销" + scale + "、团队" + team + "做" + category + "。\n最大瓶颈：" + bottleneck + "。\n判断：单量没有转成净利，先把利润结构拆开。",
      "平台：主平台继续做，暂不开新市场。\n成本：按 SKU 拆广告、退货、合规、物流。\n合规：VAT/EPR、认证、标签逐项确认。\n供应链：单一供应商风险高，先找备选。",
      "30 天：按 SKU 做利润表，停掉亏损款，ACOS 降到 25% 以内。\n60 天：退货率降到 10% 以内，补合规清单，谈备选供应商。\n90 天：净利率做到 8% 以上，再决定是否扩市场。",
      "广告继续亏：先砍低转化词，不加预算。\n退货高：先查产品、尺码和描述。\n合规下架：先停问题 SKU。\n供应链断货：启用备选供应商。\n止损条件：60 天净利率 < 5%，或退货率 > 15%。",
      "先做这一件事：按 SKU 拉一张利润表，算出广告、退货、合规和物流成本。\n完整版只做判断和建议，不构成收入承诺；具体以官方最新口径为准。"
    ];
  }

  return makeDeepReport(bodies, false, null);
}

// 一次生成：免费版是 preview，完整版是 full；付费只解锁，不重新生成。
function buildDiagnosisReport(lead) {
  return {
    preview: buildFreeReport(lead),
    full: buildFullReport(lead)
  };
}
