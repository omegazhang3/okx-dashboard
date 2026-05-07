import { NextResponse } from "next/server";
import { execSync } from "child_process";
import { readFileSync } from "fs";
import { join } from "path";

export async function GET() {
  try {
    // 获取脚本路径（项目根目录下的 scripts/）
    const scriptPath = join(process.cwd(), "scripts", "oi-scanner.py");
    const stateFile = "/tmp/oi-scanner-state.json";

    // 运行扫描脚本
    execSync(`python3 "${scriptPath}"`, {
      encoding: "utf-8",
      timeout: 30000,
    });

    // 读取状态文件获取结构化数据
    let state: Record<string, unknown> = {};
    try {
      const raw = readFileSync(stateFile, "utf-8");
      state = JSON.parse(raw);
    } catch {
      // ignore if file doesn't exist
    }

    // 提取双重确认的币种详情
    const signals = Object.entries(state)
      .filter(([key]) => !key.startsWith("_"))
      .map(([instId, data]) => ({
        instId,
        ...(data as Record<string, unknown>),
      }));

    const lastScan = state._last_scan as string | undefined;

    return NextResponse.json({
      success: true,
      data: {
        signals,
        lastScan: lastScan || null,
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
