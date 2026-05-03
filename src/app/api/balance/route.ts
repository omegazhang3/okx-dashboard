import { NextResponse } from "next/server";
import { okxCommand, parseBalance } from "@/lib/okx";

export async function GET() {
  try {
    const output = okxCommand(["account", "balance"]);
    const balances = parseBalance(output);
    return NextResponse.json({ success: true, data: balances });
  } catch (error: unknown) {
    const err = error as { message?: string };
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
