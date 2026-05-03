"use client";

import { useEffect, useState, useCallback } from "react";

interface Trade {
  [key: string]: string;
}

export default function TradeHistory() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [instId, setInstId] = useState("BTC-USDT");
  const [loading, setLoading] = useState(false);

  const fetchTrades = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/trades?instId=${instId}&limit=15`);
      const data = await res.json();
      if (data.success) setTrades(data.data);
    } catch (e) {
      console.error("Trades fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [instId]);

  useEffect(() => {
    fetchTrades();
  }, [fetchTrades]);

  const headers = trades.length > 0 ? Object.keys(trades[0]) : [];

  return (
    <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-100">📋 交易记录</h2>
        <div className="flex items-center gap-2">
          <select
            value={instId}
            onChange={(e) => setInstId(e.target.value)}
            className="bg-gray-800 text-gray-300 text-sm rounded-lg px-3 py-1.5 border border-gray-700"
          >
            <option value="BTC-USDT">BTC/USDT</option>
            <option value="ETH-USDT">ETH/USDT</option>
          </select>
          <button
            onClick={fetchTrades}
            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg border border-gray-700"
          >
            🔄
          </button>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse text-gray-500 text-center py-8">
          加载中...
        </div>
      ) : trades.length === 0 ? (
        <div className="text-center py-8 text-gray-600">
          <div className="text-3xl mb-2">📭</div>
          <div>暂无交易记录</div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                {headers.map((h) => (
                  <th
                    key={h}
                    className="text-left py-2 px-2 text-xs text-gray-500 font-medium"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trades.map((trade, i) => (
                <tr
                  key={i}
                  className="border-b border-gray-800/50 hover:bg-gray-800/30"
                >
                  {headers.map((h) => (
                    <td key={h} className="py-2 px-2 text-gray-300 text-xs">
                      {trade[h]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
