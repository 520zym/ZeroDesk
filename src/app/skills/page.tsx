import { useState } from "react";
import {
  Plus,
  Search,
  ChevronDown,
  Settings,
  Trash2,
  ArrowUpCircle,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs } from "@/components/ui";

type SkillStatus = "installed" | "update";
type Scope = "global" | "team" | "agent";

interface Skill {
  id: string;
  name: string;
  icon: string;
  iconBg: string;
  desc: string;
  version: string;
  scope: Scope;
  scopeLabel: string;
  scopeBg: string;
  status: SkillStatus;
  updateTo?: string;
}

const SKILLS: Skill[] = [
  {
    id: "s1",
    name: "多源聚合搜索",
    icon: "🔍",
    iconBg: "bg-primary-light",
    desc: "同时搜索多个数据源并智能去重",
    version: "2.1.0",
    scope: "global",
    scopeLabel: "全局",
    scopeBg: "bg-primary-light text-primary-active",
    status: "installed",
  },
  {
    id: "s2",
    name: "结构化报告生成",
    icon: "📝",
    iconBg: "bg-sage-light",
    desc: "将分析结果自动组装为 Markdown 报告",
    version: "1.3.0",
    scope: "team",
    scopeLabel: "团队",
    scopeBg: "bg-sage-light text-[#5a7a6b]",
    status: "installed",
  },
  {
    id: "s3",
    name: "代码质量扫描",
    icon: "🔬",
    iconBg: "bg-lavender-light",
    desc: "静态分析代码质量并输出改进建议",
    version: "3.0.1",
    scope: "agent",
    scopeLabel: "Agent",
    scopeBg: "bg-lavender-light text-[#6f5f80]",
    status: "installed",
  },
  {
    id: "s4",
    name: "数据可视化",
    icon: "📊",
    iconBg: "bg-coral-light",
    desc: "将结构化数据转化为图表与可视化",
    version: "1.0.0",
    scope: "global",
    scopeLabel: "全局",
    scopeBg: "bg-primary-light text-primary-active",
    status: "installed",
  },
  {
    id: "s5",
    name: "知识库检索",
    icon: "📚",
    iconBg: "bg-sand-light",
    desc: "检索本地知识库内容并返回相关文档",
    version: "2.0.0",
    scope: "global",
    scopeLabel: "全局",
    scopeBg: "bg-primary-light text-primary-active",
    status: "update",
    updateTo: "2.1.0",
  },
  {
    id: "s6",
    name: "翻译引擎",
    icon: "🌐",
    iconBg: "bg-info-light",
    desc: "高质量多语言互译，保持术语一致性",
    version: "1.2.0",
    scope: "agent",
    scopeLabel: "Agent",
    scopeBg: "bg-lavender-light text-[#6f5f80]",
    status: "installed",
  },
];

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

export default function SkillsPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [scopeFilter, setScopeFilter] = useState("all");

  const filtered = SKILLS.filter((s) => {
    if (activeTab === "update" && s.status !== "update") return false;
    if (scopeFilter !== "all" && s.scope !== scopeFilter) return false;
    if (
      search &&
      !s.name.toLowerCase().includes(search.toLowerCase()) &&
      !s.desc.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    return true;
  });

  const groupedSkills = scopeGroups.map((g) => ({
    ...g,
    skills: SKILLS.filter((s) => s.scope === g.scope),
  }));

  const updatable = SKILLS.filter((s) => s.status === "update").length;

  return (
    <div className="flex gap-5 items-start">
      {/* Left panel */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div
          className="flex items-center justify-between mb-5"
          style={{ animation: "fade-in 0.25s ease-out" }}
        >
          <p className="text-[0.82rem] text-text-secondary">管理本地与在线 Skills，为 Agent 提供可调用的外部能力</p>
          <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[0.82rem] font-medium bg-gradient-to-r from-primary to-lavender text-white border-none cursor-pointer transition-all hover:shadow-glow shadow-sm">
            <Plus size={15} strokeWidth={2.5} />
            安装 Skill
          </button>
        </div>

        {/* Tabs */}
        <div
          className="mb-4"
          style={{ animation: "fade-in 0.25s ease-out 0.05s both" }}
        >
          <Tabs
            tabs={TABS}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
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
            <input
              type="text"
              placeholder="搜索 Skill..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-lg bg-surface text-[0.82rem] text-text border border-border-light focus:border-primary/40 focus:outline-none transition-colors placeholder:text-text-muted"
            />
          </div>
          <div className="relative">
            <select
              value={scopeFilter}
              onChange={(e) => setScopeFilter(e.target.value)}
              className="appearance-none pl-3 pr-7 py-2 rounded-lg bg-surface text-[0.82rem] text-text-secondary border border-border-light focus:border-primary/40 focus:outline-none cursor-pointer transition-colors"
            >
              {SCOPE_FILTERS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={12}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
            />
          </div>
        </div>

        {/* Skill grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((skill, i) => (
            <div
              key={skill.id}
              className="bg-surface rounded-xl border border-border-light p-4 transition-all hover:shadow-card-hover hover:border-border-hover group flex flex-col"
              style={{
                animation: `fade-in 0.3s ease-out ${i * 0.05}s both`,
              }}
            >
              {/* Top */}
              <div className="flex items-start gap-3 mb-3">
                <div
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center text-[1.1rem] shrink-0",
                    skill.iconBg,
                  )}
                >
                  {skill.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[0.88rem] font-semibold text-text truncate group-hover:text-primary transition-colors">
                    {skill.name}
                  </div>
                  <p className="text-[0.75rem] text-text-muted mt-0.5 line-clamp-2 leading-relaxed">
                    {skill.desc}
                  </p>
                </div>
              </div>

              {/* Meta pills */}
              <div className="flex items-center gap-1.5 mb-3">
                <span className="inline-flex px-2 py-0.5 rounded-full text-[0.68rem] font-medium bg-bg-alt text-text-secondary">
                  v{skill.version}
                </span>
                <span
                  className={cn(
                    "inline-flex px-2 py-0.5 rounded-full text-[0.68rem] font-medium",
                    skill.scopeBg,
                  )}
                >
                  {skill.scopeLabel}
                </span>
              </div>

              {/* Actions row */}
              <div className="flex items-center justify-between mt-auto pt-2 border-t border-border-light/60">
                <div>
                  {skill.status === "update" ? (
                    <span className="inline-flex items-center gap-1 text-[0.72rem] font-medium text-warning">
                      <ArrowUpCircle size={12} />
                      可升级至 v{skill.updateTo}
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
          ))}

          {filtered.length === 0 && (
            <div className="col-span-full text-center py-12 text-[0.82rem] text-text-muted">
              {activeTab === "market"
                ? "市场功能即将上线，敬请期待"
                : "没有找到匹配的 Skill"}
            </div>
          )}
        </div>
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
                  <span
                    className={cn(
                      "w-2 h-2 rounded-full shrink-0",
                      group.color,
                    )}
                  />
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
                      <span className="shrink-0">{s.icon}</span>
                      <span className="truncate">{s.name}</span>
                    </div>
                  ))}
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
                {SKILLS.length}
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
              <span className="text-[0.78rem] text-text-muted">总调用</span>
              <span className="text-[0.88rem] font-bold text-text font-mono">
                1,247 次
              </span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
