#!/usr/bin/env python3
"""
OI 异动扫描器 — 找出「持仓量上升 + 价格横盘」的潜在待涨币
每5分钟运行一次，结果推送到 Telegram
"""

import subprocess
import json
import os
from datetime import datetime

# ============ 参数配置 ============
OI_CHANGE_MIN = 10       # OI 24h变化% 最小阈值
PRICE_CHANGE_MAX = 5.0   # 价格24h变化% 最大阈值（横盘定义）
MIN_OI_USD = 20_000_000  # 最小OI金额（过滤小币）
MIN_VOL_USD = 5_000_000  # 最小24h成交量
TOP_N = 10               # 最多显示前N个
# =================================

HOME = os.environ.get("HOME", "/opt/data/home")
OKX_CMD = f"HOME={HOME} okx"


def run_okx(args: str) -> str:
    """执行 okx CLI 命令"""
    cmd = f"{OKX_CMD} {args}"
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=30)
    return result.stdout


def parse_oi_change_table(output: str) -> list:
    """解析 oi-change 表格输出"""
    lines = output.strip().split("\n")
    data = []
    in_table = False
    headers = []

    for line in lines:
        line = line.strip()
        if not line or line.startswith("Environment") or line.startswith("---"):
            continue
        if line.startswith("rank"):
            headers = line.split()
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
            row["signal"] = "OI↑ + 横盘"
            row["score"] = row["deltaOiPct"] / max(abs(row["pxChgPct"]), 0.1)
            results.append(row)

    # 按 score 降序排列
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


def format_report(results_1d: list, results_4h: list) -> str:
    """生成报告"""
    now = datetime.now(tz=None).strftime("%Y-%m-%d %H:%M UTC")
    lines = [
        f"🔍 **OI 异动扫描** — {now}\n",
        f"筛选条件: OI变化 > {OI_CHANGE_MIN}% & 价格波动 < {PRICE_CHANGE_MAX}%",
        f"最小OI: {format_number(MIN_OI_USD)} | 最小成交量: {format_number(MIN_VOL_USD)}\n",
    ]

    # 同时出现在1D和4H的币（双重确认）
    both = set()
    if results_1d and results_4h:
        ids_1d = {r["instId"] for r in results_1d}
        ids_4h = {r["instId"] for r in results_4h}
        both = ids_1d & ids_4h

    if both:
        lines.append("🔥 **双重确认（1D + 4H 同时触发）**")
        for instId in both:
            # 取1D的数据作为主数据
            r = next(x for x in results_1d if x["instId"] == instId)
            fr = r["fundingRate"]
            fr_icon = "🟢" if fr < 0 else "⚪" if fr < 0.01 else "🔴"
            lines.append(
                f"  ⚡ **{r['instId']}** — ${r['last']:.4f}\n"
                f"     OI: {format_number(r['oiUsd'])} ({r['deltaOiPct']:+.1f}%)\n"
                f"     价格: {r['pxChgPct']:+.2f}% | 量: {format_number(r['volUsd24h'])}\n"
                f"     资金费率: {fr_icon} {fr*100:.4f}%"
            )
    else:
        lines.append("本轮无双重确认信号")

    return "\n".join(lines)


def main():
    # 获取1D和4H数据
    data_1d = get_oi_data("1D")
    data_4h = get_oi_data("4H")

    # 筛选信号
    results_1d = filter_signal(data_1d)
    results_4h = filter_signal(data_4h)

    # 生成报告
    report = format_report(results_1d, results_4h)
    print(report)


if __name__ == "__main__":
    main()
