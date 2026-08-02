import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { database } from "@/lib/db";
import { requireAuthorizedRequest } from "@/lib/auth";
import { positiveInteger, positiveMoney, requiredText } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const user = requireAuthorizedRequest(request);
    const body = await request.json() as Record<string, unknown>;
    const providerName = requiredText(body.providerName, "Provider name");
    const taelQuantity = positiveInteger(body.taelQuantity, "Tael quantity");
    const entryPriceUsd = positiveMoney(body.entryPriceUsd, "Entry price");
    const quoteId = typeof body.quoteId === "string" && /^[0-9a-f-]{36}$/i.test(body.quoteId) ? body.quoteId : null;
    if (quoteId) {
      const quote = await database().query("SELECT id FROM local_quotes WHERE id = $1 AND owner_telegram_id = $2", [quoteId, user.telegramId]);
      if (!quote.rowCount) throw new Error("Selected quote was not found");
    }
    const entry = new Date();
    const close = new Date(entry.getTime() + 5 * 24 * 60 * 60 * 1000);
    const result = await database().query(
      "INSERT INTO gold_trades (id, owner_telegram_id, provider_name, quote_id, tael_quantity, allocation_usd, entry_price_usd, entry_timestamp, mandatory_close_at, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'active') RETURNING *",
      [crypto.randomUUID(), user.telegramId, providerName, quoteId, taelQuantity, taelQuantity * 1000, entryPriceUsd, entry, close]
    );
    return NextResponse.json({ trade: result.rows[0] }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create trade" }, { status: 400 });
  }
}
