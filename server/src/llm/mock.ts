import type { GeneratedReport, GrowthProblem, SolutionModule, Stage } from "../types.js";
import type { KbDoc } from "../services/kb.js";

function value(answers: Record<string, unknown>, key: string, fallback: string): string {
  const raw = answers[key];
  if (Array.isArray(raw)) return raw.length ? raw.join("、") : fallback;
  return raw ? String(raw) : fallback;
}

function problems(items: Array<[string, string, string, string]>): GrowthProblem[] {
  return items.map(([dimension, title, finding, evidence]) => ({
    dimension,
    title,
    finding,
    evidence
  }));
}

function sources(docs: KbDoc[]) {
  return docs.slice(0, 5).map((doc) => ({
    title: doc.title,
    updated_at: doc.updated_at,
    ...(doc.source_url ? { url: doc.source_url } : {})
  }));
}

export function mockReport(
  stage: Stage,
  answers: Record<string, unknown>,
  docs: KbDoc[]
): GeneratedReport {
  const category = value(answers, "category", "你的品类");
  const product = value(answers, "product", "主力产品");
  const platform = value(answers, "platform", "目标平台");
  const market = value(answers, "market", "目标市场");
  const budget = value(answers, "budget", "现有预算");
  const source = value(answers, "source", "现有货源");
  const months = value(answers, "months", "当前阶段");
  const orders = value(answers, "orders", "当前单量");
  const traffic = value(answers, "traffic", "现有流量");
  const margin = value(answers, "margin", value(answers, "grossMargin", "现有毛利"));
  const returns = value(answers, "returns", value(answers, "returnRate", "现有退货率"));
  const acos = value(answers, "acos", "现有广告占比");
  const team = value(answers, "team", "现有团队");
  const monthlyGMV = value(answers, "monthlyGMV", "现有月销");
  const skuCount = value(answers, "skuCount", "现有 SKU");
  const platformCount = value(answers, "platformCount", "现有平台");
  const marketCount = value(answers, "marketCount", "现有市场");
  const supplyChain = value(answers, "supplyChain", "现有供应链");
  const compliance = value(answers, "compliance", "合规还在确认");
  const dataSystem = value(answers, "dataSystem", "现有数据方式");

  let content;

  if (stage === "not_started") {
    content = {
      headline: "你已经有货源、预算和一个方向，接下来要把它变成一条能小批量验证的入场路径。",
      problems: problems([
        ["阶段与增长目标", "先拿到一次真实验证", "你还在用想清楚再做的方式，缺一个低成本的测试动作。", `预算 ${budget}、货源 ${source}、每天投入 ${value(answers, "time", "待定")}。`],
        ["品类与产品机会", "产品方向有了，需求还没被订单验证", "品类和产品已经有方向，先用小批量拿到真实询单和订单。", `${category} · ${product}，样品状态：${value(answers, "sample", "待确认")}。`],
        ["市场与平台机会", "先锁定一个主攻方向", "市场和平台还没收敛到一个主战场，容易同时铺开。", `目标市场 ${market}、平台 ${platform}。`],
        ["流量与转化", "第一条流量还没跑通", "先确定第一条流量从哪来，以及用什么承接。", `经验 ${value(answers, "experience", "待确认")}、外语 ${value(answers, "language", "待确认")}。`],
        ["增长来源", "第一单到第二批货的路径还没设计", "第一单、第二批货和复购路径还没有形成闭环。", `预期 ${value(answers, "expected", "待确认")}、最担心 ${value(answers, "concerns", "待确认")}。`],
        ["成本与利润", "保本售价还没算清", "启动成本和保本售价还没算清，定价容易拍脑袋。", `预算 ${budget}、风险承受 ${value(answers, "lossTolerance", "待确认")}。`]
      ]),
      priority: {
        dimension: "增长来源",
        title: "先把第一单路径跑出来",
        why: "你已经有货源和预算，先找到能带来第一笔真实订单的路径，后面的成本、平台和合规才有验证对象。",
        upside: "跑出第一单后，你能用真实订单反过来修正定价、平台和备货，不用一开始压大货。"
      },
      next30: "先跑第一单路径，30 天最可能看到首批真实询单或订单，以及一条能继续放大的出单路径。",
      firstMove: "选 1 个平台 + 1 个市场，7 天内拿首批真实询单或订单。",
      dontRush: "先别急着压大批货，也别同时开多个平台。",
      solutions: [
        {
          key: "growth",
          title: "开源",
          judgment: "先找到第一条能带来真实订单的路径。",
          actions: ["选 1 个主平台 + 1 个主市场", "上 2 个 SKU 做小批量测试", "用内容、达人、站内流量各拿一次真实反馈"],
          metric: "30 天拿到首批真实订单和询单",
          boundary: "30 天没有真实询单，先换流量入口"
        },
        {
          key: "efficiency",
          title: "提效",
          judgment: "把启动成本花在能验证的地方。",
          actions: ["先拿 2 家物流报价", "把佣金、广告、退货算进保本售价", "先做样品和详情页，不急着做品牌"],
          metric: "30 天有一张可复用的成本表",
          boundary: "成本表算不清，先别备货"
        },
        {
          key: "scale",
          title: "放大",
          judgment: "先确认供应链和合规能接住第一批订单。",
          actions: ["确认备货周期和次品处理", "找 1 个备选供应商", "把目标市场的认证和标签要求列成清单"],
          metric: "60 天供应链和合规清单有结论",
          boundary: "合规有硬缺口，先别上架"
        },
        {
          key: "rhythm",
          title: "90 天节奏与边界",
          judgment: "先验证，再补货，再决定是否放大。",
          actions: ["30 天完成小批量测试", "60 天补供应链和成本表", "90 天决定补货、换品或换平台"],
          metric: "90 天拿到可重复的订单和成本结论",
          boundary: "90 天没有真实订单，先换测试方向",
          plan: {
            d30: "30 天：2 个 SKU、1 个平台、1 个市场，小批量测试。",
            d60: "60 天：补物流、成本、合规清单，确定补货节奏。",
            d90: "90 天：订单和利润有结论，再决定是否放大。"
          }
        }
      ]
    };
  } else if (stage === "operating") {
    content = {
      headline: "你已经有稳定单量和评价，接下来要把“有单”变成“有净利、有第二条增长曲线”。",
      problems: problems([
        ["阶段与增长目标", "增长目标要和净利、现金流对齐", "你现在的增长目标更多在冲单量，净利和现金流还没跟上。", `月销 ${monthlyGMV}、团队 ${team}。`],
        ["品类与产品机会", "现有产品线还有价格带和组合空间", "主力产品已经跑通，价格带、组合装和复购还没充分做。", `${category} · ${product}，${skuCount} SKU。`],
        ["市场与平台机会", "主平台还有位置，第二市场还没验证", "主平台还能做深，第二市场/平台还没排优先级。", `主做 ${platform} / ${market}。`],
        ["流量与转化", "现有流量还有转化空间", "流量和评价已经有一定基础，内容和详情页还能接住更多。", `流量结构：${traffic}，广告占比 ${acos}。`],
        ["增长来源", "第二条增长曲线还没开始", "现有平台还能做深，第二曲线还没形成。", `当前主要平台 ${platform}，目标 ${value(answers, "goal", "提高利润")}。`],
        ["成本与利润", "还有一笔钱可以留住", "广告、退货、合规和供应链还有优化空间。", `毛利 ${margin}、广告 ${acos}、退货 ${returns}。`]
      ]),
      priority: {
        dimension: "增长来源",
        title: "先把第二条流量来源跑出来",
        why: "你已经有单量，先把第二条流量来源跑通，单量不再只靠一条广告腿。",
        upside: "第二条来源跑通后，广告停掉也有基本盘，放大的底气更足。"
      },
      next30: "先跑第二条流量来源，30 天最可能看到第一笔不靠主广告的订单或询单。",
      firstMove: "选 2 个最接近的第二条流量来源（站内关联、短视频、达人、老客复购），各做一次 7 天小测试。",
      dontRush: "先别急着扩品、开新平台或加广告预算，先把第二条来源跑出样本。",
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
      ]
    };
  } else if (stage === "company") {
    content = {
      headline: "你已经有团队和多平台的基础，接下来要把“多平台”变成“可复制的增长系统”。",
      problems: problems([
        ["阶段与增长目标", "组织能力要和增长目标对齐", "当前组织能支撑的规模，和你的增长目标还没完全对齐。", `团队 ${team}、平台 ${platformCount}、市场 ${marketCount}。`],
        ["品类与产品机会", "产品矩阵还有价格带空间", "核心产品已经跑通，价格带和产品组合还有空间。", `${category} · ${product}，${skuCount} SKU。`],
        ["市场与平台机会", "多平台组合还有增量", "多平台/多市场还有增量，但优先级还没排清。", `平台 ${platformCount}、市场 ${marketCount}。`],
        ["流量与转化", "各平台还没用一套口径", "各平台流量和转化还没用同一套口径管理。", `数据方式：${dataSystem}。`],
        ["增长来源", "第二曲线还没形成", "第二曲线、B2B 或新市场还没形成稳定增量。", `90 天目标：${value(answers, "goal", "提利润")}。`],
        ["成本与利润", "组织和库存还有效率空间", "组织、库存、合规和履约还有效率可以释放。", `供应链：${supplyChain}；合规：${compliance}。`]
      ]),
      priority: {
        dimension: "增长来源",
        title: "先找到可复制的第二曲线",
        why: "你已经有团队和多平台底盘，下一步的关键是找到能复制的增量，不再只靠现有平台。",
        upside: "第二曲线跑通后，团队和供应链的能力才能被真正放大。"
      },
      next30: "先找第二曲线，30 天最可能看到 1 个新市场、新品类或 B2B 方向跑出真实询单。",
      firstMove: "列 3 个候选：新市场、新品类、B2B，各做一次小规模询单测试，只保留 1 个。",
      dontRush: "先别急着同时开多个新市场。",
      solutions: [
        {
          key: "growth",
          title: "开源",
          judgment: "先选一个最有把握的第二曲线。",
          actions: ["列 3 个候选：新市场、新品类、B2B", "每个候选做一次小规模询单测试", "只保留 1 个进入 90 天计划"],
          metric: "30 天找到 1 个有真实询单的第二曲线",
          boundary: "3 个候选都没有询单，先回到主平台做深"
        },
        {
          key: "efficiency",
          title: "提效",
          judgment: "用一套口径管组织、库存和数据。",
          actions: ["平台、库存、利润用一套报表", "给平台、供应链、合规、数据各定负责人", "先补最低的一项能力"],
          metric: "60 天四项能力各有一张表和一个负责人",
          boundary: "数据口径不统一，先别扩平台"
        },
        {
          key: "scale",
          title: "放大",
          judgment: "把供应链和组织补到能接住多平台。",
          actions: ["核心 SKU 找备选供应商", "把合规清单按市场分级", "给新市场配一个独立负责人"],
          metric: "90 天库存周转和缺货率改善",
          boundary: "库存和现金流没改善，先停扩张"
        },
        {
          key: "rhythm",
          title: "90 天节奏与边界",
          judgment: "先补体系，再开第二曲线。",
          actions: ["30 天四项能力打分", "60 天补最低项", "90 天决定扩市场还是扩团队"],
          metric: "90 天库存周转、缺货率、人效至少一项改善",
          boundary: "90 天没有改善，先回到主平台",
          plan: {
            d30: "30 天：四项能力打分，定负责人。",
            d60: "60 天：补最低项，设一个可量化指标。",
            d90: "90 天：指标改善后再决定扩市场或扩团队。"
          }
        }
      ]
    };
  } else {
    content = {
      headline: "你已经跑出了能卖的产品，接下来要把它从靠广告出单，变成能自己长单。",
      problems: problems([
        ["阶段与增长目标", "用放量的打法做测款阶段的事", "你现在的阶段更需要验证和复制，放量可以往后放一放。", `上线 ${months}、月单 ${orders}。`],
        ["品类与产品机会", "产品能卖，卖点还没被放大", "产品已经有初步订单，卖点和组合还没被充分表达。", `${category} · ${product}。`],
        ["市场与平台机会", "平台有机会，位置还没卡住", "平台有机会，价格带和评价还没卡住位置。", `主做 ${platform} / ${market}。`],
        ["流量与转化", "广告能带来人，自然流量还没接上", "广告能带来流量，自然流量和承接还没接上。", `流量结构：${traffic}。`],
        ["增长来源", "第二条出单来源还没开始", "你还没有第二条出单来源，复购也没开始。", "当前主要靠单一平台和单一流量。"],
        ["成本与利润", "还有一笔钱可以留住", "广告和退货拿走了本来可以留下来的钱。", `广告 ${acos}、退货 ${returns}、毛利 ${margin}。`]
      ]),
      priority: {
        dimension: "增长来源",
        title: "先把第二条出单来源跑出来",
        why: "你已经有单量，先把第二条出单来源跑通，增长不再只靠一条广告腿。",
        upside: "第二条来源跑通后，广告停掉也有基本盘，放大的底气更足。"
      },
      next30: "先跑第二条出单来源，30 天最可能看到第一笔不靠主广告的订单或询单。",
      firstMove: "选 2 个最接近的第二条出单来源（站内关联、短视频、达人、老客复购），各做一次 7 天小测试。",
      dontRush: "先别急着扩品、开新平台或加广告预算，先把第二条来源跑出样本。",
      solutions: [
        {
          key: "growth",
          title: "开源",
          judgment: "先补第二条流量来源，再谈放量。",
          actions: ["把详情页和评价里转化最好的卖点提炼成 3 条内容", "选 1 个最接近的渠道做 30 天测试", "给老客做一次复购或组合装测试"],
          metric: "30 天新增 1 条能稳定带来询单/订单的渠道",
          boundary: "30 天没有自然询单，先别加广告预算"
        },
        {
          key: "efficiency",
          title: "提效",
          judgment: "把广告和退货里的钱留住。",
          actions: ["按 SKU 拆广告、退货、佣金和物流", "先停转化最差的 3 个词，把预算挪到最好的 3 个词", "把退货最高的 3 个原因改到详情页、尺码和包装里"],
          metric: "30 天广告占比下降、退货率下降，单均利润转正",
          boundary: "30 天单均利润没有改善，先别扩品"
        },
        {
          key: "scale",
          title: "放大",
          judgment: "先把供应链和合规补到能接住更大单量。",
          actions: ["确认核心 SKU 的备货周期和次品处理", "找 1 个备选供应商", "把目标市场的认证、标签和税务要求列成清单"],
          metric: "60 天核心 SKU 不断货、合规清单有结论",
          boundary: "供应链或合规有硬缺口，先别开新市场"
        },
        {
          key: "rhythm",
          title: "90 天节奏与边界",
          judgment: "先修利润，再测第二条增长来源，最后放大。",
          actions: ["30 天做利润表和 3 个转化测试", "60 天跑第二条流量来源", "90 天决定加码或换打法"],
          metric: "90 天净利和第二条渠道同时改善",
          boundary: "90 天第二条渠道没有起色，回到主平台做深",
          plan: {
            d30: "30 天：按 SKU 修利润，找出转化最好的词和退货原因。",
            d60: "60 天：跑第二条流量来源，验证能否稳定带来订单。",
            d90: "90 天：根据净利和第二渠道决定加码。"
          }
        }
      ]
    };
  }

  const solutions = content.solutions as SolutionModule[];
  const report = {
    preview: {
      headline: content.headline,
      problems: content.problems,
      priority: content.priority,
      next30: content.next30,
      firstMove: content.firstMove,
      dontRush: content.dontRush,
      assumptions: [
        "报告依据你填写的答案和公开资料，未核对你的真实后台数据。",
        "成本为估算口径，实际以物流、平台和支付账单为准。"
      ]
    },
    full: {
      headline: content.headline,
      assumptions: [
        "没有拿到你的真实订单、广告和退货明细。",
        "平台规则和合规要求以知识库来源为准，具体执行前需再次核对官方口径。"
      ],
      solutions,
      sources: sources(docs)
    }
  };

  return report;
}
