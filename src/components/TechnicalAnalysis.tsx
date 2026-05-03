"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  vol: number;
}

interface Analysis {
  price: number;
  change30d: number;
  ma5: number;
  ma10: number;
  ma20: number;
  maTrend: string;
  rsi: number;
  rsiZone: string;
  macdLine: number;
  signalLine: number;
  histogram: number;
  macdSignal: string;
  kdjK: number;
  kdjD: number;
  kdjJ: number;
  kdjZone: string;
  support10d: number;
  resistance10d: number;
  volRatio: number;
  volSignal: string;
  signals: { label: string; type: string }[];
  score: number;
}

export default function TechnicalAnalysis() {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [instId, setInstId] = useState("BTC-USDT");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/candles?instId=${instId}&bar=1D&limit=30`);
      const data = await res.json();
      if (data.success) {
        setCandles(data.data.candles);
        setAnalysis(data.data.analysis);
      }
    } catch (e) {
      console.error("TA fetch error:", e);
    }
  }, [instId]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const chartData = candles.map((c) => ({
    ...c,
    date: c.time.split(",")[0].split("/").slice(0, 2).join("/"),
    color: c.close >= c.open ? "#22c55e" : "#ef4444",
  }));

  if (!analysis) {
    return (
      <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
        <div className="animate-pulse text-gray-500">加载技术分析数据...</div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-100">📊 技术分析</h2>
        <select
          value={instId}
          onChange={(e) => setInstId(e.target.value)}
          className="bg-gray-800 text-gray-300 text-sm rounded-lg px-3 py-1.5 border border-gray-700 focus:outline-none focus:border-blue-500"
        >
          <option value="BTC-USDT">BTC/USDT</option>
          <option value="ETH-USDT">ETH/USDT</option>
        </select>
      </div>

      {/* Score Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">综合评分</span>
          <span
            className={`text-2xl font-bold ${
              analysis.score >= 60
                ? "text-green-400"
                : analysis.score <= 40
                  ? "text-red-400"
                  : "text-yellow-400"
            }`}
          >
            {analysis.score}/100
          </span>
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              analysis.score >= 60
                ? "bg-green-500"
                : analysis.score <= 40
                  ? "bg-red-500"
                  : "bg-yellow-500"
            }`}
            style={{ width: `${analysis.score}%` }}
          />
        </div>
      </div>

      {/* Indicators Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <IndicatorCard
          label="RSI(14)"
          value={analysis.rsi.toFixed(1)}
          zone={analysis.rsiZone}
          zones={{ 超买: "text-red-400", 超卖: "text-green-400", 中性: "text-gray-300" }}
        />
        <IndicatorCard
          label="MACD"
          value={analysis.macdSignal}
          zone={analysis.macdSignal}
          zones={{ 多头动能: "text-green-400", 空头动能: "text-red-400" }}
        />
        <IndicatorCard
          label="KDJ"
          value={`K=${analysis.kdjK.toFixed(0)}`}
          zone={analysis.kdjZone}
          zones={{ 超买: "text-red-400", 超卖: "text-green-400", 中性: "text-gray-300" }}
        />
        <IndicatorCard
          label="成交量"
          value={`${analysis.volRatio.toFixed(2)}x`}
          zone={analysis.volSignal}
          zones={{ 放量: "text-green-400", 缩量: "text-yellow-400", 正常: "text-gray-300" }}
        />
      </div>

      {/* Support/Resistance */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="rounded-lg bg-green-900/20 border border-green-900/50 p-3">
          <div className="text-xs text-green-400 mb-1">🟢 支撑位 (10日)</div>
          <div className="text-lg font-semibold text-green-300">
            ${analysis.support10d.toLocaleString()}
          </div>
        </div>
        <div className="rounded-lg bg-red-900/20 border border-red-900/50 p-3">
          <div className="text-xs text-red-400 mb-1">🔴 压力位 (10日)</div>
          <div className="text-lg font-semibold text-red-300">
            ${analysis.resistance10d.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Candlestick Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              interval={4}
            />
            <YAxis
              domain={["auto", "auto"]}
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              width={70}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1f2937",
                border: "1px solid #374151",
                borderRadius: "8px",
                color: "#f3f4f6",
              }}
              formatter={(value) => [`$${Number(value).toLocaleString()}`, ""]}
            />
            <Bar dataKey="vol" fill="#374151" yAxisId="vol" opacity={0.3} />
            <Line
              type="monotone"
              dataKey="close"
              stroke="#3b82f6"
              dot={false}
              strokeWidth={2}
            />
            <ReferenceLine
              y={analysis.support10d}
              stroke="#22c55e"
              strokeDasharray="3 3"
            />
            <ReferenceLine
              y={analysis.resistance10d}
              stroke="#ef4444"
              strokeDasharray="3 3"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Signals */}
      <div className="mt-4 space-y-1">
        {analysis.signals.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span>
              {s.type === "bullish" ? "✅" : s.type === "bearish" ? "❌" : "➖"}
            </span>
            <span className="text-gray-300">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function IndicatorCard({
  label,
  value,
  zone,
  zones,
}: {
  label: string;
  value: string;
  zone: string;
  zones: Record<string, string>;
}) {
  return (
    <div className="rounded-lg bg-gray-800/50 p-3">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`text-base font-semibold ${zones[zone] || "text-gray-300"}`}>
        {value}
      </div>
      <div className={`text-xs ${zones[zone] || "text-gray-500"}`}>{zone}</div>
    </div>
  );
}
