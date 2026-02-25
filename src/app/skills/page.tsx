import { useState } from "react";
import {
  Search,
  ChevronDown,
  Settings,
  Trash2,
  ArrowUpCircle,
  Package,
  Star,
  ExternalLink,
  Loader2,
  KeyRound,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs } from "@/components/ui";
import { useSkills, useMarketplaceSearch } from "@/hooks/useSkills";
import { useSettings } from "@/hooks/useSettings";
import type { Skill, MarketplaceSkill } from "@/types";

type Scope = "global" | "team" | "agent";

const TABS = [
  { id: "all", label: "全部已安装" },
  { id: "update", label: "可升级" },
  { id: "market", label: "市场" },
];

const SCOPE_FILTERS = [
  { id: "all", label: "所有范围" },
  { id: "global", label: "全局" },
  { id: "team", label: "团队" },
  { id: "agent", label: "Agent" },
];

const scopeGroups: { scope: Scope; label: string; color: string }[] = [
  { scope: "global", label: "全局 Skills", color: "bg-primary" },
  { scope: "team", label: "团队 Skills", color: "bg-sage" },
  { scope: "agent", label: "Agent 私有", color: "bg-lavender" },
];

const SCOPE_STYLE: Record<string, { label: string; bg: string }> = {
  global: { label: "全局", bg: "bg-primary-light text-primary-active" },
  team: { label: "团队", bg: "bg-sage-light text-[#5a7a6b]" },
  agent: { label: "Agent", bg: "bg-lavender-light text-[#6f5f80]" },
};

