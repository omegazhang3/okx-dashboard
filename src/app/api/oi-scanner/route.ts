import { NextResponse } from "next/server";
import { execSync } from "child_process";

const HOME = process.env.OKX_HOME || process.env.HOME || "/tmp";
const ENV = { ...process.env, HOME };
const SCRIPT = "/opt/data/scripts/oi-scanner.py";
const STATE_FILE = "/tmp/oi-scanner-state.json";

export async function GET() {
  try {
    // 运行扫描脚本
    execSync(`python3 ${SCRIPT}`, {
      env: ENV,
      encoding: "utf-8",
      timeout: 30000,
    });

    // 读取状态文件获取结构化数据
    let state = {};
    try {
      const fs = await import("fs");
      const raw = fs.readFileSync(STATE_FILE, "utf-8");
      state = JSON.parse(raw);
    } catch {
      // ignore
    }

    // 提取双重确认的币种详情
    const signals = Object.entries(state)
      .filter(([key]) => !key.startsWith("_"))
      .map(([instId, data]) => ({
        instId,
        ...(data as Record<string, unknown>),
      }));

    const lastScan = (state as Record<string, unknown>)._last_scan as string;

    return NextResponse.json({
      success: true,
      data: {
        signals,
        lastScan,
        count: signals.length,
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
