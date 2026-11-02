# 外贸出海诊断 H5 · 本地原型

独立本地原型，不接入腾讯文档，也不会上传到云端。正式开发在 `D:\CreatNew\越技营销\外贸出海诊断\`。

链路说明：[链路设计.md](链路设计.md)。

## 这版链路

```text
入口选档位（4 档）
→ 分支问诊
→ 提交
→ 加企微（免费，拿身份）
→ 报告生成中（只生成一次，可退出）
→ 免费版：1 页（隐藏完整版内容）
→ 69 元解锁完整版
→ 不重新生成
```

四个档位：

- 还没开始（入场诊断）
- 刚开始（起步诊断）
- 已经在做（经营诊断）
- 公司化/多平台（体系诊断）

## 页面

| 页面 | 文件 | 用途 |
|---|---|---|
| 入口 | `dist/index.html` | 四档自选分流 |
| 企微 | `dist/lead.html?token=...` | 提交后加企微，免费，开始生成 |
| 入场问诊 | `dist/form.html` | 还没开始的 12 题 |
| 分支问诊 | `dist/branch.html` | 刚开始/已经在做/公司化，三套题 |
| 诊断报告 | `dist/report.html` | 免费版 + 69 完整版，异步生成 |
| 付款 | `dist/pay.html` | 69 元完整版 |
| 我的诊断 | `dist/my.html` | 退出后回来查看报告 |
| 诊断报告示例 | `dist/report.html?sample=1` | 示例 |
| 后台旧演示 | `dist/admin.html` | 旧版演示，正式版由 LLM 自动生成 |
| 隐私政策 | `dist/privacy.html` | 隐私说明 |

## 这版有什么

- 四档自选入口，用户自己选阶段，不做自动识别。
- 企微放在表单提交后，免费；报告按用户身份保存，退出后能回来。
- 还没开始的 12 题 + 刚开始/已经在做/公司化三套分支问诊。
- 免费版 1 页，完整版 69 元；完整版 5–6 节，深度与免费版拉开。
- 报告只生成一次：原型用 5 秒模拟；免费版隐藏完整版内容，69 元只解锁，不重新调用。
- 付款后解锁完整版；后台旧演示仍保留，但正式版不需要人工审核。
- 数据用浏览器 localStorage 模拟，刷新不丢，换浏览器会丢。

## 这版没有什么

- 没有真实 LLM、知识库、数据库、异步队列、企微回调、支付回调。
- 企微二维码和收款码都是占位块，开发替换。
- 没有真实支付；付款页的“模拟付款成功”按钮只用于原型演示。
- 报告内容是模板模拟，正式版由 LLM 按分支提示词生成。
- 后台是旧版演示，正式后台由新项目实现。

## 怎么打开

直接双击 `dist/index.html`。要走完整流程，在 `dist` 目录运行：

```bash
python -m http.server 8000
```

打开 `http://localhost:8000/`。

## 文件结构

```
跨境入场体检-H5/     （文件夹名沿用旧名，对外叫外贸出海诊断）
  build.py
  src/pages/         8 个客户页面 + 1 个后台
  src/css/
  src/js/            data / store / ui / 各页面逻辑
  dist/              双击打开的成品
  screens/           实测截图
  README.md
  链路设计.md
```

## 改哪里

| 要改什么 | 改哪里 |
|---|---|
| 档位/分支 | `src/js/data.js` 的 `STAGES`、`BRANCH_SCHEMAS` |
| 12 题入场表 | `src/pages/form.html`、`src/js/form.js` |
| 分支问诊渲染 | `src/js/branch.js` |
| 免费/完整版报告内容 | `src/js/data.js` 的 `buildFreeReport`、`buildFullReport` |
| 价格、微信号 | 后台设置或 `src/js/data.js` 的 `APP` |
| 二维码占位 | `src/pages/lead.html`、`src/pages/pay.html` 的 `.qr-placeholder` |
| 报告页 | `src/js/report.js` + `src/css/report.css` |
| 我的诊断 | `src/js/my.js` + `src/pages/my.html` |

## 本地检查

```bash
for f in src/js/*.js; do node --check "$f"; done
python build.py
```
