# Love Cabin 数据库部署说明

网站：https://love-cabin.onrender.com/

本次为既有网站接入独立的 Neon PostgreSQL 项目 love-cabin，继续使用 Render Free Web Service 和原网址。

## 数据范围

留言及拖拽坐标、全局配置、心愿单、日记、决策记录、拍立得、菜单和订单全部保存在数据库中。现有接口和前端数据格式保持兼容。

旧线上数据通过 API 加密备份后一次性导入。迁移标记确保重启或重新部署不会重复导入、恢复已删除的旧记录。数据库连接失败时返回错误，PostgreSQL 模式不会降级写入 Render 临时 JSON 文件。

## 本地运行

需要 Node.js 24，运行 npm ci，然后 npm start。
在本地 .env 中设置 DATABASE_URL，连接字符串需保留 TLS 参数。未设置数据库连接时，本地开发继续使用原 JSON 文件；Render 上缺少云数据库配置则拒绝启动。
现有 MONGODB_URI 支持保留；同时设置 DATABASE_URL 时优先使用 PostgreSQL。

使用 pg 连接池；遇到 Neon 原生 TCP 网络中断时，可通过官方驱动以加密 WebSocket 连接同一数据库，仍支持事务，不会切换到临时存储。

## Render

- 服务：love-cabin，原有 Free 计划
- 分支：main
- 构建：npm ci --omit=dev
- 启动：node server.js（DATABASE_URL 通过 Render 环境变量提供）
- Node：24，由 .node-version 指定
- 轻量健康检查：/ping
- 数据库状态：/api/storage/health

密码只保存在 Render 环境变量和本机忽略的 .env，未提交到 GitHub。

## 验证和迁移

npm test 执行静态文件访问限制、PostgreSQL 集合读写、数据类型、排序、并发字段更新、迁移幂等和数据库故障不落本地等测试。

一次性迁移脚本：node --env-file=.env scripts/migrate-postgres.cjs，从标准输入读取受控快照。必须包含 messages、config、wishlist、diary、decisions、polaroids、food_menu、food_orders 八个数据分组。脚本只在迁移标记不存在时导入，不覆盖已有记录。

切勿删除数据库或 cabin_migrations 表来“修复”连接问题。重要数据请定期导出独立备份。浏览器中仅用于界面偏好的本地设置不在这八组服务端数据之外另行同步。
