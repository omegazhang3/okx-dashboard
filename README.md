# OKX Trading Dashboard

实时加密货币交易看板，集成 OKX 交易所数据、技术分析、OI 异动监控和 CME 期货上架预警。

A real-time crypto trading dashboard with OKX exchange data, technical analysis, OI anomaly detection, and CME futures listing alerts.

---

## 中文

### 功能特性

#### 📊 交易看板

- **实时余额** — 10秒自动刷新账户资产
- **技术分析** — RSI / MACD / KDJ / 均线 / 支撑压力位
- **网格 Bot 可视化** — 网格策略运行状态与成交监控
- **交易记录** — 按币种筛选的历史订单查询
- **AI 复盘报告** — 基于持仓和行情的智能分析

#### 🔍 OI 异动扫描

- **双重确认机制** — 1D + 4H 时间框架同时触发才报警，减少假阳性
- **OI↑ + 价格横盘** — 找出持仓量上升但价格横盘的潜在待涨币
- **历史对比** — 自动对比上次扫描结果，追踪价格和 OI 变化趋势
- **纯脚本直推** — 发现信号直接推送 Telegram，**零 LLM 消耗**
- **静默模式** — 无信号时不打扰，有信号才推送
- **可配置参数** — 扫描间隔、OI 阈值、价格波动范围等均可在配置文件中调整

#### 🏦 CME 期货上架监控

- **自动抓取** — 每小时检查 CME 加密货币产品页
- **新品预警** — 发现新的加密货币期货合约立即推送 Telegram
- **投资逻辑** — CME 期货 = 机构合规入场通道 = 可能的 ETF 前兆

#### 📱 消息推送

- **Telegram Bot API** — 直接调用，无需中间服务
- **智能过滤** — 只有实际信号才推送，避免噪音

### 技术栈

- **前端**: Next.js 16 + TypeScript + Tailwind CSS + Recharts
- **数据源**: OKX CLI（支持模拟盘/实盘）
- **监控脚本**: Python 3（OI 扫描 + CME 监控）
- **推送**: Telegram Bot API（纯脚本，零 LLM 调用）
- **部署**: Cloudflare Tunnel 外网访问

### 项目结构

```
okx-dashboard/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── balance/route.ts    # 账户余额
│   │   │   ├── candles/route.ts    # K线数据
│   │   │   ├── orders/route.ts     # 当前订单
│   │   │   ├── report/route.ts     # AI 复盘报告
│   │   │   ├── ticker/route.ts     # 实时行情
│   │   │   ├── trades/route.ts     # 交易记录
│   │   │   └── oi-scanner/route.ts # OI 异动扫描
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
│   └── middleware.ts               # 认证中间件（Basic Auth）
├── scripts/
│   ├── oi-scanner.py               # OI 异动扫描 + CME 监控
│   ├── oi-scanner.env              # 扫描参数配置
│   └── oi-scanner-loop.sh          # 后台循环执行
└── README.md
```

### 快速开始

#### 环境要求

- Node.js 18+
- Python 3.10+
- OKX CLI 已配置

#### 安装运行

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 生产模式
DASHBOARD_USER=admin DASHBOARD_PASS=your_password npx next start -p 3000
```

#### OI 异动扫描

```bash
# 配置参数
vim scripts/oi-scanner.env

# 手动运行一次
HOME=/opt/data/home python3 scripts/oi-scanner.py

