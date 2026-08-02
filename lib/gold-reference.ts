type ReferencePrice = { priceUsd: number; unit: string; publishedAt: string | null; source: "GoldPriceZ" };

function getNumber(payload: Record<string, unknown>) {
  const nested = payload.data && typeof payload.data === "object" ? payload.data as Record<string, unknown> : {};
  const candidate = payload.priceUsd ?? payload.price_usd ?? payload.price ?? nested.priceUsd ?? nested.price_usd ?? nested.price;
  const price = Number(candidate);
  if (!Number.isFinite(price) || price <= 0) throw new Error("Gold reference response does not include a valid price");
  return price;
}

export async function loadGoldReference(): Promise<ReferencePrice | null> {
  const url = process.env.GOLD_REFERENCE_FEED_URL;
  if (!url) return null;
  const parsedUrl = new URL(url);
  if (parsedUrl.protocol !== "https:") throw new Error("Gold reference feed must use HTTPS");
  const headers = new Headers({ Accept: "application/json" });
  const apiKey = process.env.GOLD_REFERENCE_API_KEY;
  if (apiKey) headers.set(process.env.GOLD_REFERENCE_API_KEY_HEADER || "x-api-key", apiKey);
  const response = await fetch(parsedUrl, { headers, signal: AbortSignal.timeout(8_000), cache: "no-store" });
  if (!response.ok) throw new Error("Gold reference feed is unavailable");
  const payload = await response.json() as Record<string, unknown>;
  const nested = payload.data && typeof payload.data === "object" ? payload.data as Record<string, unknown> : {};
  const unit = String(payload.unit ?? nested.unit ?? "USD / oz");
  const timestamp = payload.timestamp ?? payload.updatedAt ?? payload.updated_at ?? nested.timestamp ?? nested.updatedAt ?? nested.updated_at;
  return { priceUsd: getNumber(payload), unit, publishedAt: typeof timestamp === "string" ? timestamp : null, source: "GoldPriceZ" };
}
