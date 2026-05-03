import { NextResponse } from "next/server";
import { okxCommand, parseTicker } from "@/lib/okx";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const instId = searchParams.get("instId") || "BTC-USDT";
    const output = okxCommand(["market", "ticker", instId]);
    const ticker = parseTicker(output);
    return NextResponse.json({ success: true, data: ticker });
  } catch (error: unknown) {
    const err = error as { message?: string };
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
