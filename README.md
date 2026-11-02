# 外贸出海诊断 · 正式开发项目

状态：前后端骨架已可运行，本地 mock 流程跑通。DeepSeek、企微、微信支付已按适配器接好，拿到密钥后切环境变量即可联调。

## 先看

- 链路：[docs/链路设计.md](docs/链路设计.md)
- 提示词：[docs/分支与提示词.md](docs/分支与提示词.md)
- 知识库：[docs/知识库结构.md](docs/知识库结构.md)
- 部署：[docs/部署与交接.md](docs/部署与交接.md)
- 原型：`prototype/dist/index.html`，只作交互参考

## 产品链路

```text
入口选档位（4 档）
→ 分支问诊
→ 提交（pending，先存库）
→ 加企微
→ 开始生成（一次 LLM，preview + full）
→ 免费版：6 个增长卡点（只返回 preview）
→ 9.9 元付款：4 个解法（开源、提效、放大、90 天节奏）
→ 企微通知 / 我的诊断
```

## 项目结构

```text
外贸出海诊断/
  web/                 H5 前端，静态文件
  server/              单后端服务：API + 报告 worker + SQLite
    src/               路由、领域服务、队列、LLM、企微、支付
    prompts/           base + 4 个档位提示词
    kb/                知识库种子
    migrations/        SQLite migration
    data/              运行时数据库（不进 Git）
  docs/                链路、提示词、知识库、部署
  prototype/           原型，只作参考
  Dockerfile
  docker-compose.yml
  Caddyfile
```

`api/`、`worker/` 不再单独拆服务。报告生成是同一 Node 进程里的后台任务，共用 SQLite、提示词和密钥。

## 本地启动

```bash
cp .env.example .env   # Windows: copy .env.example .env
cd server
npm install
npm run dev
```

打开 <http://127.0.0.1:8787>。后台 <http://127.0.0.1:8787/admin.html>，开发默认密码 `admin123`。

```bash
npm run typecheck
npm run build
npm start
```

另开一个终端，服务运行时可以跑完整冒烟测试：

```bash
cd server
npm run smoke
```

## 三个外部能力

| 能力 | 开发默认 | 正式切换 | 需要的变量 |
|---|---|---|---|
| 大模型 | `LLM_MODE=mock` | `LLM_MODE=deepseek` | `LLM_API_KEY`、`LLM_MODEL` |
| 企微 | `WECOM_MODE=mock` | `WECOM_MODE=wecom` | 企微 corp/secret/回调/员工 ID |
| 支付 | `PAY_MODE=mock` | `PAY_MODE=wechat` | 微信支付商户号、证书、API v3 key |

DeepSeek 走 OpenAI 兼容接口，`LLM_BASE_URL=https://api.deepseek.com`。换通义、火山等兼容服务只改 base URL 和模型名。

## 已实现

- 四档入口、四个问诊分支、提交后企微、异步生成、免费/付费两档。
- SQLite 表：用户、诊断、报告、任务、订单、知识库、事件。
- 报告只生成一次：队列任务唯一，付款回调只改订单状态。
- 免费接口只下发 preview；完整版 full 只在付款后返回。
- 后台登录、诊断列表、详情、重试、手动标记付款、劝退、统计。
- DeepSeek 适配器、企微活码/回调解密/员工通知、微信支付 v3 下单/回调验签解密。
- Docker + Caddy 部署、SQLite 每日备份脚本。

## 还没做 / 需要外部条件

- 企微真实回调联调：需要企微后台配置回调 URL，并确认开通的是客户联系还是微信客服。
- 微信支付真实联调：需要商户号、API 证书、平台公钥。
- 客户通知：目前是员工企微提醒 + 客户页面轮询；自动给外部联系人发消息受企微 48 小时会话限制，确认通道后再接。
- 知识库目前是种子数据，需要按 `docs/知识库结构.md` 补内容和来源。
- 正式上线前把 `ADMIN_PASSWORD`、`APP_SECRET` 换成强随机值。

## 禁止

- 密钥不进 Git、不进压缩包、不进前端。
- 不承诺出单、赚钱、回本；不适合的客户直接劝退。
- 平台规则、合规、税率必须有知识库来源；无来源写“待确认”。
