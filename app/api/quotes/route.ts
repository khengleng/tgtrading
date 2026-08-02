import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { database } from "@/lib/db";
import { requireAuthorizedRequest } from "@/lib/auth";
import { positiveMoney, requiredText } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const user = requireAuthorizedRequest(request);
    const body = await request.json() as Record<string, unknown>;
    const providerName = requiredText(body.providerName, "Provider name");
    const quoteSide = body.quoteSide === "buy" || body.quoteSide === "sell" ? body.quoteSide : (() => { throw new Error("Quote side is invalid"); })();
    const priceUsd = positiveMoney(body.priceUsd, "Price");
    const taelUnit = requiredText(body.taelUnit, "Tael unit", 60);
    const sourceReference = requiredText(body.sourceReference, "Telegram source reference", 500);
    const verificationStatus = body.verificationStatus === "verified" ? "verified" : "indicative";
    const result = await database().query(
      "INSERT INTO local_quotes (id, owner_telegram_id, provider_name, quote_side, price_usd, tael_unit, source_reference, source_timestamp, verification_status) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),$8) RETURNING *",
      [crypto.randomUUID(), user.telegramId, providerName, quoteSide, priceUsd, taelUnit, sourceReference, verificationStatus]
    );
    return NextResponse.json({ quote: result.rows[0] }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save quote" }, { status: 400 });
  }
}
