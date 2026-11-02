import { describe, expect, it } from "vitest";
import { mockReport } from "../src/llm/mock.js";
import { validateReport } from "../src/llm/validate.js";
import type { KbDoc } from "../src/services/kb.js";

const doc: KbDoc = {
  id: "doc-1",
  layer: "common",
  title: "成本口径",
  body: "成本包括货值、头程、尾程、佣金、广告和退货。",
  industry: "all",
  market: "all",
  platform: "all",
  stage: "all",
  topic: "cost",
  source_name: "公开资料",
  source_url: "",
  source_type: "public",
  updated_at: "2026-10-30",
  confidence: "medium",
  tags: ["成本"],
  stale: 0
};

describe("validateReport", () => {
  it("accepts the new 6 growth problems and 4 solutions", () => {
    const report = mockReport(
      "starting",
      { category: "3C 配件", product: "手机支架", platform: "Amazon", market: "美国" },
      [doc]
    );
    const result = validateReport(report, [doc]);
    expect(result.preview.problems).toHaveLength(6);
    expect(result.full.solutions).toHaveLength(4);
    expect(result.full.solutions.map((solution) => solution.key)).toEqual([
      "growth",
      "efficiency",
      "scale",
      "rhythm"
    ]);
    expect(result.full.solutions[0].title).toBe("开源");
  });

  it("rejects negative free-report language", () => {
    const report = mockReport("starting", { category: "3C 配件", product: "手机支架" }, [doc]);
    report.preview.headline = "你已经亏损，先止损。";
    expect(() => validateReport(report, [doc])).toThrow(/语气不合格/);
  });

  it("rejects banned empty phrases", () => {
    const report = mockReport("starting", { category: "3C 配件", product: "手机支架" }, [doc]);
    report.preview.firstMove = "市场很大，做好运营就行。";
    expect(() => validateReport(report, [doc])).toThrow(/禁用表述/);
  });

  it("drops citations that are not in the knowledge base", () => {
    const report = mockReport("starting", { category: "3C 配件", product: "手机支架" }, [doc]);
    report.full.sources = [
      { title: "编造的来源", updated_at: "2026-01-01" },
      { title: doc.title, updated_at: doc.updated_at }
    ];
    const result = validateReport(report, [doc]);
    expect(result.full.sources).toHaveLength(1);
    expect(result.full.sources[0].title).toBe(doc.title);
  });
});
