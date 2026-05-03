# OKX Trading Dashboard

实时加密货币交易看板，集成 OKX 交易所数据、技术分析和 AI 复盘报告。

[English](#features) | [中文](#功能特性)

---

## 功能特性

- **实时余额** — 10秒自动刷新账户资产
- **技术分析** — RSI / MACD / KDJ / 均线 / 支撑压力位
- **网格 Bot 可视化** — 网格策略运行状态与成交监控
- **交易记录** — 按币种筛选的历史订单查询
- **AI 复盘报告** — 基于持仓和行情的智能分析

## 技术栈

- **前端**: Next.js + TypeScript + Tailwind CSS + Recharts
- **数据源**: OKX CLI（支持模拟盘/实盘）
- **部署**: Cloudflare Tunnel 外网访问

## 快速开始

### 环境要求

- Node.js 18+
- OKX CLI 已配置（参考 `okx-docker-config` 技能）

### 安装运行

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 生产模式
DASHBOARD_USER=admin DASHBOARD_PASS=your_password npx next start -p 3000
```

### 外网访问

```bash
# 使用 Cloudflare Quick Tunnel
/tmp/cloudflared tunnel --url http://localhost:3000
```

## API 接口

| 接口 | 说明 |
|------|------|
| `/api/balance` | 账户余额 |
| `/api/ticker` | 实时行情 |
| `/api/candles` | K线数据 |
| `/api/trades` | 交易记录 |
| `/api/orders` | 当前订单 |
| `/api/report` | AI 复盘报告 |

## 环境变量

创建 `.env` 文件：

```env
DASHBOARD_USER=admin
DASHBOARD_PASS=your_password
```

## Features

- **Real-time Balance** — Auto-refresh account assets every 10s
- **Technical Analysis** — RSI / MACD / KDJ / Moving Averages / Support & Resistance
- **Grid Bot Visualization** — Grid strategy status and fill monitoring
- **Trade History** — Filterable historical orders by currency
- **AI Report** — Smart analysis based on positions and market data

## Tech Stack

- **Frontend**: Next.js + TypeScript + Tailwind CSS + Recharts
- **Data Source**: OKX CLI (demo/live trading)
- **Deployment**: Cloudflare Tunnel for external access

## License

MIT
