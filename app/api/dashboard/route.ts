import { NextResponse } from "next/server";
import { database } from "@/lib/db";
import { requireAuthorizedRequest } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = requireAuthorizedRequest(request);
    const db = database();
    const [quotes, trades] = await Promise.all([
      db.query("SELECT id, provider_name, quote_side, price_usd, tael_unit, source_timestamp, verification_status FROM local_quotes WHERE owner_telegram_id = $1 ORDER BY source_timestamp DESC LIMIT 20", [user.telegramId]),
      db.query("SELECT id, provider_name, tael_quantity, allocation_usd, entry_price_usd, entry_timestamp, mandatory_close_at, status, closing_price_usd, realized_pnl_usd FROM gold_trades WHERE owner_telegram_id = $1 ORDER BY created_at DESC LIMIT 20", [user.telegramId])
    ]);
    return NextResponse.json({ quotes: quotes.rows, trades: trades.rows, reference: null });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load dashboard" }, { status: 401 });
  }
}
