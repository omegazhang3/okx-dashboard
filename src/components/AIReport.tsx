"use client";

import { useState } from "react";

export default function AIReport() {
  const [report, setReport] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [portfolio, setPortfolio] = useState<{
    totalValue: number;
    btcValue: number;
    ethValue: number;
    usdtValue: number;
  } | null>(null);

  const generateReport = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/report");
      const data = await res.json();
      if (data.success) {
        setReport(data.data.report);
        setPortfolio(data.data.portfolio);
      } else {
        setReport(`❌ 生成失败: ${data.error}`);
      }
    } catch (e) {
      setReport(`❌ 请求失败: ${e}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-100">🤖 AI 复盘报告</h2>
        <button
          onClick={generateReport}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              生成中...
            </>
          ) : (
            "📊 一键生成复盘"
          )}
        </button>
      </div>

      {portfolio && (
        <div className="grid grid-cols-4 gap-2 mb-4">
          <MiniStat label="总资产" value={`$${portfolio.totalValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}`} />
          <MiniStat label="BTC" value={`$${portfolio.btcValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}`} />
          <MiniStat label="ETH" value={`$${portfolio.ethValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}`} />
          <MiniStat label="USDT" value={`$${portfolio.usdtValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}`} />
        </div>
      )}

      {report ? (
        <pre className="whitespace-pre-wrap text-sm text-gray-300 bg-gray-800/50 rounded-lg p-4 max-h-96 overflow-y-auto font-mono leading-relaxed">
          {report}
        </pre>
      ) : (
        <div className="text-center py-12 text-gray-600">
          <div className="text-4xl mb-2">📊</div>
          <div>点击上方按钮生成 AI 复盘报告</div>
          <div className="text-xs mt-1">将自动获取账户数据、技术分析并生成建议</div>
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-800/50 p-2 text-center">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-sm font-semibold text-white">{value}</div>
    </div>
  );
}
