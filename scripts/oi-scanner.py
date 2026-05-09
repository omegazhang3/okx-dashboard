#!/usr/bin/env python3
"""
OI 异动扫描器 + CME 上架监控
纯脚本运行，有信号时直接推送 Telegram，无信号时静默退出
配置文件: /opt/data/scripts/oi-scanner.env
"""

import subprocess
import json
import os
import urllib.request
import re
import urllib.parse
from datetime import datetime
from pathlib import Path

# ============ 配置加载 ============
SCRIPT_DIR = Path(__file__).parent
CONFIG_FILE = SCRIPT_DIR / "oi-scanner.env"


def load_config() -> dict:
    """从 .env 文件加载配置"""
    defaults = {
        "OI_CHANGE_MIN": 10,
        "PRICE_CHANGE_MAX": 5.0,
        "MIN_OI_USD": 20_000_000,
        "MIN_VOL_USD": 5_000_000,
        "TOP_N": 10,
        "SCAN_INTERVAL": 300,
    }
    if CONFIG_FILE.exists():
        for line in CONFIG_FILE.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                key, val = line.split("=", 1)
                key = key.strip()
                val = val.strip().split("#")[0].strip()
                if key in defaults:
                    try:
                        defaults[key] = type(defaults[key])(val)
                    except (ValueError, TypeError):
                        pass
    return defaults


def load_env_file(path: str) -> dict:
    """从任意 .env 文件加载键值对"""
    result = {}
    p = Path(path)
    if p.exists():
        for line in p.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                key, val = line.split("=", 1)
                result[key.strip()] = val.strip().split("#")[0].strip()
    return result


cfg = load_config()
OI_CHANGE_MIN = cfg["OI_CHANGE_MIN"]
PRICE_CHANGE_MAX = cfg["PRICE_CHANGE_MAX"]
MIN_OI_USD = int(cfg["MIN_OI_USD"])
MIN_VOL_USD = int(cfg["MIN_VOL_USD"])
TOP_N = cfg["TOP_N"]
SCAN_INTERVAL = int(cfg["SCAN_INTERVAL"])

# Telegram 配置从 /opt/data/.env 读取
_main_env = load_env_file("/opt/data/.env")
TG_TOKEN = _main_env.get("TELEGRAM_BOT_TOKEN", "")
TG_CHAT_ID = _main_env.get("TELEGRAM_HOME_CHANNEL", "")

HOME = os.environ.get("HOME", "/opt/data/home")
OKX_CMD = f"HOME={HOME} okx"
STATE_FILE = "/tmp/oi-scanner-state.json"
CME_STATE_FILE = "/tmp/cme-crypto-listings.json"
CME_CHECK_INTERVAL = 3600  # CME 每小时检查一次（上架是罕见事件）

# 已知 CME 加密货币期货产品（2026年5月）
KNOWN_CME_PRODUCTS = {
    "Bitcoin", "Ether", "Ethereum", "Solana", "XRP", "Ripple",
    "Cardano", "Chainlink", "Lumens", "Stellar", "Avalanche", "Sui",
}


def send_telegram(text: str) -> bool:
    """通过 Telegram Bot API 直接发送消息"""
    if not TG_TOKEN or not TG_CHAT_ID:
        print("Telegram not configured, skipping push")
        return False
    url = f"https://api.telegram.org/bot{TG_TOKEN}/sendMessage"
    data = urllib.parse.urlencode({
        "chat_id": TG_CHAT_ID,
        "text": text,
        "parse_mode": "Markdown",
    }).encode()
    try:
        req = urllib.request.Request(url, data=data, method="POST")
        with urllib.request.urlopen(req, timeout=10) as resp:
            result = json.loads(resp.read())
            return result.get("ok", False)
    except Exception as e:
        print(f"Telegram send failed: {e}")
        return False


def load_cme_state() -> dict:
    """加载 CME 产品状态"""
    if os.path.exists(CME_STATE_FILE):
        try:
            with open(CME_STATE_FILE, "r") as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            pass
    return {"products": list(KNOWN_CME_PRODUCTS), "last_check": None}


def save_cme_state(products: set):
    """保存 CME 产品状态"""
    state = {
        "products": sorted(products),
        "last_check": datetime.now(tz=None).isoformat(),
    }
    with open(CME_STATE_FILE, "w") as f:
        json.dump(state, f, indent=2, ensure_ascii=False)


def should_check_cme() -> bool:
    """检查是否到了 CME 扫描时间"""
    state = load_cme_state()
    last = state.get("last_check")
    if not last:
        return True
    try:
        elapsed = (datetime.now(tz=None) - datetime.fromisoformat(last)).total_seconds()
        return elapsed >= CME_CHECK_INTERVAL
    except (ValueError, TypeError):
        return True


def fetch_cme_crypto_page() -> str:
    """通过 r.jina.ai 抓取 CME 加密货币产品页"""
    url = "https://r.jina.ai/https://www.cmegroup.com/markets/cryptocurrencies.html"
    try:
        req = urllib.request.Request(url, headers={
            "User-Agent": "Mozilla/5.0",
            "Accept": "text/plain",
        })
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.read().decode("utf-8", errors="replace")
    except Exception as e:
        print(f"CME page fetch failed: {e}")
        return ""

