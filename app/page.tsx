"use client";

import { useEffect, useMemo, useState } from "react";

type TelegramWebApp = { ready: () => void; expand: () => void; initData: string };
type Quote = { id: string; provider_name: string; quote_side: "buy" | "sell"; price_usd: string; tael_unit: string; source_timestamp: string; verification_status: "indicative" | "verified" };
type Trade = { id: string; provider_name: string; tael_quantity: number; allocation_usd: string; entry_price_usd: string; entry_timestamp: string; mandatory_close_at: string; status: "active" | "closed" | "unresolved"; realized_pnl_usd: string | null };
type Reference = { priceUsd: number; unit: string; publishedAt: string | null; source: "GoldPriceZ" } | null;
declare global { interface Window { Telegram?: { WebApp?: TelegramWebApp } } }

export default function Home() {
  const [access, setAccess] = useState<"loading" | "approved" | "denied">("loading");
  const [tab, setTab] = useState<"home" | "quotes" | "trade" | "portfolio">("home");
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [goldReference, setGoldReference] = useState<Reference>(null);
  const [message, setMessage] = useState("Checking secure access…");
  const [tael, setTael] = useState(1);
  const [provider, setProvider] = useState("");
  const [price, setPrice] = useState("");
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);
  const allocation = useMemo(() => tael * 1000, [tael]);
  const activeTrade = trades.find((trade) => trade.status === "active");

  async function refresh() {
    const [dashboardResponse, referenceResponse] = await Promise.all([fetch("/api/dashboard", { credentials: "same-origin" }), fetch("/api/reference", { credentials: "same-origin" })]);
    if (!dashboardResponse.ok) throw new Error("Unable to load your private records. Configure DATABASE_URL and run db/schema.sql.");
    const data = await dashboardResponse.json() as { quotes: Quote[]; trades: Trade[] };
    setQuotes(data.quotes);
    setTrades(data.trades);
    if (referenceResponse.ok) setGoldReference((await referenceResponse.json() as { reference: Reference }).reference);
  }

  useEffect(() => {
    const miniApp = window.Telegram?.WebApp;
    miniApp?.ready(); miniApp?.expand();
    void fetch("/api/auth/telegram", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ initData: miniApp?.initData ?? "" }) })
      .then(async (response) => {
        if (!response.ok) throw new Error("This Telegram account is not approved for TG Trading.");
        setAccess("approved");
        await refresh();
      })
      .catch((error: unknown) => { setMessage(error instanceof Error ? error.message : "Access not approved"); setAccess("denied"); });
  }, []);

  async function createQuote(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setMessage("");
    try {
      const response = await fetch("/api/quotes", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ providerName: provider, quoteSide: "buy", priceUsd: price, taelUnit: "local tael", sourceReference: reference, verificationStatus: "verified" }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to save quote");
      setProvider(""); setPrice(""); setReference(""); await refresh(); setMessage("Provider quote saved.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save quote"); } finally { setSaving(false); }
  }

  async function createTrade(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setMessage("");
    try {
      const response = await fetch("/api/trades", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ providerName: provider, taelQuantity: tael, entryPriceUsd: price, quoteId: quotes.find((quote) => quote.provider_name === provider)?.id }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to create trade");
      setProvider(""); setPrice(""); await refresh(); setTab("portfolio"); setMessage("Gold trade is active. Close it early or no later than Day 5.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to create trade"); } finally { setSaving(false); }
  }

  async function closeTrade() {
    if (!activeTrade) return;
    const closingPrice = window.prompt("Provider-confirmed closing price in USD:");
    const closeReference = window.prompt("Telegram message/link or confirmation reference:");
    if (!closingPrice || !closeReference) return;
    setSaving(true); setMessage("");
    try {
      const response = await fetch(`/api/trades/${activeTrade.id}/close`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ closingPriceUsd: closingPrice, closeReference }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to close trade");
      await refresh(); setMessage("Trade closed and result recorded.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to close trade"); } finally { setSaving(false); }
  }

  if (access === "loading") return <main className="access"><span className="pulse" />{message}</main>;
  if (access === "denied") return <main className="access denied"><div className="lock">⌁</div><h1>Access not approved</h1><p>{message}</p><small>Ask the owner to approve your Telegram account.</small></main>;

  return <main className="app-shell">
    <header className="topbar"><div><p className="eyebrow">PRIVATE GOLD WORKSPACE</p><h1>TG Trading</h1></div><span className="mode">LOCAL · PRIVATE</span></header>
    {message && <p className="notice" role="status">{message}</p>}
    {tab === "home" && <>
      <section className="hero"><p>{goldReference ? `GoldPriceZ · $${goldReference.priceUsd.toLocaleString()} ${goldReference.unit}` : "Local gold trading"}</p><strong>{activeTrade ? `${activeTrade.tael_quantity} tael active` : "No active trade"}</strong><span>Telegram provider quote controls every trade result</span></section>
      <section className="metrics"><Metric label="Allocated" value={activeTrade ? `$${activeTrade.allocation_usd}` : "$0"} detail="USD 1,000 per tael" /><Metric label="Days left" value={activeTrade ? countdown(activeTrade.mandatory_close_at) : "—"} detail="maximum trade window" /><Metric label="Quotes" value={String(quotes.length)} detail="saved provider records" /></section>
      <section className="section"><div className="section-head"><h2>Local provider quotes</h2><button onClick={() => setTab("quotes")}>View all</button></div>{quotes.slice(0, 3).map((quote) => <QuoteRow key={quote.id} quote={quote} />)}{quotes.length === 0 && <p className="muted">Record a verified Telegram provider quote to start.</p>}</section>
      <section className="action-card"><div><p className="eyebrow">UP TO FIVE DAYS</p><h2>Plan a local gold trade</h2><span>Close early, or by the mandatory Day-5 deadline.</span></div><button className="primary" onClick={() => setTab("trade")}>New plan</button></section>
    </>}
    {tab === "quotes" && <section className="section page"><p className="eyebrow">TELEGRAM PROVIDERS</p><h2>Local quote board</h2><div className="reference"><span>GoldPriceZ comparison</span><strong>{goldReference ? `$${goldReference.priceUsd.toLocaleString()} ${goldReference.unit}` : "Reference feed not configured"}</strong><small>{goldReference?.publishedAt ? `Published ${new Date(goldReference.publishedAt).toLocaleString()}` : "Indicative only; a direct provider-confirmed Telegram quote is required for local trades."}</small></div>{quotes.map((quote) => <QuoteRow key={quote.id} quote={quote} />)}<form className="form" onSubmit={createQuote}><h3>Record provider quote</h3><TextField label="Provider name" value={provider} setValue={setProvider} /><TextField label="Buy price (USD per local tael)" value={price} setValue={setPrice} inputMode="decimal" /><TextField label="Telegram message link/reference" value={reference} setValue={setReference} /><button className="primary block" disabled={saving}>{saving ? "Saving…" : "Save verified quote"}</button></form></section>}
    {tab === "trade" && <section className="section page"><p className="eyebrow">NEW LOCAL GOLD PLAN</p><h2>Set allocation and deadline</h2><form className="form" onSubmit={createTrade}><label>Gold quantity <div className="stepper"><button type="button" onClick={() => setTael(Math.max(1, tael - 1))}>−</button><strong>{tael} tael</strong><button type="button" onClick={() => setTael(tael + 1)}>+</button></div></label><div className="allocation"><span>Required allocation</span><strong>USD {allocation.toLocaleString()}</strong><small>USD 1,000 per tael</small></div><TextField label="Confirmed provider name" value={provider} setValue={setProvider} /><TextField label="Confirmed entry price (USD per tael)" value={price} setValue={setPrice} inputMode="decimal" /><div className="form-row"><span>Maximum holding time</span><strong>5 calendar days</strong></div><p className="hint">You may close earlier to realize profit or loss. The provider confirmation is retained as the source record.</p><button className="primary block" disabled={saving}>{saving ? "Saving…" : "Confirm and activate trade"}</button></form></section>}
    {tab === "portfolio" && <section className="section page"><p className="eyebrow">PORTFOLIO</p><h2>Gold positions</h2>{trades.map((trade) => <article className="position" key={trade.id}><span>{trade.status === "active" ? "Active" : "Closed"} · {trade.provider_name}</span><strong>{trade.tael_quantity} tael · ${trade.allocation_usd} allocated</strong><small>Entry ${trade.entry_price_usd} · {trade.status === "active" ? `close by ${new Date(trade.mandatory_close_at).toLocaleString()}` : `realized P&L $${trade.realized_pnl_usd ?? "0"}`}</small></article>)}{activeTrade && <button className="primary block" onClick={closeTrade} disabled={saving}>{saving ? "Saving…" : "Record early close"}</button>}{trades.length === 0 && <p className="muted">No trade records yet.</p>}</section>}
    <nav aria-label="Main navigation"><Nav label="Home" active={tab === "home"} onClick={() => setTab("home")} icon="⌂" /><Nav label="Quotes" active={tab === "quotes"} onClick={() => setTab("quotes")} icon="◫" /><Nav label="Trade" active={tab === "trade"} onClick={() => setTab("trade")} icon="＋" /><Nav label="Portfolio" active={tab === "portfolio"} onClick={() => setTab("portfolio")} icon="◉" /></nav>
  </main>;
}

