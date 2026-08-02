import crypto from "node:crypto";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

type TelegramUser = {
  id: number | string;
  first_name?: string;
  username?: string;
};

export type AuthorizedUser = {
  telegramId: string;
  displayName: string;
  role: "owner" | "trader";
};

function requiredSecret(name: "TELEGRAM_BOT_TOKEN" | "SESSION_SECRET") {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function authorizedIds() {
  return new Set(
    (process.env.AUTHORIZED_TELEGRAM_IDS ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
  );
}

function parseInitData(initData: string) {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  const authDate = params.get("auth_date");
  const user = params.get("user");
  if (!hash || !authDate || !user) throw new Error("Telegram login data is incomplete");

  const entries = [...params.entries()]
    .filter(([key]) => key !== "hash")
    .sort(([left], [right]) => left.localeCompare(right));
  const dataCheckString = entries.map(([key, value]) => `${key}=${value}`).join("\n");
  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(requiredSecret("TELEGRAM_BOT_TOKEN"))
    .digest();
  const expectedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
  const expected = Buffer.from(expectedHash, "hex");
  const received = Buffer.from(hash, "hex");
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
    throw new Error("Telegram login data could not be validated");
  }

  const authDateSeconds = Number(authDate);
  const maxAgeSeconds = 5 * 60;
  const authAgeSeconds = Date.now() / 1000 - authDateSeconds;
  if (!Number.isFinite(authDateSeconds) || authAgeSeconds > maxAgeSeconds || authAgeSeconds < -30) {
    throw new Error("Telegram login data has expired");
  }

  return JSON.parse(user) as TelegramUser;
}

export function authorizeTelegram(initData: string): AuthorizedUser {
  const user = parseInitData(initData);
  const telegramId = String(user.id);
  if (!authorizedIds().has(telegramId)) throw new Error("Your Telegram account is not approved");
  return {
    telegramId,
    displayName: user.first_name || user.username || "Authorized trader",
    role: "owner"
  };
}

export function localDemoUser(): AuthorizedUser | null {
  if (process.env.NODE_ENV === "production" || process.env.ALLOW_LOCAL_DEMO !== "true") return null;
  return { telegramId: "local-demo", displayName: "Local preview", role: "owner" };
}

export function createSession(user: AuthorizedUser) {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS;
  const payload = Buffer.from(JSON.stringify({ ...user, expiresAt })).toString("base64url");
  const signature = crypto.createHmac("sha256", requiredSecret("SESSION_SECRET")).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function readSession(value: string | undefined): AuthorizedUser | null {
  if (!value) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;
  try {
    const expected = crypto.createHmac("sha256", requiredSecret("SESSION_SECRET")).update(payload).digest("base64url");
    if (expected.length !== signature.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return null;
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as AuthorizedUser & { expiresAt: number };
    if (!Number.isFinite(parsed.expiresAt) || parsed.expiresAt * 1000 < Date.now()) return null;
    if (parsed.role !== "owner" && parsed.role !== "trader") return null;
    return { telegramId: parsed.telegramId, displayName: parsed.displayName, role: parsed.role };
  } catch {
    return null;
  }
}

export function requireAuthorizedRequest(request: Request): AuthorizedUser {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && host && new URL(origin).host !== host) throw new Error("Invalid request origin");
  const cookie = request.headers.get("cookie")?.split(";").map((item) => item.trim()).find((item) => item.startsWith("tgtrading_session="));
  const session = readSession(cookie?.slice("tgtrading_session=".length));
  if (!session) throw new Error("Access not approved");
  return session;
}