def extract_cme_products(page_text: str) -> set:
    """从 CME 页面 tab 列表提取期货产品名称（最可靠的方法）"""
    products = set()

    # 从 Single Asset tab 列表提取 — "*   Bitcoin\n*   Ether\n*   Solana..."
    # 这是 CME 页面上最可靠的产品来源
    tab_section = re.search(
        r"Single\s+Asset(.*?)Explore all futures",
        page_text, re.IGNORECASE | re.DOTALL
    )
    if tab_section:
        block = tab_section.group(1)
        for name in re.findall(r"^\*\s+([A-Za-z]+)", block, re.MULTILINE):
            name = name.strip()
            skip = {"Featured", "Single", "Multi", "Asset", "Volatility", "View", "Tradable", "Newly", "Listed"}
            if name and name not in skip and len(name) > 2:
                products.add(name)

    # 从 Micro 产品补充 — "Micro Bitcoin Futures", "Micro SOL Futures"
    for name in re.findall(r"Micro\s+([A-Za-z]+)\s+Futures", page_text):
        name = name.strip()
        if len(name) > 2:
            products.add(name)

    return products


def check_cme_listings() -> str:
    """检查 CME 新上架产品，返回报告（空字符串=无新发现）"""
    if not should_check_cme():
        return ""

    state = load_cme_state()
    known = set(state.get("products", []))

    page_text = fetch_cme_crypto_page()
    if not page_text:
        return ""

    current = extract_cme_products(page_text)
    if not current:
        print("No products extracted from CME page")
        save_cme_state(known)  # 更新检查时间，避免反复失败重试
        return ""

    # 合并已知和当前（CME 页面可能不列出所有产品）
    all_known = known | KNOWN_CME_PRODUCTS
    new_products = current - all_known

    # 保存当前状态
    save_cme_state(all_known | current)

    if not new_products:
        print(f"[{datetime.now()}] CME check: no new products (known: {len(all_known)})")
        return ""

    now = datetime.now(tz=None).strftime("%Y-%m-%d %H:%M UTC")
    lines = [
        f"🏦 *CME 新上架期货* — {now}",
        "",
        "以下加密货币新增 CME 期货合约：",
    ]
    for p in sorted(new_products):
        lines.append(f"  🆕 *{p}*")
    lines.extend([
        "",
        "⚡ 机构入场通道已开启，关注后续价格走势",
        "📊 CME 期货 = 机构合规交易 = 可能的 ETF 前兆",
    ])
    return "\n".join(lines)


def run_okx(args: str) -> str:
    """执行 okx CLI 命令"""
    cmd = f"{OKX_CMD} {args}"
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=30)
    return result.stdout


def load_prev_state() -> dict:
    """加载上次扫描结果"""
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, "r") as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            pass
    return {}


def save_state(results_1d: list, results_4h: list):
    """保存本次扫描结果"""
    both = set()
    if results_1d and results_4h:
        both = {r["instId"] for r in results_1d} & {r["instId"] for r in results_4h}

    state = {}
    for r in results_1d:
        if r["instId"] in both:
            state[r["instId"]] = {
                "price": r["last"],
                "oiUsd": r["oiUsd"],
                "deltaOiPct": r["deltaOiPct"],
                "timestamp": datetime.now(tz=None).isoformat(),
            }

    with open(STATE_FILE, "w") as f:
        json.dump(state, f, indent=2)


def parse_oi_change_table(output: str) -> list:
    """解析 oi-change 表格输出"""
    lines = output.strip().split("\n")
    data = []
    in_table = False

    for line in lines:
        line = line.strip()
        if not line or line.startswith("Environment") or line.startswith("---"):
            continue
        if line.startswith("rank"):
            in_table = True
            continue
        if in_table and line[0].isdigit():
            parts = line.split()
            if len(parts) >= 7:
                row = {
                    "rank": int(parts[0]),
                    "instId": parts[1],
                    "last": float(parts[2]),
                    "oiUsd": float(parts[3]),
                    "deltaOiPct": float(parts[4]),
                    "pxChgPct": float(parts[5]),
                    "volUsd24h": float(parts[6]),
                    "fundingRate": float(parts[7]) if len(parts) > 7 else 0,
                }
                data.append(row)
    return data


def get_oi_data(bar: str = "1D") -> list:
    """获取OI变化数据"""
    output = run_okx(
        f"market oi-change --instType SWAP --bar {bar} "
        f"--sortBy absOiDeltaPct --sortOrder desc --limit 100 "
        f"--minOiUsd {MIN_OI_USD} --minVolUsd24h {MIN_VOL_USD}"
    )
    return parse_oi_change_table(output)