export default function SkillsPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [scopeFilter, setScopeFilter] = useState("all");
  const [marketQuery, setMarketQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");

  const { data: installedSkills = [], isLoading: skillsLoading } = useSkills();
  const { data: settings } = useSettings();

  const hasApiKey = !!settings?.skillsmp_api_key;

  const {
    data: marketResult,
    isLoading: marketLoading,
    isError: marketError,
    error: marketErrorMsg,
  } = useMarketplaceSearch(submittedQuery, activeTab === "market" && hasApiKey);

  const handleMarketSearch = () => {
    if (marketQuery.trim()) {
      setSubmittedQuery(marketQuery.trim());
    }
  };

  const filtered = installedSkills.filter((s) => {
    if (activeTab === "update" && s.status !== "update") return false;
    if (scopeFilter !== "all" && s.scope !== scopeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const nameMatch = s.name.toLowerCase().includes(q);
      const descMatch = s.description?.toLowerCase().includes(q);
      if (!nameMatch && !descMatch) return false;
    }
    return true;
  });

  const groupedSkills = scopeGroups.map((g) => ({
    ...g,
    skills: installedSkills.filter((s) => s.scope === g.scope),
  }));

  const updatable = installedSkills.filter((s) => s.status === "update").length;
  const isMarket = activeTab === "market";

  return (
    <div className="flex gap-5 items-start">
      {/* Left panel */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div
          className="flex items-center justify-between mb-5"
          style={{ animation: "fade-in 0.25s ease-out" }}
        >
          <p className="text-[0.82rem] text-text-secondary">
            管理本地与在线 Skills，为 Agent 提供可调用的外部能力
          </p>
        </div>

        {/* Tabs */}
        <div
          className="mb-4"
          style={{ animation: "fade-in 0.25s ease-out 0.05s both" }}
        >
          <Tabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        {/* Search toolbar */}
        <div
          className="flex items-center gap-2 mb-4"
          style={{ animation: "fade-in 0.25s ease-out 0.08s both" }}
        >
          <div className="relative flex-1">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
            />
            {isMarket ? (
              <input
                type="text"
                placeholder="AI 语义搜索市场 Skills（回车搜索）..."
                value={marketQuery}
                onChange={(e) => setMarketQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleMarketSearch(); }}
                className="w-full pl-8 pr-3 py-2 rounded-lg bg-surface text-[0.82rem] text-text border border-border-light focus:border-primary/40 focus:outline-none transition-colors placeholder:text-text-muted"
              />
            ) : (
              <input
                type="text"
                placeholder="搜索已安装 Skill..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-lg bg-surface text-[0.82rem] text-text border border-border-light focus:border-primary/40 focus:outline-none transition-colors placeholder:text-text-muted"
              />
            )}
          </div>
          {isMarket ? (
            <button
              onClick={handleMarketSearch}
              disabled={!marketQuery.trim() || marketLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[0.82rem] font-medium bg-gradient-to-r from-primary to-lavender text-white border-none cursor-pointer transition-all hover:shadow-glow shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles size={14} />
              AI 搜索
            </button>
          ) : (
            <div className="relative">
              <select
                value={scopeFilter}
                onChange={(e) => setScopeFilter(e.target.value)}
                className="appearance-none pl-3 pr-7 py-2 rounded-lg bg-surface text-[0.82rem] text-text-secondary border border-border-light focus:border-primary/40 focus:outline-none cursor-pointer transition-colors"
              >
                {SCOPE_FILTERS.map((f) => (
                  <option key={f.id} value={f.id}>{f.label}</option>
                ))}
              </select>
              <ChevronDown
                size={12}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
              />
            </div>
          )}
        </div>

        {/* Content */}
        {isMarket ? (
          <MarketplaceContent
            hasApiKey={hasApiKey}
            query={submittedQuery}
            result={marketResult}
            loading={marketLoading}
            error={marketError}
            errorMsg={marketErrorMsg}
          />
        ) : (
          <InstalledContent
            skills={filtered}
            loading={skillsLoading}
            activeTab={activeTab}
          />
        )}
      </div>

      {/* Right aside */}
      <aside
        className="w-[280px] shrink-0 space-y-4 sticky top-0"
        style={{ animation: "fade-in 0.3s ease-out 0.12s both" }}
      >
        {/* Scope panel */}
        <div className="bg-surface rounded-xl border border-border-light p-4 shadow-card">
          <h4 className="text-[0.85rem] font-semibold text-text mb-3">
            Skill 作用域
          </h4>
          <div className="space-y-3">
            {groupedSkills.map((group) => (
              <div key={group.scope}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={cn("w-2 h-2 rounded-full shrink-0", group.color)} />
                  <span className="text-[0.78rem] font-medium text-text-secondary">
                    {group.label} ({group.skills.length})
                  </span>
                </div>
                <div className="ml-4 space-y-1">
                  {group.skills.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center gap-2 text-[0.74rem] text-text-muted py-0.5"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-text-muted/30 shrink-0" />
                      <span className="truncate">{s.name}</span>
                    </div>
                  ))}
                  {group.skills.length === 0 && (
                    <span className="text-[0.72rem] text-text-muted/50">暂无</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick stats card */}
        <div className="bg-surface rounded-xl border border-border-light p-4 shadow-card">
          <h4 className="text-[0.85rem] font-semibold text-text mb-3">
            统计概览
          </h4>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[0.78rem] text-text-muted">已安装</span>
              <span className="text-[0.88rem] font-bold text-text font-mono">
                {installedSkills.length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[0.78rem] text-text-muted">可升级</span>
              <span
                className={cn(
                  "text-[0.88rem] font-bold font-mono",
                  updatable > 0 ? "text-warning" : "text-text",
                )}
              >
                {updatable}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[0.78rem] text-text-muted">API Key</span>
              <span className={cn(
                "text-[0.75rem] font-medium",
                hasApiKey ? "text-success" : "text-text-muted"
              )}>
                {hasApiKey ? "已配置" : "未配置"}
              </span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

// --- Installed Skills Grid ---

function InstalledContent({
  skills,
  loading,
  activeTab,
}: {
  skills: Skill[];
  loading: boolean;
  activeTab: string;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={20} className="animate-spin text-text-muted" />
      </div>
    );
  }

  if (skills.length === 0) {
    return (
      <div className="text-center py-16 text-[0.82rem] text-text-muted">
        {activeTab === "update" ? "所有 Skill 均为最新版本" : "暂无已安装的 Skill"}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {skills.map((skill, i) => (
        <InstalledSkillCard key={skill.id} skill={skill} index={i} />
      ))}
    </div>
  );
}

function InstalledSkillCard({ skill, index }: { skill: Skill; index: number }) {
  const scopeInfo = SCOPE_STYLE[skill.scope ?? "global"] ?? SCOPE_STYLE.global;

  return (
    <div
      className="bg-surface rounded-xl border border-border-light p-4 transition-all hover:shadow-card-hover hover:border-border-hover group flex flex-col"
      style={{ animation: `fade-in 0.3s ease-out ${index * 0.05}s both` }}
    >
      <div className="flex items-start gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-[0.75rem] font-bold text-white shrink-0"
          style={{ backgroundColor: skill.icon_bg ?? "#6C8FC7" }}
        >
          {skill.name.slice(0, 2)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[0.88rem] font-semibold text-text truncate group-hover:text-primary transition-colors">
            {skill.name}
          </div>
          <p className="text-[0.75rem] text-text-muted mt-0.5 line-clamp-2 leading-relaxed">
            {skill.description ?? "暂无描述"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 mb-3">
        {skill.version && (
          <span className="inline-flex px-2 py-0.5 rounded-full text-[0.68rem] font-medium bg-bg-alt text-text-secondary">
            v{skill.version}
          </span>
        )}
        <span className={cn("inline-flex px-2 py-0.5 rounded-full text-[0.68rem] font-medium", scopeInfo.bg)}>
          {scopeInfo.label}
        </span>
        {skill.source === "marketplace" && (
          <span className="inline-flex px-2 py-0.5 rounded-full text-[0.68rem] font-medium bg-primary-light text-primary">
            市场
          </span>
        )}
      </div>

      <div className="flex items-center justify-between mt-auto pt-2 border-t border-border-light/60">
        <div>
          {skill.status === "update" ? (
            <span className="inline-flex items-center gap-1 text-[0.72rem] font-medium text-warning">
              <ArrowUpCircle size={12} />
              可升级
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[0.72rem] font-medium text-success">
              <Package size={12} />
              已安装
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[0.72rem] font-medium text-text-muted hover:text-text hover:bg-bg-alt transition-colors cursor-pointer bg-transparent border-none">
            <Settings size={11} />
            配置
          </button>
          <button className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[0.72rem] font-medium text-text-muted hover:text-danger hover:bg-danger-light transition-colors cursor-pointer bg-transparent border-none">
            <Trash2 size={11} />
            卸载
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Marketplace Content ---

function MarketplaceContent({
  hasApiKey,
  query,
  result,
  loading,
  error,
  errorMsg,
}: {
  hasApiKey: boolean;
  query: string;
  result: { skills: MarketplaceSkill[]; total: number } | undefined;
  loading: boolean;
  error: boolean;
  errorMsg: unknown;
}) {
  if (!hasApiKey) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <KeyRound size={32} className="text-text-muted/40" />
        <p className="text-[0.85rem] text-text-secondary font-medium">
          需要配置 SkillsMP API Key
        </p>
        <p className="text-[0.78rem] text-text-muted text-center max-w-md">
          前往{" "}
          <a href="/settings" className="text-primary hover:underline">设置页面</a>
          {" "}填写 API Key，即可通过 AI 语义搜索浏览来自{" "}
          <a
            href="https://skillsmp.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            SkillsMP
          </a>
          {" "}的 28 万+ 开源 Skills
        </p>
      </div>
    );
  }

  if (!query.trim()) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-2">
        <Sparkles size={28} className="text-text-muted/40" />
        <p className="text-[0.82rem] text-text-muted">
          输入自然语言描述，AI 会为你找到最匹配的 Skills
        </p>
        <p className="text-[0.72rem] text-text-muted/60">
          例如：How to create a web scraper / 代码审查工具 / SEO optimization
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={20} className="animate-spin text-primary" />
        <span className="ml-2 text-[0.82rem] text-text-muted">AI 搜索中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16 text-[0.82rem] text-danger">
        {errorMsg instanceof Error ? errorMsg.message : "搜索失败，请检查 API Key 或网络"}
      </div>
    );
  }

  if (!result || result.skills.length === 0) {
    return (
      <div className="text-center py-16 text-[0.82rem] text-text-muted">
        未找到匹配 &ldquo;{query}&rdquo; 的 Skill
      </div>
    );
  }

  return (
    <>
      <div className="mb-3 text-[0.75rem] text-text-muted">
        共找到 {result.total} 个相关 Skill
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {result.skills.map((skill, i) => (
          <MarketplaceSkillCard key={`${skill.repo}-${skill.name}-${i}`} skill={skill} index={i} />
        ))}
      </div>
    </>
  );
}

function MarketplaceSkillCard({ skill, index }: { skill: MarketplaceSkill; index: number }) {
  const repoShort = skill.repo?.replace("https://github.com/", "") ?? "";

  return (
    <div
      className="bg-surface rounded-xl border border-border-light p-4 transition-all hover:shadow-card-hover hover:border-border-hover group flex flex-col"
      style={{ animation: `fade-in 0.3s ease-out ${index * 0.04}s both` }}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-lavender/20 flex items-center justify-center text-[0.75rem] font-bold text-primary shrink-0">
          {(skill.name ?? "SK").slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[0.88rem] font-semibold text-text truncate group-hover:text-primary transition-colors">
            {skill.name ?? "未命名"}
          </div>
          <p className="text-[0.75rem] text-text-muted mt-0.5 line-clamp-2 leading-relaxed">
            {skill.description ?? "暂无描述"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        {skill.category && (
          <span className="inline-flex px-2 py-0.5 rounded-full text-[0.68rem] font-medium bg-primary-light text-primary">
            {skill.category}
          </span>
        )}
        {skill.stars != null && skill.stars > 0 && (
          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[0.68rem] font-medium bg-sand-light text-[#a08b5b]">
            <Star size={10} />
            {skill.stars >= 1000 ? `${(skill.stars / 1000).toFixed(1)}k` : skill.stars}
          </span>
        )}
        {repoShort && (
          <span className="inline-flex px-2 py-0.5 rounded-full text-[0.68rem] font-medium bg-bg-alt text-text-muted truncate max-w-[160px]">
            {repoShort}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between mt-auto pt-2 border-t border-border-light/60">
        {skill.updated_at && (
          <span className="text-[0.7rem] text-text-muted">
            {skill.updated_at.slice(0, 10)}
          </span>
        )}
        <div className="flex items-center gap-1 ml-auto">
          {skill.url && (
            <a
              href={skill.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[0.72rem] font-medium text-text-muted hover:text-primary hover:bg-primary-light transition-colors"
            >
              <ExternalLink size={11} />
              查看
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
