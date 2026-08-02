import { NextResponse } from "next/server";
import { requireAuthorizedRequest } from "@/lib/auth";
import { loadGoldReference } from "@/lib/gold-reference";

export async function GET(request: Request) {
  try {
    requireAuthorizedRequest(request);
    const reference = await loadGoldReference();
    return NextResponse.json({ reference }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Gold reference is unavailable" }, { status: 503 });
  }
}
