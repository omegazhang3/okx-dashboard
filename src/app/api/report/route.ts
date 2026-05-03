import { NextResponse } from "next/server";
import { okxCommand, parseBalance, parseCandles, parseTicker } from "@/lib/okx";
import { analyze } from "@/lib/ta";

export async function GET() {
  try {
    // Fetch all data
    const balanceOutput = okxCommand(["account", "balance"]);
    const balances = parseBalance(balanceOutput);

    const btcTickerOutput = okxCommand(["market", "ticker", "BTC-USDT"]);
    const btcTicker = parseTicker(btcTickerOutput);

    const ethTickerOutput = okxCommand(["market", "ticker", "ETH-USDT"]);
    const ethTicker = parseTicker(ethTickerOutput);

    const candlesOutput = okxCommand([
      "market", "candles", "BTC-USDT", "--bar", "1D", "--limit", "30",
    ]);
    const candles = parseCandles(candlesOutput);
    const sorted = [...candles].reverse();
    const ta = analyze(sorted);

    // Calculate portfolio value
    const btcBalance = balances.find((b) => b.currency === "BTC");
    const ethBalance = balances.find((b) => b.currency === "ETH");
    const usdtBalance = balances.find((b) => b.currency === "USDT");

    const btcValue = (btcBalance?.equity || 0) * btcTicker.last;
    const ethValue = (ethBalance?.equity || 0) * ethTicker.last;
    const usdtValue = usdtBalance?.equity || 0;
    const totalValue = btcValue + ethValue + usdtValue;

    // Generate AI report
    const report = generateReport({
      totalValue,
      btcValue,
      ethValue,
      usdtValue,
      btcPrice: btcTicker.last,
      ethPrice: ethTicker.last,
      btcChange: btcTicker.change24h,
      ethChange: ethTicker.change24h,
      ta,
      balances,
    });

    return NextResponse.json({
      success: true,
      data: {
        portfolio: {
          totalValue,
          btcValue,
          ethValue,
          usdtValue,
          btcPrice: btcTicker.last,
          ethPrice: ethTicker.last,
        },
        analysis: ta,
        report,
      },
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

interface ReportInput {
  totalValue: number;
  btcValue: number;
  ethValue: number;
  usdtValue: number;
  btcPrice: number;
  ethPrice: number;
  btcChange: number;
  ethChange: number;
  ta: ReturnType<typeof analyze>;
  balances: { currency: string; equity: number }[];
}

function generateReport(input: ReportInput): string {
  const {
    totalValue,
    btcValue,
    ethValue,
    usdtValue,
    btcPrice,
    ethPrice,
    ta,
    balances,
  } = input;

  const btcPct = ((btcValue / totalValue) * 100).toFixed(1);
  const ethPct = ((ethValue / totalValue) * 100).toFixed(1);
  const usdtPct = ((usdtValue / totalValue) * 100).toFixed(1);

  const bullishCount = ta.signals.filter((s) => s.type === "bullish").length;
  const bearishCount = ta.signals.filter((s) => s.type === "bearish").length;

  let suggestion = "观望";
  let reason = "";

  if (ta.score >= 70 && ta.rsi < 65) {
    suggestion = "可考虑加仓";
    reason = "多项技术指标看涨，RSI未超买，趋势向好";
  } else if (ta.score >= 60) {
    suggestion = "持有为主";
    reason = "技术面偏多但需确认突破";
  } else if (ta.score <= 30) {
    suggestion = "注意风险";
    reason = "多项技术指标看跌，建议控制仓位";
  } else if (ta.rsi > 70) {
    suggestion = "考虑减仓";
    reason = "RSI超买，短期回调风险增大";
  } else {
    suggestion = "观望等待";
    reason = "信号不明确，等待方向确认";
  }

  const report = `
📊 **OKX 账户复盘报告**
━━━━━━━━━━━━━━━━━━━━

💰 **账户概况**
- 总资产估值: $${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
- BTC: $${btcValue.toLocaleString("en-US", { minimumFractionDigits: 2 })} (${btcPct}%)
- ETH: $${ethValue.toLocaleString("en-US", { minimumFractionDigits: 2 })} (${ethPct}%)
- USDT: $${usdtValue.toLocaleString("en-US", { minimumFractionDigits: 2 })} (${usdtPct}%)

📈 **BTC/USDT 技术分析**
- 当前价格: $${btcPrice.toLocaleString()}
- 30日涨跌幅: ${ta.change30d >= 0 ? "+" : ""}${ta.change30d.toFixed(1)}%
- 趋势: ${ta.maTrend}
- RSI(14): ${ta.rsi.toFixed(1)} (${ta.rsiZone})
- MACD: ${ta.macdSignal}
- KDJ: K=${ta.kdjK.toFixed(1)} (${ta.kdjZone})
- 成交量: ${ta.volSignal} (${ta.volRatio.toFixed(2)}x)

🎯 **关键价位**
- 强支撑: $${ta.support10d.toLocaleString()}
- 强压力: $${ta.resistance10d.toLocaleString()}

📋 **信号汇总**
${ta.signals.map((s) => `- ${s.type === "bullish" ? "✅" : s.type === "bearish" ? "❌" : "➖"} ${s.label}`).join("\n")}
- 综合评分: ${ta.score}/100 (看涨${bullishCount} / 看跌${bearishCount})

💡 **操作建议: ${suggestion}**
${reason}

⚠️ **风险提示**
- 单笔止损 ≤ 总资金 2%
- 保留 20% 现金应急
- 模拟盘环境，不构成投资建议
━━━━━━━━━━━━━━━━━━━━
`.trim();

  return report;
}
