# web · H5 前端

职责：

- 四档入口、四个问诊分支、提交后加企微、报告页、付款页、我的诊断、后台。
- 所有数据通过 `/api` 读写，不直接访问数据库、LLM、企微或支付。
- 视觉沿用原型；`assets/js/api.js` 是唯一数据入口。

关键状态：

- 诊断：`pending` / `generating` / `ready` / `failed` / `rejected`
- 完整版：`paid=false` 锁定 / `paid=true` 解锁
- 企微在提交后；报告只生成一次；付款只解锁，不重新生成。

页面：

```text
index.html      四档入口
form.html       还没开始 12 题
branch.html     刚开始 / 已经在做 / 公司化分支问诊
lead.html       提交后加企微
report.html     免费版 / 完整版 / 生成中 / 失败
pay.html        9.9 元付款
my.html         我的诊断
admin.html      后台
privacy.html    隐私政策
```

禁止：

- 不在前端存 LLM key、企微 secret、支付密钥、数据库连接。
- 不把报告内容长期存在 localStorage。
- 不承诺出单、赚钱、回本。
- 不把完整版内容在未付款时下发到浏览器。
