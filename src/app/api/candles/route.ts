import { NextResponse } from "next/server";
import { okxCommand, parseCandles } from "@/lib/okx";
import { analyze } from "@/lib/ta";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const instId = searchParams.get("instId") || "BTC-USDT";
    const bar = searchParams.get("bar") || "1D";
    const limit = searchParams.get("limit") || "30";

    const output = okxCommand([
      "market",
      "candles",
      instId,
      "--bar",
      bar,
      "--limit",
      limit,
    ]);
    const candles = parseCandles(output);

    // Sort by time ascending for analysis
    const sorted = [...candles].reverse();
    const ta = analyze(sorted);

    return NextResponse.json({
      success: true,
      data: { candles: sorted, analysis: ta },
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
