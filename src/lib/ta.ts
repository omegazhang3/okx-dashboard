export interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  vol: number;
}

export interface TechnicalAnalysis {
  price: number;
  change30d: number;
  ma5: number;
  ma10: number;
  ma20: number;
  maTrend: "多头排列" | "空头排列" | "交叉震荡";
  rsi: number;
  rsiZone: "超买" | "超卖" | "中性";
  macdLine: number;
  signalLine: number;
  histogram: number;
  macdSignal: "多头动能" | "空头动能";
  kdjK: number;
  kdjD: number;
  kdjJ: number;
  kdjZone: "超买" | "超卖" | "中性";
  support10d: number;
  resistance10d: number;
  support20d: number;
  resistance20d: number;
  volRatio: number;
  volSignal: "放量" | "缩量" | "正常";
  avgVol20: number;
  signals: { label: string; type: "bullish" | "bearish" | "neutral" }[];
  score: number;
}

function sma(prices: number[], period: number): number | null {
  if (prices.length < period) return null;
  return prices.slice(-period).reduce((a, b) => a + b, 0) / period;
}

function ema(prices: number[], period: number): number | null {
  if (prices.length < period) return null;
  const k = 2 / (period + 1);
  let result = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < prices.length; i++) {
    result = prices[i] * k + result * (1 - k);
  }
  return result;
}

function calcRSI(prices: number[], period = 14): number {
  if (prices.length < period + 1) return 50;
  const gains: number[] = [];
  const losses: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    gains.push(Math.max(diff, 0));
    losses.push(Math.max(-diff, 0));
  }
  const avgGain = gains.slice(-period).reduce((a, b) => a + b, 0) / period;
  const avgLoss = losses.slice(-period).reduce((a, b) => a + b, 0) / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function calcKDJ(
  highs: number[],
  lows: number[],
  closes: number[],
  period = 9
): { k: number; d: number; j: number } {
  if (closes.length < period) return { k: 50, d: 50, j: 50 };
  const h = Math.max(...highs.slice(-period));
  const l = Math.min(...lows.slice(-period));
  const c = closes[closes.length - 1];
  const rsv = h === l ? 50 : ((c - l) / (h - l)) * 100;
  const k = rsv;
  const d = k;
  const j = 3 * k - 2 * d;
  return { k, d, j };
}

export function analyze(candles: Candle[]): TechnicalAnalysis {
  const closes = candles.map((c) => c.close);
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const volumes = candles.map((c) => c.vol);

  const price = closes[closes.length - 1];
  const change30d =
    ((closes[closes.length - 1] - closes[0]) / closes[0]) * 100;

  const ma5 = sma(closes, 5) || 0;
  const ma10 = sma(closes, 10) || 0;
  const ma20 = sma(closes, 20) || 0;

  let maTrend: "多头排列" | "空头排列" | "交叉震荡";
  if (ma5 > ma10 && ma10 > ma20) maTrend = "多头排列";
  else if (ma5 < ma10 && ma10 < ma20) maTrend = "空头排列";
  else maTrend = "交叉震荡";

  const rsi = calcRSI(closes);
  const rsiZone = rsi > 70 ? "超买" : rsi < 30 ? "超卖" : "中性";

  const ema12 = ema(closes, 12) || 0;
  const ema26 = ema(closes, 26) || 0;
  const macdLine = ema12 - ema26;

  const macdValues: number[] = [];
  for (let i = 26; i <= closes.length; i++) {
    const e12 = ema(closes.slice(0, i), 12);
    const e26 = ema(closes.slice(0, i), 26);
    if (e12 && e26) macdValues.push(e12 - e26);
  }
  const signalLine = ema(macdValues, 9) || 0;
  const histogram = macdLine - signalLine;
  const macdSignal = histogram > 0 ? "多头动能" : "空头动能";

  const kdj = calcKDJ(highs, lows, closes);
  const kdjZone =
    kdj.k > 80 ? "超买" : kdj.k < 20 ? "超卖" : "中性";

  const support10d = Math.min(...lows.slice(-10));
  const resistance10d = Math.max(...highs.slice(-10));
  const support20d = Math.min(...lows.slice(-20));
  const resistance20d = Math.max(...highs.slice(-20));

  const avgVol20 =
    volumes.slice(-20).reduce((a, b) => a + b, 0) /
    Math.min(volumes.length, 20);
  const volRatio = volumes[volumes.length - 1] / avgVol20;
  const volSignal =
    volRatio > 1.5 ? "放量" : volRatio < 0.7 ? "缩量" : "正常";

  const signals: { label: string; type: "bullish" | "bearish" | "neutral" }[] =
    [];

  if (maTrend === "多头排列")
    signals.push({ label: "均线多头排列", type: "bullish" });
  else if (maTrend === "空头排列")
    signals.push({ label: "均线空头排列", type: "bearish" });
  else signals.push({ label: "均线交叉震荡", type: "neutral" });

  if (rsiZone === "超卖")
    signals.push({ label: "RSI超卖", type: "bullish" });
  else if (rsiZone === "超买")
    signals.push({ label: "RSI超买", type: "bearish" });
  else signals.push({ label: "RSI中性", type: "neutral" });

  if (macdSignal === "多头动能")
    signals.push({ label: "MACD多头动能", type: "bullish" });
  else signals.push({ label: "MACD空头动能", type: "bearish" });

  if (kdjZone === "超卖")
    signals.push({ label: "KDJ超卖", type: "bullish" });
  else if (kdjZone === "超买")
    signals.push({ label: "KDJ超买", type: "bearish" });
  else signals.push({ label: "KDJ中性", type: "neutral" });

  if (volSignal === "放量")
    signals.push({ label: "成交量放大", type: "bullish" });
  else if (volSignal === "缩量")
    signals.push({ label: "成交量萎缩", type: "bearish" });

  const bullish = signals.filter((s) => s.type === "bullish").length;
  const bearish = signals.filter((s) => s.type === "bearish").length;
  const total = signals.length;
  const score = Math.round(((bullish - bearish) / total + 1) * 50);

  return {
    price,
    change30d,
    ma5,
    ma10,
    ma20,
    maTrend,
    rsi,
    rsiZone,
    macdLine,
    signalLine,
    histogram,
    macdSignal,
    kdjK: kdj.k,
    kdjD: kdj.d,
    kdjJ: kdj.j,
    kdjZone,
    support10d,
    resistance10d,
    support20d,
    resistance20d,
    volRatio,
    volSignal,
    avgVol20,
    signals,
    score,
  };
}
