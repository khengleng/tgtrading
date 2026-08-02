import { NextResponse } from "next/server";
import { database } from "@/lib/db";
import { requireAuthorizedRequest } from "@/lib/auth";
import { positiveMoney, requiredText } from "@/lib/validation";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = requireAuthorizedRequest(request);
    const { id } = await context.params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Trade identifier is invalid");
    const body = await request.json() as Record<string, unknown>;
    const closingPrice = positiveMoney(body.closingPriceUsd, "Closing price");
    const closeReference = requiredText(body.closeReference, "Provider close reference", 500);
    const result = await database().query(
      "UPDATE gold_trades SET closing_price_usd = $1, close_timestamp = NOW(), close_reference = $2, realized_pnl_usd = ROUND((($1 - entry_price_usd) * tael_quantity)::numeric, 2), status = 'closed' WHERE id = $3 AND owner_telegram_id = $4 AND status = 'active' RETURNING *",
      [closingPrice, closeReference, id, user.telegramId]
    );
    if (!result.rowCount) throw new Error("Active trade was not found");
    return NextResponse.json({ trade: result.rows[0] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to close trade" }, { status: 400 });
  }
}