def filter_signal(data: list) -> list:
    """筛选：OI上升 + 价格横盘"""
    results = []
    for row in data:
        oi_up = row["deltaOiPct"] > OI_CHANGE_MIN
        price_flat = abs(row["pxChgPct"]) < PRICE_CHANGE_MAX

        if oi_up and price_flat:
            row["signal"] = "OI up + flat"
            row["score"] = row["deltaOiPct"] / max(abs(row["pxChgPct"]), 0.1)
            results.append(row)

    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:TOP_N]


def format_number(n: float) -> str:
    """格式化大数字"""
    if n >= 1_000_000_000:
        return f"${n/1e9:.2f}B"
    elif n >= 1_000_000:
        return f"${n/1e6:.1f}M"
    elif n >= 1_000:
        return f"${n/1e3:.1f}K"
    return f"${n:.2f}"


def format_report(results_1d: list, results_4h: list, prev: dict) -> str:
    """生成报告（只输出双重确认，附带上次对比）"""
    now = datetime.now(tz=None).strftime("%Y-%m-%d %H:%M UTC")
    lines = [
        f"🔍 *OI 异动预警* — {now}",
        "",
    ]

    # 同时出现在1D和4H的币（双重确认）
    both = set()
    if results_1d and results_4h:
        both = {r["instId"] for r in results_1d} & {r["instId"] for r in results_4h}

    if both:
        lines.append("🔥 *双重确认（1D + 4H 同时触发）*")
        for instId in both:
            r = next(x for x in results_1d if x["instId"] == instId)
            fr = r["fundingRate"]
            fr_icon = "🟢" if fr < 0 else "⚪" if fr < 0.01 else "🔴"

            # 与上次扫描对比
            delta_str = ""
            if instId in prev:
                prev_price = prev[instId]["price"]
                price_diff = r["last"] - prev_price
                price_diff_pct = (price_diff / prev_price) * 100 if prev_price else 0
                prev_oi = prev[instId]["deltaOiPct"]
                oi_diff = r["deltaOiPct"] - prev_oi

                if abs(price_diff_pct) < 0.1:
                    trend = "➡️ 价格持平"
                elif price_diff_pct > 0:
                    trend = f"📈 +${price_diff:.4f} (+{price_diff_pct:.2f}%)"
                else:
                    trend = f"📉 ${price_diff:.4f} ({price_diff_pct:.2f}%)"

                oi_trend = f"+{oi_diff:.1f}%" if oi_diff >= 0 else f"{oi_diff:.1f}%"
                delta_str = f"\n     📊 较上次: {trend} | OI: {oi_trend}"
            else:
                delta_str = "\n     📊 首次出现"

            lines.append(
                f"\n  ⚡ *{r['instId']}* — ${r['last']:.4f}\n"
                f"     OI: {format_number(r['oiUsd'])} ({r['deltaOiPct']:+.1f}%)\n"
                f"     价格: {r['pxChgPct']:+.2f}% | 量: {format_number(r['volUsd24h'])}\n"
                f"     资金费率: {fr_icon} {fr*100:.4f}%{delta_str}"
            )
    else:
        # 无双重确认信号，返回空
        return ""

    return "\n".join(lines)


def should_run() -> bool:
    """检查是否到了扫描时间"""
    if not os.path.exists(STATE_FILE):
        return True
    try:
        with open(STATE_FILE, "r") as f:
            state = json.load(f)
        last_ts = state.get("_last_scan")
        if not last_ts:
            return True
        elapsed = (datetime.now(tz=None) - datetime.fromisoformat(last_ts)).total_seconds()
        return elapsed >= SCAN_INTERVAL
    except (json.JSONDecodeError, IOError, ValueError):
        return True


def mark_scanned():
    """记录本次扫描时间"""
    state = {}
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, "r") as f:
                state = json.load(f)
        except (json.JSONDecodeError, IOError):
            pass
    state["_last_scan"] = datetime.now(tz=None).isoformat()
    with open(STATE_FILE, "w") as f:
        json.dump(state, f, indent=2)


def main():
    # 检查是否到了扫描时间
    if not should_run():
        return

    # 加载上次扫描结果
    prev = load_prev_state()

    # 获取1D和4H数据
    data_1d = get_oi_data("1D")
    data_4h = get_oi_data("4H")

    # 筛选信号
    results_1d = filter_signal(data_1d)
    results_4h = filter_signal(data_4h)

    # 生成报告
    report = format_report(results_1d, results_4h, prev)

    # 有信号才推送，无信号静默
    if report:
        ok = send_telegram(report)
        if ok:
            print(f"[{datetime.now()}] Pushed OI signals to Telegram")
        else:
            print(report)
    else:
        print(f"[{datetime.now()}] No dual-confirmed signals, skipping")

    # CME 新上架检查（每小时一次）
    cme_report = check_cme_listings()
    if cme_report:
        ok = send_telegram(cme_report)
        if ok:
            print(f"[{datetime.now()}] Pushed CME listing alert to Telegram")
        else:
            print(cme_report)

    # 保存本次结果供下次对比
    save_state(results_1d, results_4h)
    mark_scanned()


if __name__ == "__main__":
    main()
