import { NextResponse } from "next/server";
import { okxCommand, parseTable } from "@/lib/okx";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const instId = searchParams.get("instId") || "BTC-USDT";
    const limit = searchParams.get("limit") || "20";

    const output = okxCommand([
      "spot",
      "orders",
      "--instId",
      instId,
      "--limit",
      limit,
    ]);
    const orders = parseTable(output);
    return NextResponse.json({ success: true, data: orders });
  } catch (error: unknown) {
    const err = error as { message?: string };
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
