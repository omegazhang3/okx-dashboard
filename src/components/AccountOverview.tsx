"use client";

import { useEffect, useState, useCallback } from "react";

interface Balance {
  currency: string;
  equity: number;
  available: number;
  frozen: number;
}

interface Ticker {
  instId: string;
  last: number;
  change24h: number;
}

export default function AccountOverview() {
  const [balances, setBalances] = useState<Balance[]>([]);
  const [btcTicker, setBtcTicker] = useState<Ticker | null>(null);
  const [ethTicker, setEthTicker] = useState<Ticker | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchData = useCallback(async () => {
    try {
      const [balRes, btcRes, ethRes] = await Promise.all([
        fetch("/api/balance"),
        fetch("/api/ticker?instId=BTC-USDT"),
        fetch("/api/ticker?instId=ETH-USDT"),
      ]);
      const balData = await balRes.json();
      const btcData = await btcRes.json();
      const ethData = await ethRes.json();

      if (balData.success) setBalances(balData.data);
      if (btcData.success) setBtcTicker(btcData.data);
      if (ethData.success) setEthTicker(ethData.data);
      setLastUpdate(new Date());
    } catch (e) {
      console.error("Fetch error:", e);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const btc = balances.find((b) => b.currency === "BTC");
  const eth = balances.find((b) => b.currency === "ETH");
  const usdt = balances.find((b) => b.currency === "USDT");

  const btcValue = (btc?.equity || 0) * (btcTicker?.last || 0);
  const ethValue = (eth?.equity || 0) * (ethTicker?.last || 0);
  const usdtValue = usdt?.equity || 0;
  const totalValue = btcValue + ethValue + usdtValue;

  return (
    <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-100">💰 账户总览</h2>
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-gray-500">
            {lastUpdate.toLocaleTimeString("zh-CN")} 更新
          </span>
        </div>
      </div>

      <div className="text-3xl font-bold text-white mb-6">
        ${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <AssetCard
          icon="₿"
          name="BTC"
          amount={btc?.equity || 0}
          value={btcValue}
          price={btcTicker?.last || 0}
          change={btcTicker?.change24h || 0}
          color="text-orange-400"
        />
        <AssetCard
          icon="Ξ"
          name="ETH"
          amount={eth?.equity || 0}
          value={ethValue}
          price={ethTicker?.last || 0}
          change={ethTicker?.change24h || 0}
          color="text-blue-400"
        />
        <AssetCard
          icon="$"
          name="USDT"
          amount={usdt?.equity || 0}
          value={usdtValue}
          price={1}
          change={0}
          color="text-green-400"
        />
      </div>
    </div>
  );
}

function AssetCard({
  icon,
  name,
  amount,
  value,
  price,
  change,
  color,
}: {
  icon: string;
  name: string;
  amount: number;
  value: number;
  price: number;
  change: number;
  color: string;
}) {
  return (
    <div className="rounded-lg bg-gray-800/50 p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-xl ${color}`}>{icon}</span>
        <span className="text-sm font-medium text-gray-300">{name}</span>
      </div>
      <div className="text-lg font-semibold text-white">
        {name === "USDT"
          ? `$${value.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
          : amount.toFixed(name === "BTC" ? 6 : 2)}
      </div>
      {name !== "USDT" && (
        <>
          <div className="text-xs text-gray-500 mt-1">
            ${price.toLocaleString()}
          </div>
          <div
            className={`text-xs mt-1 ${change >= 0 ? "text-green-400" : "text-red-400"}`}
          >
            {change >= 0 ? "+" : ""}
            {change.toFixed(2)}%
          </div>
        </>
      )}
    </div>
  );
}
