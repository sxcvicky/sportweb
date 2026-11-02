# server · 单后端服务

一个 Node 进程同时负责：

- 客户 API 和后台 API
- SQLite 读写
- 报告生成 worker
- 企微、支付、LLM 适配器
- 静态页面托管（`web/`）

## 目录

```text
src/
  routes/          HTTP 接口
  services/        诊断、报告、订单、知识库
  jobs/            SQLite 队列 + 报告 worker
  llm/             提示词、DeepSeek/mock、JSON 校验
  integrations/    企业微信、微信支付
  lib/             配置、鉴权、工具
  scripts/         知识库导入
prompts/           base + 4 个阶段
kb/seed.json       知识库种子
migrations/        SQLite migration
data/              运行时数据库（gitignore）
scripts/backup.mjs 备份脚本
```

## 主要接口

| 方法 | 路径 | 用途 |
|---|---|---|
| GET | `/api/health` | 健康检查 |
| GET | `/api/config` | 价格、支付/企微模式 |
| GET | `/api/session` | 建立匿名身份 cookie |
| POST | `/api/diagnoses` | 创建诊断（pending） |
| GET | `/api/diagnoses/by-token/:token` | 读取诊断状态 |
| POST | `/api/diagnoses/by-token/:token/wecom-claim` | mock 模式标记已加企微 |
| POST | `/api/diagnoses/by-token/:token/start` | 投递报告生成任务 |
| GET | `/api/reports/by-token/:token` | 免费 preview；付款后 full |
| GET | `/api/my/diagnoses` | 我的诊断 |
| POST | `/api/orders` | 创建 9.9 元订单 |
| GET | `/api/orders/:id` | 查询订单 |
| POST | `/api/orders/:id/mock-pay` | mock 支付 |
| POST | `/api/pay/wechat/notify` | 微信支付回调 |
| GET/POST | `/api/wecom/callback` | 企微回调 |
| POST | `/api/events` | 前端埋点 |
| POST | `/api/admin/login` | 后台登录 |
| GET | `/api/admin/diagnoses` | 后台诊断列表 |
| GET | `/api/admin/diagnoses/:publicId` | 后台详情 |
| POST | `/api/admin/diagnoses/:publicId/retry` | 重新生成 |
| POST | `/api/admin/diagnoses/:publicId/mark-paid` | 手动标记付款 |
| POST | `/api/admin/diagnoses/:publicId/reject` | 标记劝退 |
| GET | `/api/admin/stats` | 后台统计 |

## 规则

- 报告任务按诊断唯一，重复 start 不会重复生成。
- 付款只改订单状态，不触发 LLM。
- full 只在订单 paid 后返回。
- 报告 token 32 字符随机；默认 90 天有效。
- 生成失败重试 3 次（初次 + 2 次重试），仍失败标 `failed`，后台可手动重试。
- 进程重启时，超过 5 分钟仍为 running 的任务会自动回收。
- 日志不打印问诊答案和密钥。

## 测试

```bash
npm run typecheck
npm test
```

服务运行时可跑完整链路：

```bash
npm run smoke
```

启动前在项目根目录准备 `.env`（从根目录 `.env.example` 复制）。

## 备份

```bash
cd server
node scripts/backup.mjs
```

默认备份到 `server/backups/`，保留 14 份。生产建议每天 cron 执行一次，并把备份同步到另一块磁盘或对象存储。
