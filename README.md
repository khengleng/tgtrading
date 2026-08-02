# TG Trading

Private Telegram Mini App for managing local Cambodian gold trades with verified
Telegram-provider quotes. The first release supports gold only, with USD 1,000
allocation per tael and a maximum five-calendar-day holding window.

## What is implemented

- Server-side Telegram Mini App signature validation and an allowlist of Telegram
  numeric user IDs.
- Private session cookie, CSRF-origin check, protected server APIs, CSP nonce,
  and production-safe secret handling.
- PostgreSQL-backed provider quote capture, gold trade activation, early close,
  and realized P&L records.
- Five-day mandatory-close timestamp calculated at entry; active and completed
  trade records are separated.
- Telegram message/reference stored as evidence for a provider quote or close.
- Railway build, migration, health-check, and start configuration.

GoldPriceZ is intentionally kept as a comparison reference rather than an
automatic settlement source. Add an approved structured data feed only after
confirming its licence and access method.

When configuring that feed in Railway, set `GOLD_REFERENCE_FEED_URL`,
`GOLD_REFERENCE_API_KEY`, and (if needed) `GOLD_REFERENCE_API_KEY_HEADER`. The
endpoint must return JSON with a positive `price`, `priceUsd`, or `price_usd`
value (top-level or inside `data`). Its price is displayed only to authorized
users and never determines local trade settlement.

## Local setup

```bash
npm install
cp .env.example .env.local
# Set SESSION_SECRET and ALLOW_LOCAL_DEMO=true for a local UI preview.
npm run lint
npm run build
```

To use real records locally, set `DATABASE_URL` to a PostgreSQL database and run:

```bash
npm run db:migrate
```

## Railway deployment

1. Create a private GitHub repository and push this project. Do not commit `.env.local`.
2. In Railway, create a PostgreSQL service and a GitHub-connected web service.
3. Add these web-service variables:

   - `DATABASE_URL=${{Postgres.DATABASE_URL}}`
   - `DATABASE_SSL_MODE=no-verify` — required only for Railway's private Postgres certificate
   - `TELEGRAM_BOT_TOKEN` — the BotFather token (secret)
   - `SESSION_SECRET` — a long random secret (secret)
   - `AUTHORIZED_TELEGRAM_IDS` — comma-separated numeric Telegram IDs allowed to enter
   - `NODE_ENV=production`
   - `ALLOW_LOCAL_DEMO=false`

4. Railway runs `npm run db:migrate` before deployment, then starts the app.
5. Generate a Railway domain. Set that HTTPS domain as the Mini App URL in
   BotFather, then open it through the bot.
6. Test an unapproved account first: it must see only `Access not approved`.
   Test an approved account next, then record a test provider quote and trade.

## Security notes

- `initDataUnsafe` is never trusted. The backend validates the signed Telegram
  `initData` payload and rejects old/replayed payloads.
- Usernames are display labels only; authorization uses the Telegram numeric ID.
- All data queries include the authenticated owner’s Telegram ID.
- Keep the repository private and enable MFA on GitHub, Railway, and the owner’s
  Telegram account.
- The platform does not custody money, transfer money, or execute provider trades.

## Production prerequisites

- Telegram bot token and the owner’s numeric Telegram ID
- Railway project and PostgreSQL service
- Private GitHub repository
- Written permission/terms for any automated external price feed