function TextField({ label, value, setValue, inputMode }: { label: string; value: string; setValue: (value: string) => void; inputMode?: "decimal" }) { return <label>{label}<input required value={value} inputMode={inputMode} onChange={(event) => setValue(event.target.value)} /></label>; }
function Metric({ label, value, detail }: { label: string; value: string; detail: string }) { return <article className="metric"><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>; }
function QuoteRow({ quote }: { quote: Quote }) { return <article className="quote"><div className="provider-mark">{quote.provider_name.slice(0, 1).toUpperCase()}</div><div><strong>{quote.provider_name}</strong><span>{quote.quote_side} · {quote.tael_unit} · {new Date(quote.source_timestamp).toLocaleString()}</span></div><div className="quote-price"><strong>${quote.price_usd}</strong><span className={quote.verification_status === "verified" ? "verified" : ""}>{quote.verification_status}</span></div></article>; }
function Nav({ label, active, onClick, icon }: { label: string; active: boolean; onClick: () => void; icon: string }) { return <button className={active ? "nav-item active" : "nav-item"} onClick={onClick}><span>{icon}</span>{label}</button>; }
function countdown(date: string) { const hours = Math.max(0, Math.ceil((new Date(date).getTime() - Date.now()) / 3_600_000)); return `${Math.floor(hours / 24)}d ${hours % 24}h`; }
