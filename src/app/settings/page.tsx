import { useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  Bell,
  ChevronDown,
  Coins,
  Database,
  Github,
  Loader2,
  RefreshCw,
  Sparkles,
  Zap,
  Eye,
  EyeOff,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { displayCurrency, formatUsdPrice } from "@/lib/pricing";
import { Toggle } from "@/components/ui";
import { useSettings, useUpdateSettings, useDataPath, useRefreshExchangeRate } from "@/hooks/useSettings";
import type { ModelPriceCurrency } from "@/types";

type ModelPriceReference = {
  input: number;
  output: number;
  cacheCreate: number | null;
  cacheHit: number | null;
  currency: ModelPriceCurrency;
};

const MODEL_PRICE_REFERENCES: Array<{
  modelId: string;
  name: string;
  price: ModelPriceReference;
}> = [
  { modelId: "claude-fable-5", name: "Claude Fable 5", price: usd(10, 50, 12.5, 1) },
  { modelId: "claude-mythos-5", name: "Claude Mythos 5", price: usd(10, 50, 12.5, 1) },
  { modelId: "claude-opus-4-8", name: "Claude Opus 4.8", price: usd(5, 25, 6.25, 0.5) },
  { modelId: "claude-opus-4-7", name: "Claude Opus 4.7", price: usd(5, 25, 6.25, 0.5) },
  { modelId: "claude-opus-4-6-20260206", name: "Claude Opus 4.6", price: usd(5, 25, 6.25, 0.5) },
  { modelId: "claude-sonnet-4-6-20260217", name: "Claude Sonnet 4.6", price: usd(3, 15, 3.75, 0.3) },
  { modelId: "claude-opus-4-5-20251101", name: "Claude Opus 4.5", price: usd(5, 25, 6.25, 0.5) },
  { modelId: "claude-sonnet-4-5-20250929", name: "Claude Sonnet 4.5", price: usd(3, 15, 3.75, 0.3) },
  { modelId: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5", price: usd(1, 5, 1.25, 0.1) },
  { modelId: "claude-opus-4-20250514", name: "Claude Opus 4", price: usd(15, 75, 18.75, 1.5) },
  { modelId: "claude-opus-4-1-20250805", name: "Claude Opus 4.1", price: usd(15, 75, 18.75, 1.5) },
  { modelId: "claude-sonnet-4-20250514", name: "Claude Sonnet 4", price: usd(3, 15, 3.75, 0.3) },
  { modelId: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku", price: usd(0.8, 4, 1, 0.08) },
  { modelId: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet", price: usd(3, 15, 3.75, 0.3) },
  { modelId: "gpt-5.5", name: "GPT-5.5", price: usd(5, 30, 0, 0.5) },
  { modelId: "gpt-5.4", name: "GPT-5.4", price: usd(2.5, 15, 0, 0.25) },
  { modelId: "gpt-5.4-mini", name: "GPT-5.4 Mini", price: usd(0.75, 4.5, 0, 0.075) },
  { modelId: "gpt-5.4-nano", name: "GPT-5.4 Nano", price: usd(0.2, 1.25, 0, 0.02) },
  { modelId: "gpt-5.2", name: "GPT-5.2", price: usd(1.75, 14, 0, 0.175) },
  { modelId: "gpt-5.2-codex", name: "GPT-5.2 Codex", price: usd(1.75, 14, 0, 0.175) },
  { modelId: "gpt-5.3-codex", name: "GPT-5.3 Codex", price: usd(1.75, 14, 0, 0.175) },
  { modelId: "gpt-5.1", name: "GPT-5.1", price: usd(1.25, 10, 0, 0.125) },
  { modelId: "gpt-5.1-codex", name: "GPT-5.1 Codex", price: usd(1.25, 10, 0, 0.125) },
  { modelId: "gpt-5", name: "GPT-5", price: usd(1.25, 10, 0, 0.125) },
  { modelId: "gpt-5-codex", name: "GPT-5 Codex", price: usd(1.25, 10, 0, 0.125) },
  { modelId: "gpt-5-mini", name: "GPT-5 Mini", price: usd(0.25, 2, 0, 0.025) },
  { modelId: "gpt-5-nano", name: "GPT-5 Nano", price: usd(0.05, 0.4, 0, 0.005) },
  { modelId: "codex-mini", name: "Codex Mini", price: usd(0.75, 3, 0, 0.025) },
  { modelId: "o3", name: "OpenAI o3", price: usd(2, 8, 0, 0.5) },
  { modelId: "o3-pro", name: "OpenAI o3-pro", price: usd(20, 80, 0, 0) },
  { modelId: "o3-mini", name: "OpenAI o3-mini", price: usd(0.55, 2.2, 0, 0.55) },
  { modelId: "o4-mini", name: "OpenAI o4-mini", price: usd(1.1, 4.4, 0, 0.275) },
  { modelId: "o1", name: "OpenAI o1", price: usd(15, 60, 0, 7.5) },
  { modelId: "o1-mini", name: "OpenAI o1-mini", price: usd(0.55, 2.2, 0, 0.55) },
  { modelId: "gpt-4.1", name: "GPT-4.1", price: usd(2, 8, 0, 0.5) },
  { modelId: "gpt-4.1-mini", name: "GPT-4.1 Mini", price: usd(0.4, 1.6, 0, 0.1) },
  { modelId: "gpt-4.1-nano", name: "GPT-4.1 Nano", price: usd(0.1, 0.4, 0, 0.025) },
  { modelId: "gemini-3.5-flash", name: "Gemini 3.5 Flash", price: usd(1.5, 9, 0, 0.15) },
  { modelId: "gemini-3.1-pro-preview", name: "Gemini 3.1 Pro Preview", price: usd(2, 12, 0, 0.2) },
  { modelId: "gemini-3.1-flash-lite", name: "Gemini 3.1 Flash Lite", price: usd(0.25, 1.5, 0, 0.025) },
  { modelId: "gemini-3-pro-preview", name: "Gemini 3 Pro Preview", price: usd(2, 12, 0, 0.2) },
  { modelId: "gemini-3-flash-preview", name: "Gemini 3 Flash Preview", price: usd(0.5, 3, 0, 0.05) },
  { modelId: "gemini-2.5-pro", name: "Gemini 2.5 Pro", price: usd(1.25, 10, 0, 0.125) },
  { modelId: "gemini-2.5-flash", name: "Gemini 2.5 Flash", price: usd(0.3, 2.5, 0, 0.03) },
  { modelId: "gemini-2.5-flash-lite", name: "Gemini 2.5 Flash Lite", price: usd(0.1, 0.4, 0, 0.01) },
  { modelId: "gemini-2.0-flash", name: "Gemini 2.0 Flash", price: usd(0.1, 0.4, 0, 0.025) },
  { modelId: "step-3.7-flash", name: "Step 3.7 Flash", price: usd(0.19, 1.13, 0, 0.04) },
  { modelId: "step-3.5-flash", name: "Step 3.5 Flash", price: usd(0.1, 0.3, 0, 0.02) },
  { modelId: "doubao-seed-code", name: "Doubao Seed Code", price: usd(0.17, 1.11, 0, 0.02) },
  { modelId: "doubao-seed-2-0-pro", name: "Doubao Seed 2.0 Pro", price: usd(0.47, 2.37, 0, 0.09) },
  { modelId: "doubao-seed-2-0-code", name: "Doubao Seed 2.0 Code", price: usd(0.47, 2.37, 0, 0.09) },
  { modelId: "doubao-seed-2-0-lite", name: "Doubao Seed 2.0 Lite", price: usd(0.08, 0.5, 0, 0.017) },
  { modelId: "doubao-seed-2-0-mini", name: "Doubao Seed 2.0 Mini", price: usd(0.03, 0.31, 0, 0.0056) },
  { modelId: "deepseek-v3.2", name: "DeepSeek V3.2", price: usd(0.28, 0.42, 0, 0.028) },
  { modelId: "deepseek-v3.1", name: "DeepSeek V3.1", price: usd(0.55, 1.67, 0, 0.055) },
  { modelId: "deepseek-v3", name: "DeepSeek V3", price: usd(0.28, 1.11, 0, 0.028) },
  { modelId: "deepseek-chat", name: "DeepSeek Chat", price: usd(0.27, 1.1, 0, 0.07) },
  { modelId: "deepseek-reasoner", name: "DeepSeek Reasoner", price: usd(0.55, 2.19, 0, 0.14) },
  { modelId: "deepseek-v4-flash", name: "DeepSeek V4 Flash", price: usd(0.14, 0.28, 0, 0.0028) },
  { modelId: "deepseek-v4-pro", name: "DeepSeek V4 Pro", price: usd(0.435, 0.87, 0, 0.003625) },
  { modelId: "kimi-k2-thinking", name: "Kimi K2 Thinking", price: usd(0.55, 2.2, 0, 0.1) },
  { modelId: "kimi-k2-0905", name: "Kimi K2", price: usd(0.55, 2.2, 0, 0.1) },
  { modelId: "kimi-k2-turbo", name: "Kimi K2 Turbo", price: usd(1.11, 8.06, 0, 0.14) },
  { modelId: "kimi-k2.5", name: "Kimi K2.5", price: usd(0.6, 3, 0, 0.1) },
  { modelId: "kimi-k2.6", name: "Kimi K2.6", price: usd(0.95, 4, 0, 0.16) },
  { modelId: "kimi-k2.7-code", name: "Kimi K2.7 Code", price: usd(0.95, 4, 0, 0.19) },
  { modelId: "minimax-m2.1", name: "MiniMax M2.1", price: usd(0.27, 0.95, 0, 0.03) },
  { modelId: "minimax-m2.1-lightning", name: "MiniMax M2.1 Lightning", price: usd(0.27, 2.33, 0, 0.03) },
  { modelId: "minimax-m2", name: "MiniMax M2", price: usd(0.27, 0.95, 0, 0.03) },
  { modelId: "minimax-m2.5", name: "MiniMax M2.5", price: usd(0.15, 0.95, 0, 0.03) },
  { modelId: "minimax-m2.5-lightning", name: "MiniMax M2.5 Lightning", price: usd(0.3, 2.4, 0, 0.03) },
  { modelId: "minimax-m2.7", name: "MiniMax M2.7", price: usd(0.3, 1.2, 0.375, 0.06) },
  { modelId: "minimax-m2.7-highspeed", name: "MiniMax M2.7 Highspeed", price: usd(0.6, 2.4, 0.375, 0.06) },
  { modelId: "minimax-m3", name: "MiniMax M3", price: usd(0.6, 2.4, 0, 0.12) },
  { modelId: "glm-4.7", name: "GLM-4.7", price: usd(0.6, 2.2, 0, 0.11) },
  { modelId: "glm-4.6", name: "GLM-4.6", price: usd(0.6, 2.2, 0, 0.11) },
  { modelId: "glm-5", name: "GLM-5", price: usd(1, 3.2, 0, 0.2) },
  { modelId: "glm-5.1", name: "GLM-5.1", price: usd(1.4, 4.4, 0, 0.26) },
  { modelId: "mimo-v2-flash", name: "MiMo V2 Flash", price: usd(0.09, 0.29, 0, 0.009) },
  { modelId: "mimo-v2-pro", name: "MiMo V2 Pro", price: usd(0.435, 0.87, 0, 0.0036) },
  { modelId: "mimo-v2.5", name: "MiMo V2.5", price: usd(0.14, 0.29, 0, 0.0028) },
  { modelId: "mimo-v2.5-pro", name: "MiMo V2.5 Pro", price: usd(0.435, 0.87, 0, 0.0036) },
  { modelId: "qwen3.7-max", name: "Qwen3.7 Max", price: usd(2.5, 7.5, 0, 0.25) },
  { modelId: "qwen3.7-plus", name: "Qwen3.7 Plus", price: usd(0.4, 1.6, 0, 0.08) },
  { modelId: "qwen3.6-plus", name: "Qwen3.6 Plus", price: usd(0.325, 1.95, 0, 0.065) },
  { modelId: "qwen3.5-plus", name: "Qwen3.5 Plus", price: usd(0.26, 1.56, 0, 0.052) },
  { modelId: "qwen3-max", name: "Qwen3 Max", price: usd(0.78, 3.9, 0, 0) },
  { modelId: "qwen3-235b-a22b", name: "Qwen3 235B-A22B", price: usd(0.7, 8.4, 0, 0) },
  { modelId: "qwen3-coder-plus", name: "Qwen3 Coder Plus", price: usd(0.65, 3.25, 0, 0.13) },
  { modelId: "qwen3-coder-480b", name: "Qwen3 Coder 480B", price: usd(0.65, 3.25, 0, 0) },
  { modelId: "qwen3-coder-flash", name: "Qwen3 Coder Flash", price: usd(0.195, 0.975, 0, 0.039) },
  { modelId: "qwen3-coder-next", name: "Qwen3 Coder Next", price: usd(0.12, 0.75, 0, 0) },
  { modelId: "qwq-plus", name: "QwQ Plus", price: usd(0.8, 2.4, 0, 0) },
  { modelId: "qwq-32b", name: "QwQ 32B", price: usd(0.2, 0.6, 0, 0) },
  { modelId: "qwen3-32b", name: "Qwen3 32B", price: usd(0.16, 0.64, 0, 0) },
  { modelId: "grok-4.3", name: "Grok 4.3", price: usd(1.25, 2.5, 0, 0.2) },
  { modelId: "grok-4.20-0309-reasoning", name: "Grok 4.20 Reasoning", price: usd(1.25, 2.5, 0, 0.2) },
  { modelId: "grok-4.20-0309-non-reasoning", name: "Grok 4.20", price: usd(1.25, 2.5, 0, 0.2) },
  { modelId: "grok-4-1-fast-reasoning", name: "Grok 4.1 Fast Reasoning", price: usd(0.2, 0.5, 0, 0.05) },
  { modelId: "grok-4-1-fast-non-reasoning", name: "Grok 4.1 Fast", price: usd(0.2, 0.5, 0, 0.05) },
  { modelId: "grok-4", name: "Grok 4", price: usd(3, 15, 0, 0.75) },
  { modelId: "grok-code-fast-1", name: "Grok Build 0.1 (Code Fast Alias)", price: usd(1, 2, 0, 0.2) },
  { modelId: "grok-build-0.1", name: "Grok Build 0.1", price: usd(1, 2, 0, 0.2) },
  { modelId: "grok-3", name: "Grok 3", price: usd(3, 15, 0, 0.75) },
  { modelId: "grok-3-mini", name: "Grok 3 Mini", price: usd(0.25, 0.5, 0, 0.075) },
  { modelId: "mistral-medium-3.5", name: "Mistral Medium 3.5", price: usd(1.5, 7.5, 0, 0) },
  { modelId: "mistral-small-4", name: "Mistral Small 4", price: usd(0.1, 0.3, 0, 0.01) },
  { modelId: "devstral-small-2-2512", name: "Devstral Small 2", price: usd(0.1, 0.3, 0, 0.01) },
  { modelId: "magistral-small", name: "Magistral Small", price: usd(0.5, 1.5, 0, 0) },
  { modelId: "codestral-2508", name: "Codestral", price: usd(0.3, 0.9, 0, 0.03) },
  { modelId: "devstral-small-1.1", name: "Devstral Small 1.1", price: usd(0.07, 0.28, 0, 0.01) },
  { modelId: "devstral-2-2512", name: "Devstral 2", price: usd(0.4, 2, 0, 0.04) },
  { modelId: "devstral-medium", name: "Devstral Medium", price: usd(0.4, 2, 0, 0.04) },
  { modelId: "mistral-large-3-2512", name: "Mistral Large 3", price: usd(0.5, 1.5, 0, 0.05) },
  { modelId: "mistral-medium-3.1", name: "Mistral Medium 3.1", price: usd(0.4, 2, 0, 0.04) },
  { modelId: "mistral-small-3.2-24b", name: "Mistral Small 3.2", price: usd(0.075, 0.2, 0, 0.01) },
  { modelId: "magistral-medium", name: "Magistral Medium", price: usd(2, 5, 0, 0) },
  { modelId: "command-a", name: "Cohere Command A", price: usd(2.5, 10, 0, 0) },
  { modelId: "command-r-plus", name: "Cohere Command R+", price: usd(2.5, 10, 0, 0) },
  { modelId: "command-r", name: "Cohere Command R", price: usd(0.15, 0.6, 0, 0) },
];

const APP_VERSION = "0.0.1";
const GITHUB_URL = "https://github.com/520zym/ZeroDesk";

function usd(input: number, output: number, cacheCreate: number, cacheHit: number): ModelPriceReference {
  return { input, output, cacheCreate, cacheHit, currency: "USD" };
}

export default function SettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const { mutate: updateSettings } = useUpdateSettings();
  const refreshExchangeRate = useRefreshExchangeRate();
  const { data: dataPath } = useDataPath();
  const [modelPricingOpen, setModelPricingOpen] = useState(true);

  const handlePriceCurrencyChange = (currency: ModelPriceCurrency) => {
    updateSettings({ price_currency: currency });
    if (currency === "CNY") {
      refreshExchangeRate.mutate();
    }
  };

  if (isLoading || !settings) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={24} className="animate-spin text-text-muted" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden px-4 sm:px-6 pt-5 pb-6">
      <div
        className="shrink-0 mb-5"
        style={{ animation: "fade-in 0.3s ease-out" }}
      >
        <p className="text-[0.82rem] text-text-secondary">应用偏好、数据存储与通知管理</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="w-full max-w-3xl 2xl:max-w-4xl space-y-6">
          {/* General Settings */}
          <SettingsSection title="常规设置" delay={60}>
            <SettingsRow label="界面语言">
              <div className="relative">
                <select
                  value={settings.language}
                  onChange={(e) => updateSettings({ language: e.target.value })}
                  className={cn(
                    "appearance-none rounded-lg border border-border-light bg-bg px-3 py-2 pr-8",
                    "text-[0.78rem] text-text",
                    "focus:outline-none focus:border-primary cursor-pointer"
                  )}
                >
                  <option value="zh-CN">简体中文</option>
                  <option value="en-US">English</option>
                  <option value="ja-JP">日本語</option>
                </select>
                <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </SettingsRow>
            <SettingsRow label="主题模式">
              <div className="inline-flex items-center gap-1 bg-bg rounded-lg p-1">
                {[
                  { id: "light", label: "浅色" },
                  { id: "dark", label: "深色" },
                  { id: "auto", label: "自动" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => updateSettings({ theme: opt.id })}
                    className={cn(
                      "px-3 py-1 rounded-md text-[0.75rem] font-medium transition-all cursor-pointer",
                      settings.theme === opt.id
                        ? "bg-surface text-text shadow-sm"
                        : "text-text-muted hover:text-text-secondary"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </SettingsRow>
          </SettingsSection>

          {/* Data & Storage */}
          <SettingsSection
            title="数据与存储"
            icon={<Database size={15} className="text-sage" />}
            delay={120}
          >
            <SettingsRow label="本地数据加密">
              <Toggle
                checked={settings.encryption}
                onChange={(v) => updateSettings({ encryption: v })}
              />
            </SettingsRow>
            <SettingsRow label="自动归档天数">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={settings.archive_days}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val) && val > 0) {
                      updateSettings({ archive_days: val });
                    }
                  }}
                  className={cn(
                    "w-[80px] rounded-lg border border-border-light bg-bg px-3 py-2",
                    "text-[0.78rem] text-text text-center",
                    "focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20",
                    "transition-colors"
                  )}
                />
                <span className="text-[0.75rem] text-text-muted">天后自动归档</span>
              </div>
            </SettingsRow>
            <SettingsRow label="数据存储路径">
              <span className="text-[0.75rem] text-text-muted font-mono">
                {dataPath ?? settings.data_path ?? "..."}
              </span>
            </SettingsRow>
          </SettingsSection>

          {/* Model Pricing */}
          <SettingsSection
            title="模型价格"
            icon={<Coins size={15} className="text-sand" />}
            delay={150}
            collapsible
            expanded={modelPricingOpen}
            onToggle={() => setModelPricingOpen((open) => !open)}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[0.72rem] text-text-muted">
                  参考价按每百万 token 计价，拆分为输入、输出、缓存创建、缓存命中。
                </p>
                <a
                  href="/models"
                  className="shrink-0 text-[0.72rem] font-medium text-primary hover:underline"
                >
                  前往模型与路由
                </a>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-light bg-bg-alt/40 px-3 py-2.5">
                <div className="flex items-center gap-2">
                  {(["USD", "CNY"] as const).map((currency) => (
                    <button
                      key={currency}
                      type="button"
                      onClick={() => handlePriceCurrencyChange(currency)}
                      className={cn(
                        "rounded-md px-3 py-1.5 text-[0.72rem] font-medium transition-colors",
                        displayCurrency(settings) === currency
                          ? "bg-surface text-primary shadow-sm"
                          : "text-text-muted hover:text-text"
                      )}
                    >
                      {currency === "USD" ? "美元" : "人民币"}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-[0.7rem] text-text-muted">
                  <span>USD/CNY {settings.usd_cny_rate.toFixed(4)}</span>
                  <button
                    type="button"
                    onClick={() => refreshExchangeRate.mutate()}
                    disabled={refreshExchangeRate.isPending}
                    className="inline-flex items-center gap-1 rounded-md border border-border-light bg-surface px-2 py-1 font-medium text-text-secondary transition-colors hover:text-primary disabled:opacity-60"
                  >
                    <RefreshCw size={12} className={cn(refreshExchangeRate.isPending && "animate-spin")} />
                    刷新汇率
                  </button>
                </div>
              </div>

              <div className="overflow-hidden rounded-lg border border-border-light">
                <div className="grid grid-cols-[1.4fr_0.9fr_0.9fr_0.9fr_0.9fr] gap-3 bg-bg-alt/60 px-3 py-2 text-[0.68rem] font-medium text-text-muted">
                  <span>模型</span>
                  <span className="text-right">输入</span>
                  <span className="text-right">输出</span>
                  <span className="text-right">缓存创建</span>
                  <span className="text-right">缓存命中</span>
                </div>
                <div className="max-h-[420px] divide-y divide-border-light overflow-y-auto">
                  {MODEL_PRICE_REFERENCES.map((entry) => (
                    <ModelPriceRow key={entry.modelId} entry={entry} settings={settings} />
                  ))}
                </div>
              </div>
            </div>
          </SettingsSection>

          {/* Notification Settings */}
          <SettingsSection
            title="通知"
            icon={<Bell size={15} className="text-lavender" />}
            delay={180}
          >
            <SettingsRow label="任务完成通知">
              <Toggle
                checked={settings.task_notify}
                onChange={(v) => updateSettings({ task_notify: v })}
              />
            </SettingsRow>
            <SettingsRow label="失败告警通知">
              <Toggle
                checked={settings.fail_notify}
                onChange={(v) => updateSettings({ fail_notify: v })}
              />
            </SettingsRow>
            <SettingsRow label="超预算告警">
              <Toggle
                checked={settings.budget_notify}
                onChange={(v) => updateSettings({ budget_notify: v })}
              />
            </SettingsRow>
          </SettingsSection>

          {/* Skills Marketplace */}
          <SettingsSection
            title="Skills 市场"
            icon={<Sparkles size={15} className="text-primary" />}
            delay={240}
          >
            <SettingsRow label="SkillsMP 接口地址">
              <input
                type="url"
                value={settings.skillsmp_api_base_url || "https://skillsmp.com"}
                onChange={(e) =>
                  updateSettings({
                    skillsmp_api_base_url: e.target.value.trim() || "https://skillsmp.com",
                  })
                }
                placeholder="https://skillsmp.com"
                className={cn(
                  "w-[280px] rounded-lg border border-border-light bg-bg px-3 py-2",
                  "text-[0.78rem] text-text font-mono",
                  "focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20",
                  "transition-colors placeholder:text-text-muted/50"
                )}
              />
            </SettingsRow>
            <SettingsRow label="SkillsMP API Key">
              <ApiKeyInput
                value={settings.skillsmp_api_key ?? ""}
                onChange={(v) => updateSettings({ skillsmp_api_key: v || undefined })}
              />
            </SettingsRow>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[0.72rem] text-text-muted">
                前往
              </span>
              <button
                onClick={() => openUrl("https://skillsmp.com/docs/api#authentication")}
                className="inline-flex items-center gap-1 text-[0.72rem] text-primary hover:underline cursor-pointer border-none bg-transparent p-0 font-inherit"
              >
                skillsmp.com/docs/api#authentication
                <ExternalLink size={10} />
              </button>
              <span className="text-[0.72rem] text-text-muted">
                查看认证方式与 API Key 说明
              </span>
            </div>
          </SettingsSection>

          {/* About */}
          <SettingsSection title="关于" delay={300}>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-lavender shadow-lg shadow-primary/20">
                  <Zap size={26} className="text-white" strokeWidth={2.4} />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-[1.05rem] font-bold leading-none text-text">
                      ZeroDesk
                    </h4>
                    <span className="rounded-full border border-border-light bg-bg-alt px-2 py-0.5 text-[0.68rem] font-medium text-text-secondary">
                      v{APP_VERSION}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[0.74rem] font-medium uppercase tracking-[0.12em] text-text-muted">
                    Agent Workbench
                  </p>
                  <p className="mt-2 max-w-[28rem] text-[0.75rem] leading-relaxed text-text-muted">
                    多 Agent 任务编排工作台，用于配置 Agent、组建团队并自动规划执行复杂任务。
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => openUrl(GITHUB_URL)}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-border-light bg-surface px-3",
                  "text-[0.74rem] font-medium text-text-secondary shadow-sm transition-all",
                  "hover:border-primary/30 hover:bg-primary-light hover:text-primary"
                )}
              >
                <Github size={15} />
                GitHub
                <ExternalLink size={12} />
              </button>
            </div>
          </SettingsSection>

          {/* Hint */}
          <p className="text-[0.72rem] text-text-muted px-1">
            模型服务商凭证与调度策略请前往
            <a href="/models" className="text-primary hover:underline ml-1">模型与路由</a>
            页面配置
          </p>
        </div>
      </div>
    </div>
  );
}

function ModelPriceRow({
  entry,
  settings,
}: {
  entry: {
    modelId: string;
    name: string;
    price: ModelPriceReference;
  };
  settings: {
    price_currency: ModelPriceCurrency;
    usd_cny_rate: number;
  };
}) {
  return (
    <div className="grid grid-cols-[1.4fr_0.9fr_0.9fr_0.9fr_0.9fr] items-center gap-3 px-3 py-2.5">
      <div className="min-w-0">
        <div className="truncate text-[0.76rem] font-medium text-text">{entry.name}</div>
      </div>
      <PriceCell value={entry.price.input} settings={settings} />
      <PriceCell value={entry.price.output} settings={settings} />
      <PriceCell value={entry.price.cacheCreate} settings={settings} />
      <PriceCell value={entry.price.cacheHit} settings={settings} />
    </div>
  );
}

function PriceCell({
  value,
  settings,
}: {
  value: number | null;
  settings: {
    price_currency: ModelPriceCurrency;
    usd_cny_rate: number;
  };
}) {
  const currency = displayCurrency(settings);
  return (
    <div className="text-right font-mono text-[0.72rem] text-text-secondary">
      {value == null ? "-" : (
        <>
          {formatUsdPrice(value, settings)}
          <span className="ml-1 text-[0.62rem] text-text-muted">{currency}</span>
        </>
      )}
    </div>
  );
}

function SettingsSection({
  title,
  icon,
  delay = 0,
  collapsible = false,
  expanded = true,
  onToggle,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  delay?: number;
  collapsible?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="bg-surface border border-border-light rounded-xl p-4 sm:p-5"
      style={{ animation: `fade-in 0.3s ease-out ${delay}ms both` }}
    >
      <div
        role={collapsible ? "button" : undefined}
        tabIndex={collapsible ? 0 : undefined}
        onClick={collapsible ? onToggle : undefined}
        onKeyDown={
          collapsible
            ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onToggle?.();
                }
              }
            : undefined
        }
        className={cn(
          "flex items-center gap-2 border-b border-border-light",
          collapsible && "cursor-pointer rounded-lg transition-colors hover:bg-bg-alt/50",
          expanded ? "mb-4 pb-3" : "pb-0 border-b-0"
        )}
        title={collapsible ? (expanded ? "折叠" : "展开") : undefined}
      >
        <div className="flex flex-1 items-center gap-2">
          {icon}
          <h3 className="text-[0.85rem] font-semibold text-text">{title}</h3>
        </div>
        {collapsible && (
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md text-text-muted transition-colors group-hover:text-text">
            <ChevronDown size={14} className={cn("transition-transform", expanded && "rotate-180")} />
          </span>
        )}
      </div>
      {expanded && <div className="space-y-4">{children}</div>}
    </div>
  );
}

function SettingsRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-[0.78rem] text-text-secondary">{label}</span>
      {children}
    </div>
  );
}

function ApiKeyInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative flex items-center gap-1.5">
      <input
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="sk_live_..."
        className={cn(
          "w-[280px] rounded-lg border border-border-light bg-bg px-3 py-2 pr-9",
          "text-[0.78rem] text-text font-mono",
          "focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20",
          "transition-colors placeholder:text-text-muted/50"
        )}
      />
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition-colors cursor-pointer bg-transparent border-none p-0"
      >
        {visible ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  );
}
