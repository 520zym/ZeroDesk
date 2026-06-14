import type { ModelPriceCurrency, SystemSettings } from "@/types";

export function displayCurrency(settings?: Pick<SystemSettings, "price_currency"> | null): ModelPriceCurrency {
  return settings?.price_currency === "CNY" ? "CNY" : "USD";
}

export function usdToDisplay(
  usd: number,
  settings?: Pick<SystemSettings, "price_currency" | "usd_cny_rate"> | null,
): number {
  const value = Number.isFinite(usd) ? usd : 0;
  if (displayCurrency(settings) === "CNY") {
    const rate = settings?.usd_cny_rate && settings.usd_cny_rate > 0 ? settings.usd_cny_rate : 7.2;
    return value * rate;
  }
  return value;
}

export function currencySymbol(currency: ModelPriceCurrency): string {
  return currency === "CNY" ? "¥" : "$";
}

export function formatPriceValue(price: number): string {
  if (price === 0) return "0";
  if (price < 1) return price.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
  return price.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

export function formatUsdPrice(
  usd: number | null | undefined,
  settings?: Pick<SystemSettings, "price_currency" | "usd_cny_rate"> | null,
): string {
  if (usd == null) return "-";
  const currency = displayCurrency(settings);
  return `${currencySymbol(currency)}${formatPriceValue(usdToDisplay(usd, settings))}`;
}

export function formatUsdCost(
  usd: number | null | undefined,
  settings?: Pick<SystemSettings, "price_currency" | "usd_cny_rate"> | null,
): string {
  if (usd == null) return "-";
  const currency = displayCurrency(settings);
  return `${currencySymbol(currency)}${usdToDisplay(usd, settings).toFixed(4)} ${currency}`;
}
