-- Add display currency and USD/CNY exchange rate for model prices and costs
ALTER TABLE system_settings ADD COLUMN price_currency TEXT NOT NULL DEFAULT 'USD' CHECK(price_currency IN ('USD','CNY'));
ALTER TABLE system_settings ADD COLUMN usd_cny_rate REAL NOT NULL DEFAULT 7.2;
ALTER TABLE system_settings ADD COLUMN exchange_rate_updated_at TEXT;
