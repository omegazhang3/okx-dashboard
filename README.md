# OKX Trading Dashboard

实时加密货币交易看板，集成 OKX 交易所数据、技术分析、OI 异动监控和 AI 复盘报告。

[English](#features) | [中文](#功能特性)

---

## 功能特性

### 📊 交易看板

- **实时余额** — 10秒自动刷新账户资产
- **技术分析** — RSI / MACD / KDJ / 均线 / 支撑压力位
- **网格 Bot 可视化** — 网格策略运行状态与成交监控
- **交易记录** — 按币种筛选的历史订单查询
- **AI 复盘报告** — 基于持仓和行情的智能分析

### 🔍 OI 异动扫描

- **双重确认机制** — 1D + 4H 时间框架同时触发才报警，减少假阳性
- **OI↑ + 价格横盘** — 找出持仓量上升但价格横盘的潜在待涨币
- **历史对比** — 自动对比上次扫描结果，追踪价格和 OI 变化趋势
- **纯脚本直推** — 发现信号直接推送 Telegram，**零 LLM 消耗**
- **静默模式** — 无信号时不打扰，有信号才推送
- **可配置参数** — 扫描间隔、OI 阈值、价格波动范围等均可在配置文件中调整

### 🏦 CME 期货上架监控

- **自动抓取** — 每小时检查 CME 加密货币产品页
- **新品预警** — 发现新的加密货币期货合约立即推送 Telegram
- **投资逻辑** — CME 期货 = 机构合规入场通道 = 可能的 ETF 前兆

### 📱 消息推送

- **Telegram Bot API** — 直接调用，无需中间服务
- **智能过滤** — 只有实际信号才推送，避免噪音

---

## 技术栈

- **前端**: Next.js 16 + TypeScript + Tailwind CSS + Recharts
- **数据源**: OKX CLI（支持模拟盘/实盘）
- **监控脚本**: Python 3（OI 扫描 + CME 监控）
- **推送**: Telegram Bot API（纯脚本，零 LLM 调用）
- **部署**: Cloudflare Tunnel 外网访问

---

## 项目结构

```
okx-dashboard/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── balance/route.ts    # 余额 API
│   │   │   ├── candles/route.ts    # K线数据 API
│   │   │   ├── orders/route.ts     # 订单 API
│   │   │   ├── report/route.ts     # AI 报告 API
│   │   │   ├── ticker/route.ts     # 行情 API
│   │   │   ├── trades/route.ts     # 交易记录 API
│   │   │   └── oi-scanner/route.ts # OI 扫描 API
│   │   ├── login/page.tsx          # 登录页
│   │   ├── layout.tsx              # 布局
│   │   └── page.tsx                # 主页
│   ├── components/
│   │   ├── AccountOverview.tsx     # 账户概览
│   │   ├── TechnicalAnalysis.tsx   # 技术分析
│   │   ├── GridBot.tsx             # 网格 Bot
│   │   ├── TradeHistory.tsx        # 交易记录
│   │   ├── AIReport.tsx            # AI 报告
│   │   └── OIScanner.tsx           # OI 异动面板
│   ├── lib/
│   │   ├── okx.ts                  # OKX CLI 封装
│   │   └── ta.ts                   # 技术分析计算
│   └── middleware.ts               # 认证中间件
├── scripts/
│   ├── oi-scanner.py               # OI 异动扫描 + CME 监控脚本
│   ├── oi-scanner.env              # 扫描参数配置
│   └── oi-scanner-loop.sh          # 后台循环执行
└── README.md
```

---

## 快速开始

### 环境要求

- Node.js 18+
- Python 3.10+
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

### OI 异动扫描

```bash
# 配置参数
vim scripts/oi-scanner.env

# 手动运行一次
HOME=/opt/data/home python3 scripts/oi-scanner.py

# 后台持续运行（每 5 分钟扫描）
bash scripts/oi-scanner-loop.sh
```

### 外网访问

```bash
# 使用 Cloudflare Quick Tunnel
/tmp/cloudflared tunnel --url http://localhost:3000
```

---

## API 接口

| 接口 | 说明 |
|------|------|
| `/api/balance` | 账户余额 |
| `/api/ticker` | 实时行情 |
| `/api/candles` | K线数据 |
| `/api/trades` | 交易记录 |
| `/api/orders` | 当前订单 |
| `/api/report` | AI 复盘报告 |
| `/api/oi-scanner` | OI 异动扫描结果 |

---

## 环境变量

### Dashboard（`.env`）

```env
DASHBOARD_USER=admin
DASHBOARD_PASS=your_password
```

### OI 扫描（`scripts/oi-scanner.env`）

```env
SCAN_INTERVAL=300          # 扫描间隔（秒），300=5分钟
OI_CHANGE_MIN=10           # OI 24h变化% 最小阈值
PRICE_CHANGE_MAX=5.0       # 价格24h变化% 最大阈值（横盘定义）
MIN_OI_USD=20000000        # 最小OI金额（美元）
MIN_VOL_USD=5000000        # 最小24h成交量（美元）
TOP_N=10                   # 最多显示前N个
```

### Telegram 推送（主 `.env`）

```env
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_HOME_CHANNEL=your_chat_id
```

---

## Features

- **Trading Dashboard** — Real-time balance, technical analysis, grid bot visualization, trade history, AI reports
- **OI Anomaly Scanner** — Dual timeframe (1D+4H) confirmation, OI↑ + price flat detection, auto Telegram push
- **CME Listing Monitor** — Hourly check for new CME crypto futures listings, instant alerts
- **Zero LLM Cost** — Pure Python script pushes directly to Telegram Bot API, no LLM calls needed
- **Smart Filtering** — Only sends messages when actual signals are detected

## Tech Stack

- **Frontend**: Next.js 16 + TypeScript + Tailwind CSS + Recharts
- **Data Source**: OKX CLI (demo/live trading)
- **Monitoring**: Python 3 scripts (OI scanner + CME monitor)
- **Notifications**: Telegram Bot API (direct, zero LLM)
- **Deployment**: Cloudflare Tunnel for external access

## License

MIT
