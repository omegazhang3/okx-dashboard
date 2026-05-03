import { NextResponse } from "next/server";
import { okxCommand } from "@/lib/okx";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { instId, side, ordType, sz, tdMode = "cash" } = body;

    if (!instId || !side || !ordType || !sz) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: instId, side, ordType, sz" },
        { status: 400 }
      );
    }

    const output = okxCommand([
      "spot",
      "place",
      "--instId", instId,
      "--side", side,
      "--ordType", ordType,
      "--sz", String(sz),
      "--tdMode", tdMode,
    ]);

    return NextResponse.json({ success: true, data: output });
  } catch (error: unknown) {
    const err = error as { message?: string };
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
