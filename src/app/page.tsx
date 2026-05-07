"use client";

import AccountOverview from "@/components/AccountOverview";
import TechnicalAnalysis from "@/components/TechnicalAnalysis";
import GridBot from "@/components/GridBot";
import TradeHistory from "@/components/TradeHistory";
import AIReport from "@/components/AIReport";
import OIScanner from "@/components/OIScanner";

export default function Dashboard() {
  return (
    <main className="min-h-screen bg-gray-950 p-4 lg:p-6">
      {/* Header */}
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <span className="text-3xl">📊</span>
              OKX Trading Dashboard
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              实时监控 · 技术分析 · AI 复盘
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-yellow-900/30 text-yellow-400 text-xs rounded-full border border-yellow-800">
              ⚠️ 模拟盘
            </span>
            <span className="px-3 py-1 bg-green-900/30 text-green-400 text-xs rounded-full border border-green-800 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Live
            </span>
          </div>
        </div>
      </header>

      {/* Account Overview */}
      <section className="mb-6">
        <AccountOverview />
      </section>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Technical Analysis */}
        <section>
          <TechnicalAnalysis />
        </section>

        {/* Grid Bot */}
        <section>
          <GridBot />
        </section>
      </div>

      {/* OI Scanner */}
      <section className="mb-6">
        <OIScanner />
      </section>

      {/* AI Report */}
      <section className="mb-6">
        <AIReport />
      </section>

      {/* Trade History */}
      <section className="mb-6">
        <TradeHistory />
      </section>

      {/* Footer */}
      <footer className="text-center text-xs text-gray-700 py-4">
        OKX Trading Dashboard · 技术分析仅供参考，不构成投资建议
      </footer>
    </main>
  );
}