# 后台持续运行（每 5 分钟扫描，有信号推送 Telegram）
bash scripts/oi-scanner-loop.sh
```

#### 外网访问

```bash
# 使用 Cloudflare Quick Tunnel
/tmp/cloudflared tunnel --url http://localhost:3000
```

### API 接口

- `/api/balance` — 账户余额
- `/api/ticker` — 实时行情
- `/api/candles` — K线数据
- `/api/trades` — 交易记录
- `/api/orders` — 当前订单
- `/api/report` — AI 复盘报告
- `/api/oi-scanner` — OI 异动扫描结果（JSON）

### 环境变量

**Dashboard（`.env`）**

```
DASHBOARD_USER=admin
DASHBOARD_PASS=your_password
```

**OI 扫描（`scripts/oi-scanner.env`）**

```
SCAN_INTERVAL=300          # 扫描间隔（秒），300=5分钟
OI_CHANGE_MIN=10           # OI 24h变化% 最小阈值
PRICE_CHANGE_MAX=5.0       # 价格24h变化% 最大阈值（横盘定义）
MIN_OI_USD=20000000        # 最小OI金额（美元）
MIN_VOL_USD=5000000        # 最小24h成交量（美元）
TOP_N=10                   # 最多显示前N个
```

**Telegram 推送（主 `.env`）**

```
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_HOME_CHANNEL=your_chat_id
```

---

## English

### Features

#### 📊 Trading Dashboard

- **Real-time Balance** — Auto-refresh account assets every 10 seconds
- **Technical Analysis** — RSI / MACD / KDJ / Moving Averages / Support & Resistance levels
- **Grid Bot Visualization** — Grid strategy status, active orders, and fill monitoring
- **Trade History** — Filterable historical orders by currency pair
- **AI Review Report** — Smart analysis based on positions, market data, and technical indicators

#### 🔍 OI Anomaly Scanner

- **Dual Timeframe Confirmation** — Only alerts when both 1D and 4H timeframes trigger simultaneously, reducing false positives
- **OI↑ + Price Flat** — Detects coins with rising open interest but sideways price action (potential accumulation)
- **Historical Comparison** — Automatically compares with previous scan results, tracking price and OI trend changes
- **Pure Script Push** — Sends signals directly to Telegram Bot API, **zero LLM cost**
- **Silent Mode** — No messages when there are no signals; only pushes when actual anomalies are detected
- **Configurable Parameters** — Scan interval, OI threshold, price volatility range, etc. all adjustable in config file

#### 🏦 CME Futures Listing Monitor

- **Auto-Scraping** — Checks CME Group's cryptocurrency product page every hour
- **New Listing Alerts** — Instantly pushes Telegram notification when new crypto futures contracts appear
- **Investment Logic** — CME futures = institutional compliance gateway = potential ETF precursor
- **Separate Alert Format** — CME alerts use distinct title and format (🏦) from regular OI alerts (🔍)

#### 📱 Notifications

- **Telegram Bot API** — Direct API calls, no intermediate services required
- **Smart Filtering** — Only sends messages when actual signals are detected, no spam
- **Zero LLM Cost** — Entire notification pipeline is pure Python, no LLM calls needed

### Tech Stack

- **Frontend**: Next.js 16 + TypeScript + Tailwind CSS + Recharts
- **Data Source**: OKX CLI (supports demo and live trading)
- **Monitoring Scripts**: Python 3 (OI anomaly scanner + CME listing monitor)
- **Notifications**: Telegram Bot API (direct, zero LLM calls)
- **Deployment**: Cloudflare Tunnel for external access

### Project Structure

```
okx-dashboard/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── balance/route.ts    # Account balance
│   │   │   ├── candles/route.ts    # K-line / candlestick data
│   │   │   ├── orders/route.ts     # Active orders
│   │   │   ├── report/route.ts     # AI review report
│   │   │   ├── ticker/route.ts     # Real-time ticker
│   │   │   ├── trades/route.ts     # Trade history
│   │   │   └── oi-scanner/route.ts # OI anomaly scanner
│   │   ├── login/page.tsx          # Login page
│   │   ├── layout.tsx              # Layout wrapper
│   │   └── page.tsx                # Main dashboard
│   ├── components/
│   │   ├── AccountOverview.tsx     # Account overview card
│   │   ├── TechnicalAnalysis.tsx   # Technical analysis panel
│   │   ├── GridBot.tsx             # Grid bot visualization
│   │   ├── TradeHistory.tsx        # Trade history table
│   │   ├── AIReport.tsx            # AI review report
│   │   └── OIScanner.tsx           # OI anomaly panel
│   ├── lib/
│   │   ├── okx.ts                  # OKX CLI wrapper
│   │   └── ta.ts                   # Technical analysis calculations
│   └── middleware.ts               # Auth middleware (Basic Auth)
├── scripts/
│   ├── oi-scanner.py               # OI anomaly scanner + CME monitor
│   ├── oi-scanner.env              # Scanner configuration
│   └── oi-scanner-loop.sh          # Background daemon loop
└── README.md
```

### Quick Start

#### Prerequisites

- Node.js 18+
- Python 3.10+
- OKX CLI configured

#### Install & Run

```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Production mode
DASHBOARD_USER=admin DASHBOARD_PASS=your_password npx next start -p 3000
```

#### OI Anomaly Scanner

```bash
# Edit scanner configuration
vim scripts/oi-scanner.env

# Run a single scan
HOME=/opt/data/home python3 scripts/oi-scanner.py

# Run as background daemon (scans every 5 min, pushes to Telegram on signals)
bash scripts/oi-scanner-loop.sh
```

#### External Access

```bash
# Use Cloudflare Quick Tunnel
/tmp/cloudflared tunnel --url http://localhost:3000
```

### API Endpoints

- `/api/balance` — Account balance
- `/api/ticker` — Real-time ticker
- `/api/candles` — K-line / candlestick data
- `/api/trades` — Trade history
- `/api/orders` — Active orders
- `/api/report` — AI review report
- `/api/oi-scanner` — OI anomaly scan results (JSON)

### Environment Variables

**Dashboard (`.env`)**

```
DASHBOARD_USER=admin
DASHBOARD_PASS=your_password
```

**OI Scanner (`scripts/oi-scanner.env`)**

```
SCAN_INTERVAL=300          # Scan interval in seconds (300 = 5 min)
OI_CHANGE_MIN=10           # Minimum OI 24h change %
PRICE_CHANGE_MAX=5.0       # Maximum price 24h change % (flat = within this)
MIN_OI_USD=20000000        # Minimum OI amount in USD
MIN_VOL_USD=5000000        # Minimum 24h volume in USD
TOP_N=10                   # Max results to show
```

**Telegram Push (main `.env`)**

```
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_HOME_CHANNEL=your_chat_id
```

---

## License

MIT
