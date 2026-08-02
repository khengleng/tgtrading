export function requiredText(value: unknown, label: string, limit = 160) {
  if (typeof value !== "string") throw new Error(`${label} is required`);
  const result = value.trim();
  if (!result || result.length > limit) throw new Error(`${label} is invalid`);
  return result;
}

export function positiveInteger(value: unknown, label: string, maximum = 100) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1 || number > maximum) throw new Error(`${label} is invalid`);
  return number;
}

export function positiveMoney(value: unknown, label: string) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0 || number > 1_000_000_000) throw new Error(`${label} is invalid`);
  return Math.round(number * 100) / 100;
}
