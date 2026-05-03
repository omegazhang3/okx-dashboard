import { execSync } from "child_process";

const HOME = process.env.OKX_HOME || process.env.HOME || "/tmp";
const ENV = { ...process.env, HOME, PATH: `${HOME}/.npm-global/bin:${process.env.PATH}` };

export function okxCommand(args: string[]): string {
  try {
    const result = execSync(`okx ${args.join(" ")}`, {
      env: ENV,
      encoding: "utf-8",
      timeout: 15000,
    });
    return result.trim();
  } catch (error: unknown) {
    const err = error as { stderr?: string; message?: string };
    throw new Error(err.stderr || err.message || "OKX CLI error");
  }
}

export function parseTable(output: string): Record<string, string>[] {
  const lines = output.split("\n").filter((l) => l.trim());
  if (lines.length < 3) return [];

  // Find header line (contains alphabetic chars and isn't a separator)
  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (
      line.includes("currency") ||
      line.includes("instId") ||
      line.includes("time") ||
      line.includes("ordId")
    ) {
      headerIdx = i;
      break;
    }
  }

  if (headerIdx === -1) return [];

  // Split by 2+ spaces
  const headers = lines[headerIdx]
    .trim()
    .split(/\s{2,}/)
    .map((h) => h.trim())
    .filter(Boolean);

  const rows: Record<string, string>[] = [];

  // Skip separator line (----)
  for (let i = headerIdx + 2; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("-")) continue;

    // Split by 2+ spaces
    const values = line.split(/\s{2,}/).map((v) => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || "";
    });
    // Only add rows that have at least one non-empty value
    if (Object.values(row).some((v) => v !== "")) {
      rows.push(row);
    }
  }
  return rows;
}

export interface Balance {
  currency: string;
  equity: number;
  available: number;
  frozen: number;
}

export function parseBalance(output: string): Balance[] {
  const rows = parseTable(output);
  return rows
    .filter((r) => r.currency && r.currency !== "")
    .map((r) => ({
      currency: r.currency || "",
      equity: parseFloat(r.equity || "0"),
      available: parseFloat(r.available || "0"),
      frozen: parseFloat(r.frozen || "0"),
    }));
}

export interface Ticker {
  instId: string;
  last: number;
  open24h: number;
  high24h: number;
  low24h: number;
  vol24h: number;
  change24h: number;
}

export function parseTicker(output: string): Ticker {
  const lines = output.split("\n");
  const get = (key: string) => {
    const line = lines.find((l) => l.trim().startsWith(key));
    if (!line) return "0";
    // Split by 2+ spaces
    const parts = line.trim().split(/\s{2,}/);
    return parts[1]?.trim() || "0";
  };
  return {
    instId: get("instId"),
    last: parseFloat(get("last")),
    open24h: parseFloat(get("24h open")),
    high24h: parseFloat(get("24h high")),
    low24h: parseFloat(get("24h low")),
    vol24h: parseFloat(get("24h vol")),
    change24h: parseFloat(get("24h change %").replace("%", "")),
  };
}

export interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  vol: number;
}

export function parseCandles(output: string): Candle[] {
  const rows = parseTable(output);
  return rows
    .filter((r) => r.time)
    .map((r) => ({
      time: r.time || "",
      open: parseFloat(r.open || "0"),
      high: parseFloat(r.high || "0"),
      low: parseFloat(r.low || "0"),
      close: parseFloat(r.close || "0"),
      vol: parseFloat(r.vol || "0"),
    }));
}
