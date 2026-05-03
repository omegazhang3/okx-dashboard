"use client";

import { useEffect, useState, useCallback } from "react";

interface GridLevel {
  price: number;
  type: "buy" | "sell";
  status: "pending" | "filled";
}

export default function GridBot() {
  const [currentPrice, setCurrentPrice] = useState(0);
  const [gridLevels, setGridLevels] = useState<GridLevel[]>([]);
  const [config, setConfig] = useState({
    upperPrice: 80000,
    lowerPrice: 74000,
    grids: 8,
  });

  const fetchPrice = useCallback(async () => {
    try {
      const res = await fetch("/api/ticker?instId=BTC-USDT");
      const data = await res.json();
      if (data.success) {
        setCurrentPrice(data.data.last);
      }
    } catch (e) {
      console.error("Grid fetch error:", e);
    }
  }, []);

  useEffect(() => {
    fetchPrice();
    const interval = setInterval(fetchPrice, 10000);
    return () => clearInterval(interval);
  }, [fetchPrice]);

  useEffect(() => {
    const { upperPrice, lowerPrice, grids } = config;
    const step = (upperPrice - lowerPrice) / grids;
    const levels: GridLevel[] = [];
    for (let i = 0; i <= grids; i++) {
      const price = lowerPrice + step * i;
      levels.push({
        price,
        type: i % 2 === 0 ? "buy" : "sell",
        status: currentPrice > price ? "filled" : "pending",
      });
    }
    setGridLevels(levels);
  }, [currentPrice, config]);

  const priceRange = config.upperPrice - config.lowerPrice;
  const pricePosition =
    ((currentPrice - config.lowerPrice) / priceRange) * 100;

  return (
    <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
      <h2 className="text-lg font-semibold text-gray-100 mb-4">
        📐 网格 Bot 可视化
      </h2>

      {/* Config */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div>
          <label className="text-xs text-gray-500">上限价格</label>
          <input
            type="number"
            value={config.upperPrice}
            onChange={(e) =>
              setConfig({ ...config, upperPrice: Number(e.target.value) })
            }
            className="w-full bg-gray-800 text-white text-sm rounded px-3 py-1.5 border border-gray-700 mt-1"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">下限价格</label>
          <input
            type="number"
            value={config.lowerPrice}
            onChange={(e) =>
              setConfig({ ...config, lowerPrice: Number(e.target.value) })
            }
            className="w-full bg-gray-800 text-white text-sm rounded px-3 py-1.5 border border-gray-700 mt-1"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">网格数</label>
          <input
            type="number"
            value={config.grids}
            onChange={(e) =>
              setConfig({ ...config, grids: Number(e.target.value) })
            }
            className="w-full bg-gray-800 text-white text-sm rounded px-3 py-1.5 border border-gray-700 mt-1"
          />
        </div>
      </div>

      {/* Current Price */}
      <div className="text-center mb-4">
        <div className="text-2xl font-bold text-white">
          ${currentPrice.toLocaleString()}
        </div>
        <div className="text-xs text-gray-500">当前价格</div>
      </div>

      {/* Grid Visualization */}
      <div className="relative h-64 bg-gray-800/30 rounded-lg overflow-hidden">
        {/* Price indicator */}
        <div
          className="absolute left-0 right-0 z-10 flex items-center"
          style={{ top: `${100 - pricePosition}%` }}
        >
          <div className="w-full border-t-2 border-blue-500 border-dashed" />
          <div className="absolute right-2 bg-blue-600 text-white text-xs px-2 py-0.5 rounded">
            ${currentPrice.toLocaleString()}
          </div>
        </div>

        {/* Grid levels */}
        {gridLevels.map((level, i) => {
          const pos = ((level.price - config.lowerPrice) / priceRange) * 100;
          return (
            <div
              key={i}
              className="absolute left-0 right-0 flex items-center"
              style={{ top: `${100 - pos}%` }}
            >
              <div
                className={`w-full border-t ${
                  level.type === "buy"
                    ? "border-green-500/50"
                    : "border-red-500/50"
                }`}
              />
              <div
                className={`absolute left-2 text-xs px-2 py-0.5 rounded ${
                  level.type === "buy"
                    ? "bg-green-900/50 text-green-400"
                    : "bg-red-900/50 text-red-400"
                } ${level.status === "filled" ? "opacity-50 line-through" : ""}`}
              >
                {level.type === "buy" ? "B" : "S"} $
                {level.price.toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-3 gap-2 mt-4">
        <div className="text-center rounded-lg bg-gray-800/50 p-2">
          <div className="text-xs text-gray-500">买单网格</div>
          <div className="text-sm font-semibold text-green-400">
            {gridLevels.filter((g) => g.type === "buy").length}
          </div>
        </div>
        <div className="text-center rounded-lg bg-gray-800/50 p-2">
          <div className="text-xs text-gray-500">卖单网格</div>
          <div className="text-sm font-semibold text-red-400">
            {gridLevels.filter((g) => g.type === "sell").length}
          </div>
        </div>
        <div className="text-center rounded-lg bg-gray-800/50 p-2">
          <div className="text-xs text-gray-500">网格利润</div>
          <div className="text-sm font-semibold text-yellow-400">
            ~{((priceRange / config.grids / currentPrice) * 100).toFixed(2)}%
          </div>
        </div>
      </div>
    </div>
  );
}
