"use client";

import { useState, useEffect, useCallback } from "react";

interface OISignal {
  instId: string;
  price: number;
  oiUsd: number;
  deltaOiPct: number;
  timestamp: string;
}

interface OIData {
  signals: OISignal[];
  lastScan: string;
  count: number;
}

export default function OIScanner() {
  const [data, setData] = useState<OIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchOI = useCallback(async () => {
    try {
      const res = await fetch("/api/oi-scanner");
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        setError("");
      } else {
        setError(json.error || "扫描失败");
      }
    } catch {
      setError("请求失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOI();
    // 每60秒刷新一次
    const interval = setInterval(fetchOI, 60000);
    return () => clearInterval(interval);
  }, [fetchOI]);

  const formatNumber = (n: number) => {
    if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
    if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
    if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
    return `$${n.toFixed(2)}`;
  };

  const formatPrice = (instId: string, price: number) => {
    if (price >= 1000) return `$${price.toLocaleString()}`;
    if (price >= 1) return `$${price.toFixed(4)}`;
    if (price >= 0.01) return `$${price.toFixed(4)}`;
    return `$${price.toFixed(6)}`;
  };

  const cleanInstId = (id: string) => {
    return id.replace(/-USD[_-]?UM?-SWAP/, "").replace(/-USDT-SWAP/, "").replace(/-USD-SWAP/, "");
  };

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          🔍 OI 异动扫描
        </h2>
        <div className="flex items-center gap-2">
          {data?.lastScan && (
            <span className="text-xs text-gray-500">
              {new Date(data.lastScan).toLocaleTimeString("zh-CN", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
          <button
            onClick={fetchOI}
            disabled={loading}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white text-xs rounded-lg transition-colors"
          >
            {loading ? "扫描中..." : "刷新"}
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-500 mb-4">
        双重确认：1D + 4H 同时触发 OI↑ + 价格横盘
      </p>

      {error && (
        <div className="text-red-400 text-sm bg-red-900/20 border border-red-900/50 rounded-lg px-4 py-2 mb-4">
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="text-center py-8 text-gray-500">
          <div className="animate-pulse">正在扫描市场 OI 数据...</div>
        </div>
      ) : !data || data.signals.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          本轮无双重确认信号
        </div>
      ) : (
        <div className="space-y-3">
          {data.signals.map((signal) => (
            <div
              key={signal.instId}
              className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 hover:border-orange-500/50 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-orange-400">⚡</span>
                  <span className="text-white font-medium">
                    {cleanInstId(signal.instId)}
                  </span>
                  <span className="text-gray-400 text-sm">
                    {formatPrice(signal.instId, signal.price)}
                  </span>
                </div>
                <span className="px-2 py-0.5 bg-orange-900/30 text-orange-400 text-xs rounded-full border border-orange-800">
                  🔥 双重确认
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">OI: </span>
                  <span className="text-green-400">
                    {formatNumber(signal.oiUsd)}
                  </span>
                  <span className="text-green-400 ml-1">
                    (+{signal.deltaOiPct.toFixed(1)}%)
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-gray-500">检测时间: </span>
                  <span className="text-gray-400">
                    {new Date(signal.timestamp).toLocaleTimeString("zh-CN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 text-xs text-gray-600 text-center">
        💡 OI↑ + 价格横盘 = 资金在悄悄建仓，可能即将变盘
      </div>
    </div>
  );
}
