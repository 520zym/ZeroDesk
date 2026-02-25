import { useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { open as openFolderDialog } from "@tauri-apps/plugin-dialog";
import {
  Search,
  ChevronDown,
  Trash2,
  ArrowUpCircle,
  Package,
  Star,
  ExternalLink,
  Loader2,
  KeyRound,
  Sparkles,
  Download,
  Check,
  X,
  Github,
  Clock,
  FolderOpen,
  ScanSearch,
  Import,
  AlertTriangle,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, Modal } from "@/components/ui";
import {
  useSkills,
  useMarketplaceSearch,
  useInstallMarketplaceSkill,
  useDeleteSkill,
  useScanExternalSkills,
  useValidateSkillFolder,
  useImportLocalSkill,
  useImportScannedSkill,
} from "@/hooks/useSkills";
import type { ScannedSkill, ScanPathInfo, ValidatedSkill } from "@/hooks/useSkills";
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

const SOURCE_STYLE: Record<string, { label: string; bg: string }> = {
  marketplace: { label: "市场", bg: "bg-primary-light text-primary" },
  external: { label: "外部导入", bg: "bg-sand-light text-[#a08b5b]" },
  local: { label: "本地", bg: "bg-bg-alt text-text-secondary" },
};

export default function SkillsPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [scopeFilter, setScopeFilter] = useState("all");
  const [marketQuery, setMarketQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [scanOpen, setScanOpen] = useState(false);
  const [scanResults, setScanResults] = useState<ScannedSkill[] | null>(null);
  const [scanPaths, setScanPaths] = useState<ScanPathInfo[] | null>(null);
  const [importingPath, setImportingPath] = useState<string | null>(null);
  const [importedPaths, setImportedPaths] = useState<Set<string>>(new Set());
  const [importError, setImportError] = useState<string | null>(null);
  const [showScanPaths, setShowScanPaths] = useState(false);
  const [localOpen, setLocalOpen] = useState(false);
  const [localPending, setLocalPending] = useState<ValidatedSkill[]>([]);
  const [localValidating, setLocalValidating] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [localImporting, setLocalImporting] = useState(false);
  const [localImportProgress, setLocalImportProgress] = useState(0);

  const { data: installedSkills = [], isLoading: skillsLoading } = useSkills();
  const scanExternal = useScanExternalSkills();
  const validateFolder = useValidateSkillFolder();
  const importSkill = useImportScannedSkill();
  const importLocalSkill = useImportLocalSkill();
  const { data: settings } = useSettings();

  const hasApiKey = !!settings?.skillsmp_api_key;
  const installSkill = useInstallMarketplaceSkill();

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

  const handleScan = () => {
    setScanOpen(true);
    setScanResults(null);
    setScanPaths(null);
    setImportedPaths(new Set());
    setImportError(null);
    setShowScanPaths(false);
    scanExternal.mutate(undefined, {
      onSuccess: (data) => {
        setScanResults(data.skills);
        setScanPaths(data.scanned_paths);
      },
      onError: () => {
        setScanResults([]);
        setScanPaths([]);
      },
    });
  };

  const handleAddLocalFolder = async () => {
    setLocalError(null);
    try {
      const selected = await openFolderDialog({ directory: true, multiple: false, title: "选择 Skill 文件夹" });
      if (!selected) return;
      const folderPath = typeof selected === "string" ? selected : selected;
      if (localPending.some((s) => s.path === folderPath)) {
        setLocalError("该文件夹已在列表中");
        return;
      }
      setLocalValidating(true);
      validateFolder.mutate(folderPath, {
        onSuccess: (validated) => {
          setLocalValidating(false);
          setLocalPending((prev) => [...prev, validated]);
        },
        onError: (err) => {
          setLocalValidating(false);
          setLocalError(err instanceof Error ? err.message : String(err));
        },
      });
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleRemoveLocalPending = (path: string) => {
    setLocalPending((prev) => prev.filter((s) => s.path !== path));
  };

  const handleConfirmLocalImport = async () => {
    if (localPending.length === 0) return;
    setLocalImporting(true);
    setLocalImportProgress(0);
    setLocalError(null);
    let completed = 0;
    const errors: string[] = [];

    for (const s of localPending) {
      try {
        await importLocalSkill.mutateAsync({
          name: s.name,
          sourcePath: s.path,
          sourceTool: "手动导入",
          description: s.description ?? undefined,
        });
      } catch (err) {
        errors.push(`${s.name}: ${err instanceof Error ? err.message : String(err)}`);
      }
      completed++;
      setLocalImportProgress(completed);
    }

    setLocalImporting(false);
    if (errors.length > 0) {
      setLocalError(`${errors.length} 个导入失败: ${errors[0]}`);
    } else {
      setLocalOpen(false);
      setLocalPending([]);
    }
  };

  const handleImport = (s: ScannedSkill) => {
    setImportingPath(s.path);
    setImportError(null);
    const params = { name: s.name, path: s.path, sourceTool: s.source_tool, description: s.description ?? undefined };
    importSkill.mutate(
      params,
      {
        onSuccess: () => {
          setImportingPath(null);
          setImportedPaths((prev) => new Set(prev).add(s.path));
        },
        onError: (err) => {
          setImportingPath(null);
          setImportError(err instanceof Error ? err.message : String(err));
          setTimeout(() => setImportError(null), 4000);
        },
      },
    );
  };

  return (
    <div className="flex gap-5 items-start">
      <div className="flex-1 min-w-0">
        <div
          className="flex items-center justify-between mb-5"
          style={{ animation: "fade-in 0.25s ease-out" }}
        >
          <p className="text-[0.82rem] text-text-secondary">
            管理本地与在线 Skills，为 Agent 提供可调用的外部能力
          </p>
        </div>

        <div
          className="flex items-center justify-between mb-4"
          style={{ animation: "fade-in 0.25s ease-out 0.05s both" }}
        >
          <Tabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
          {!isMarket && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => { setLocalOpen(true); setLocalPending([]); setLocalError(null); setLocalImportProgress(0); }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.78rem] font-medium text-text-secondary hover:text-primary hover:bg-primary-light/40 transition-colors cursor-pointer bg-transparent border border-border-light hover:border-primary/30 shrink-0"
              >
                <FolderOpen size={13} />
                手动导入
              </button>
              <button
                onClick={handleScan}
                disabled={scanExternal.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.78rem] font-medium text-text-secondary hover:text-primary hover:bg-primary-light/40 transition-colors cursor-pointer bg-transparent border border-border-light hover:border-primary/30 disabled:opacity-50 shrink-0"
              >
                {scanExternal.isPending ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <ScanSearch size={13} />
                )}
                一键扫描
              </button>
            </div>
          )}
        </div>

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

        {isMarket ? (
          <MarketplaceContent
            hasApiKey={hasApiKey}
            query={submittedQuery}
            result={marketResult}
            loading={marketLoading}
            error={marketError}
            errorMsg={marketErrorMsg}
            installedSkills={installedSkills}
            installSkill={installSkill}
          />
        ) : (
          <InstalledContent
            skills={filtered}
            loading={skillsLoading}
            activeTab={activeTab}
          />
        )}
      </div>

      <aside
        className="w-[280px] shrink-0 space-y-4 sticky top-0"
        style={{ animation: "fade-in 0.3s ease-out 0.12s both" }}
      >
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

      {/* Local import modal */}
      {localOpen && (
        <Modal open onClose={() => { if (!localImporting) setLocalOpen(false); }} title="手动导入本地 Skills" width="580px">
          <div className="space-y-4">
            <p className="text-[0.78rem] text-text-muted">
              选择包含 SKILL.md、RULE.md 或 README.md 的文件夹，文件将被复制到 ZeroDesk 数据目录
            </p>

            {localError && (
              <div className="px-3 py-2 rounded-lg bg-coral-light text-[#9a5858] text-[0.78rem] font-medium flex items-center gap-2" style={{ animation: "fade-in 0.2s ease-out" }}>
                <AlertTriangle size={14} className="shrink-0" />
                <span className="flex-1 truncate">{localError}</span>
                <button onClick={() => setLocalError(null)} className="shrink-0 bg-transparent border-none cursor-pointer p-0 text-[#9a5858]/60 hover:text-[#9a5858]">
                  <X size={12} />
                </button>
              </div>
            )}

            {localPending.length > 0 && (
              <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
                {localPending.map((s) => (
                  <div
                    key={s.path}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border-light/60 bg-bg/60 hover:border-border-hover transition-colors"
                    style={{ animation: "fade-in 0.2s ease-out" }}
                  >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/15 to-lavender/15 flex items-center justify-center text-[0.65rem] font-bold text-primary shrink-0">
                      {s.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[0.8rem] font-semibold text-text truncate">{s.name}</span>
                        <span className="inline-flex px-1.5 py-0.5 rounded text-[0.6rem] font-medium bg-primary-light text-primary shrink-0">
                          {s.marker}
                        </span>
                      </div>
                      {s.description ? (
                        <p className="text-[0.7rem] text-text-muted/70 mt-0.5 line-clamp-1">{s.description}</p>
                      ) : (
                        <p className="text-[0.68rem] text-text-muted/40 mt-0.5 font-mono truncate">{s.path}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveLocalPending(s.path)}
                      disabled={localImporting}
                      className="inline-flex items-center justify-center w-7 h-7 rounded-md text-text-muted hover:text-danger hover:bg-danger-light transition-colors cursor-pointer bg-transparent border-none shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {localPending.length === 0 && !localValidating && (
              <div className="flex flex-col items-center py-8 gap-2">
                <FolderOpen size={28} className="text-text-muted/30" />
                <p className="text-[0.82rem] text-text-muted">点击下方按钮添加 Skill 文件夹</p>
              </div>
            )}

            {localValidating && (
              <div className="flex items-center justify-center py-4 gap-2">
                <Loader2 size={16} className="animate-spin text-primary" />
                <span className="text-[0.78rem] text-text-muted">正在校验文件夹...</span>
              </div>
            )}

            <button
              onClick={handleAddLocalFolder}
              disabled={localValidating || localImporting}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg border-2 border-dashed border-border-light hover:border-primary/40 hover:bg-primary-light/20 text-[0.82rem] font-medium text-text-secondary hover:text-primary transition-colors cursor-pointer bg-transparent disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus size={15} />
              添加 Skill 文件夹
            </button>

            {localImporting && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[0.72rem]">
                  <span className="text-text-muted">正在导入...</span>
                  <span className="text-primary font-medium">{localImportProgress} / {localPending.length}</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-bg-alt overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${(localImportProgress / localPending.length) * 100}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-light/60">
              <button
                onClick={() => setLocalOpen(false)}
                disabled={localImporting}
                className="px-4 py-2 rounded-lg text-[0.8rem] font-medium text-text-secondary hover:bg-bg-alt transition-colors cursor-pointer border-none bg-transparent disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={handleConfirmLocalImport}
                disabled={localPending.length === 0 || localImporting}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-[0.8rem] font-medium bg-primary text-white hover:bg-primary-hover transition-colors cursor-pointer border-none shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {localImporting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Import size={14} />
                )}
                {localImporting ? "导入中..." : `确认导入${localPending.length > 0 ? ` (${localPending.length})` : ""}`}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Scan results modal */}
      {scanOpen && (
        <Modal open onClose={() => setScanOpen(false)} title="扫描外部 Skills" width="640px">
          <div className="space-y-4">
            {scanExternal.isPending ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 size={24} className="animate-spin text-primary" />
                <span className="text-[0.82rem] text-text-muted">正在扫描本地 AI 工具目录...</span>
              </div>
            ) : (
              <>
                {/* Error toast */}
                {importError && (
                  <div className="px-3 py-2 rounded-lg bg-coral-light text-[#9a5858] text-[0.78rem] font-medium flex items-center gap-2" style={{ animation: "fade-in 0.2s ease-out" }}>
                    <X size={14} className="shrink-0" />
                    <span className="truncate">{importError}</span>
                  </div>
                )}

                {/* Summary bar */}
                {scanPaths && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {(() => {
                        const detected = scanPaths.filter((p) => p.exists).length;
                        const withSkills = scanPaths.filter((p) => p.found > 0).length;
                        return (
                          <>
                            <span className="text-[0.78rem] text-text-secondary">
                              扫描了 <b className="text-text">{scanPaths.length}</b> 个路径，
                              <b className="text-text">{detected}</b> 个存在，
                              <b className="text-success">{withSkills}</b> 个有 Skills
                            </span>
                          </>
                        );
                      })()}
                    </div>
                    <button
                      onClick={() => setShowScanPaths(!showScanPaths)}
                      className="text-[0.72rem] text-primary hover:underline cursor-pointer bg-transparent border-none p-0"
                    >
                      {showScanPaths ? "收起路径" : "查看扫描路径"}
                    </button>
                  </div>
                )}

                {/* Collapsible scanned paths */}
                {showScanPaths && scanPaths && (
                  <div className="rounded-lg border border-border-light/60 overflow-hidden" style={{ animation: "fade-in 0.15s ease-out" }}>
                    <div className="divide-y divide-border-light/40">
                      {scanPaths.map((sp) => (
                        <div key={sp.path} className="flex items-center gap-2 px-3 py-1.5">
                          <span className={cn(
                            "w-1.5 h-1.5 rounded-full shrink-0",
                            sp.exists ? (sp.found > 0 ? "bg-success" : "bg-text-muted/40") : "bg-text-muted/20"
                          )} />
                          <span className="text-[0.7rem] font-medium text-text-secondary w-[120px] shrink-0 truncate">{sp.tool}</span>
                          <span className={cn(
                            "text-[0.68rem] font-mono truncate flex-1",
                            sp.exists ? "text-text-muted" : "text-text-muted/40"
                          )}>{sp.path}</span>
                          <span className={cn(
                            "text-[0.65rem] font-medium shrink-0 w-[52px] text-right",
                            !sp.exists ? "text-text-muted/30" : sp.found > 0 ? "text-success" : "text-text-muted/50"
                          )}>
                            {!sp.exists ? "不存在" : sp.found > 0 ? `${sp.found} 个` : "空"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Results grouped by tool */}
                {scanResults && scanResults.length === 0 ? (
                  <div className="flex flex-col items-center py-10 gap-2">
                    <ScanSearch size={28} className="text-text-muted/30" />
                    <p className="text-[0.82rem] text-text-muted">未发现可导入的外部 Skills</p>
                    <p className="text-[0.72rem] text-text-muted/60">
                      点击上方「查看扫描路径」查看各工具的扫描目录
                    </p>
                  </div>
                ) : scanResults && scanResults.length > 0 ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-[0.78rem] text-text-secondary font-medium">
                        发现 {scanResults.length - importedPaths.size} 个可导入
                        {importedPaths.size > 0 && (
                          <span className="text-success ml-1.5">（已导入 {importedPaths.size} 个）</span>
                        )}
                      </span>
                    </div>
                    <p className="text-[0.72rem] text-text-muted/60 -mt-2">
                      导入仅创建引用，不会复制或移动原始文件
                    </p>
                    <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-1">
                      {scanResults.map((s) => {
                        const imported = importedPaths.has(s.path);
                        const importing = importingPath === s.path;
                        return (
                          <div
                            key={s.path}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors",
                              imported
                                ? "bg-sage-light/30 border-success/20"
                                : "bg-bg/60 border-border-light/60 hover:border-border-hover"
                            )}
                          >
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center text-[0.65rem] font-bold shrink-0",
                              imported
                                ? "bg-sage-light text-success"
                                : "bg-gradient-to-br from-primary/15 to-lavender/15 text-primary"
                            )}>
                              {imported ? <Check size={14} /> : s.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className={cn("text-[0.8rem] font-semibold truncate", imported ? "text-text-muted" : "text-text")}>{s.name}</span>
                                <span className="inline-flex px-1.5 py-0.5 rounded text-[0.62rem] font-medium bg-sage-light text-[#5a7a6b] shrink-0">
                                  {s.source_tool}
                                </span>
                              </div>
                              {s.description ? (
                                <p className="text-[0.7rem] text-text-muted/70 mt-0.5 line-clamp-1">{s.description}</p>
                              ) : (
                                <p className="text-[0.68rem] text-text-muted/40 mt-0.5 font-mono truncate">{s.path}</p>
                              )}
                            </div>
                            {imported ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 text-[0.7rem] font-medium text-success shrink-0">
                                <Check size={12} />
                                已导入
                              </span>
                            ) : (
                              <button
                                onClick={() => handleImport(s)}
                                disabled={importing}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[0.72rem] font-medium bg-primary text-white hover:bg-primary-hover transition-colors cursor-pointer border-none shadow-sm shrink-0 disabled:opacity-50"
                              >
                                {importing ? (
                                  <Loader2 size={11} className="animate-spin" />
                                ) : (
                                  <Import size={11} />
                                )}
                                导入
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : null}
              </>
            )}
          </div>
        </Modal>
      )}
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
  const [detailSkill, setDetailSkill] = useState<Skill | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Skill | null>(null);

  const deleteSkill = useDeleteSkill();

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteSkill.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null);
        if (detailSkill?.id === deleteTarget.id) setDetailSkill(null);
      },
    });
  };

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
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {skills.map((skill, i) => (
          <InstalledSkillCard
            key={skill.id}
            skill={skill}
            index={i}
            onShowDetail={() => setDetailSkill(skill)}
            onDelete={() => setDeleteTarget(skill)}
          />
        ))}
      </div>

      {detailSkill && (
        <InstalledSkillDetailModal
          skill={detailSkill}
          onClose={() => setDetailSkill(null)}
          onDelete={() => {
            setDeleteTarget(detailSkill);
          }}
        />
      )}

      {deleteTarget && (
        <Modal open onClose={() => setDeleteTarget(null)} title="确认卸载" width="420px">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-danger-light flex items-center justify-center shrink-0">
                <AlertTriangle size={20} className="text-danger" />
              </div>
              <div>
                <p className="text-[0.85rem] text-text font-medium">
                  确定要卸载「{deleteTarget.name}」吗？
                </p>
                <p className="text-[0.78rem] text-text-muted mt-1">
                  {deleteTarget.source === "marketplace"
                    ? "这将同时删除本地已下载的 Skill 文件和数据库记录，此操作不可撤销。"
                    : "这将移除该 Skill 的数据库记录。"}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-light/60">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-lg text-[0.8rem] font-medium text-text-secondary hover:bg-bg-alt transition-colors cursor-pointer border-none bg-transparent"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteSkill.isPending}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[0.8rem] font-medium text-white bg-danger hover:bg-danger/90 transition-colors cursor-pointer border-none shadow-sm disabled:opacity-50"
              >
                {deleteSkill.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
                确认卸载
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

function InstalledSkillCard({
  skill,
  index,
  onShowDetail,
  onDelete,
}: {
  skill: Skill;
  index: number;
  onShowDetail: () => void;
  onDelete: () => void;
}) {
  const scopeInfo = SCOPE_STYLE[skill.scope ?? "global"] ?? SCOPE_STYLE.global;
  const sourceInfo = SOURCE_STYLE[skill.source ?? "local"] ?? SOURCE_STYLE.local;

  let cardSourceTool: string | null = null;
  if (skill.source === "external" && skill.permissions_json) {
    try { cardSourceTool = JSON.parse(skill.permissions_json).source_tool ?? null; } catch { /* */ }
  }

  return (
    <div
      className="bg-surface rounded-xl border border-border-light p-4 transition-all hover:shadow-card-hover hover:border-border-hover group flex flex-col cursor-pointer"
      style={{ animation: `fade-in 0.3s ease-out ${index * 0.05}s both` }}
      onClick={onShowDetail}
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

      <div className="flex items-center gap-1.5 flex-wrap mb-3">
        {skill.version && (
          <span className="inline-flex px-2 py-0.5 rounded-full text-[0.68rem] font-medium bg-bg-alt text-text-secondary">
            v{skill.version}
          </span>
        )}
        <span className={cn("inline-flex px-2 py-0.5 rounded-full text-[0.68rem] font-medium", scopeInfo.bg)}>
          {scopeInfo.label}
        </span>
        <span className={cn("inline-flex px-2 py-0.5 rounded-full text-[0.68rem] font-medium", sourceInfo.bg)}>
          {sourceInfo.label}
        </span>
        {cardSourceTool && (
          <span className="inline-flex px-2 py-0.5 rounded-full text-[0.68rem] font-medium bg-sage-light text-[#5a7a6b]">
            来自 {cardSourceTool}
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
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onDelete}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[0.72rem] font-medium text-text-muted hover:text-danger hover:bg-danger-light transition-colors cursor-pointer bg-transparent border-none"
          >
            <Trash2 size={11} />
            卸载
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Installed Skill Detail Modal ---

function InstalledSkillDetailModal({
  skill,
  onClose,
  onDelete,
}: {
  skill: Skill;
  onClose: () => void;
  onDelete: () => void;
}) {
  const scopeInfo = SCOPE_STYLE[skill.scope ?? "global"] ?? SCOPE_STYLE.global;
  const sourceInfo = SOURCE_STYLE[skill.source ?? "local"] ?? SOURCE_STYLE.local;

  let installPath: string | null = null;
  let repoUrl: string | null = null;
  let sourceTool: string | null = null;

  if (skill.permissions_json) {
    try {
      const meta = JSON.parse(skill.permissions_json);
      installPath = meta.install_path ?? null;
      repoUrl = meta.repo ?? null;
      sourceTool = meta.source_tool ?? null;
    } catch {
      // ignore
    }
  }
  if (!installPath && skill.scope_id) {
    installPath = skill.scope_id;
  }

  return (
    <Modal open onClose={onClose} title={skill.name} width="560px">
      <div className="space-y-5">
        <div className="flex items-start gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-[1rem] font-bold text-white shrink-0"
            style={{ backgroundColor: skill.icon_bg ?? "#6C8FC7" }}
          >
            {skill.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-[1.05rem] font-semibold text-text">
              {skill.name}
            </h3>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className={cn("inline-flex px-2 py-0.5 rounded-full text-[0.68rem] font-medium", scopeInfo.bg)}>
                {scopeInfo.label}
              </span>
              <span className={cn("inline-flex px-2 py-0.5 rounded-full text-[0.68rem] font-medium", sourceInfo.bg)}>
                {sourceInfo.label}
              </span>
              {sourceTool && (
                <span className="inline-flex px-2 py-0.5 rounded-full text-[0.68rem] font-medium bg-sage-light text-[#5a7a6b]">
                  来自 {sourceTool}
                </span>
              )}
              {skill.version && (
                <span className="inline-flex px-2 py-0.5 rounded-full text-[0.68rem] font-medium bg-bg-alt text-text-secondary">
                  v{skill.version}
                </span>
              )}
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-[0.78rem] font-semibold text-text mb-2">描述</h4>
          <p className="text-[0.82rem] text-text-secondary leading-relaxed whitespace-pre-line">
            {skill.description ?? "暂无描述"}
          </p>
        </div>

        <div className="space-y-2">
          {installPath && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-bg/60 border border-border-light/60">
              <FolderOpen size={14} className="text-text-muted shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="text-[0.68rem] text-text-muted">安装位置</div>
                <div className="text-[0.75rem] text-text font-medium font-mono break-all">{installPath}</div>
              </div>
            </div>
          )}
          {repoUrl && (
            <button
              onClick={() => openUrl(repoUrl!)}
              className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg bg-bg/60 border border-border-light/60 hover:border-primary/40 hover:bg-primary-light/20 transition-colors cursor-pointer text-left"
            >
              <Github size={14} className="text-text-muted shrink-0" />
              <div className="min-w-0">
                <div className="text-[0.68rem] text-text-muted">GitHub 仓库</div>
                <div className="text-[0.75rem] text-text font-medium truncate">
                  {repoUrl.replace("https://github.com/", "")}
                </div>
              </div>
            </button>
          )}
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-bg/60 border border-border-light/60">
            <Clock size={14} className="text-text-muted shrink-0" />
            <div className="min-w-0">
              <div className="text-[0.68rem] text-text-muted">安装时间</div>
              <div className="text-[0.75rem] text-text font-medium">{skill.created_at?.slice(0, 16).replace("T", " ") ?? "-"}</div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border-light/60">
          <button
            onClick={() => { onDelete(); onClose(); }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[0.8rem] font-medium text-danger hover:bg-danger-light transition-colors cursor-pointer border-none bg-transparent"
          >
            <Trash2 size={13} />
            卸载
          </button>
        </div>
      </div>
    </Modal>
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
  installedSkills,
  installSkill,
}: {
  hasApiKey: boolean;
  query: string;
  result: { skills: MarketplaceSkill[]; total: number } | undefined;
  loading: boolean;
  error: boolean;
  errorMsg: unknown;
  installedSkills: Skill[];
  installSkill: ReturnType<typeof useInstallMarketplaceSkill>;
}) {
  const [detailSkill, setDetailSkill] = useState<MarketplaceSkill | null>(null);
  const [installingRepo, setInstallingRepo] = useState<string | null>(null);
  const [installError, setInstallError] = useState<string | null>(null);

  const installedNames = new Set(
    installedSkills.filter((s) => s.source === "marketplace").map((s) => s.name),
  );

  const handleInstall = (skill: MarketplaceSkill) => {
    const repo = skill.repo ?? skill.name ?? "";
    setInstallingRepo(repo);
    setInstallError(null);
    installSkill.mutate(
      {
        name: skill.name ?? "未命名 Skill",
        description: skill.description ?? undefined,
        repo: skill.repo ?? undefined,
        category: skill.category ?? undefined,
      },
      {
        onSuccess: () => setInstallingRepo(null),
        onError: (err) => {
          setInstallingRepo(null);
          setInstallError(err instanceof Error ? err.message : String(err));
          setTimeout(() => setInstallError(null), 4000);
        },
      },
    );
  };

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
          <button
            onClick={() => openUrl("https://skillsmp.com")}
            className="text-primary hover:underline cursor-pointer border-none bg-transparent p-0 font-inherit text-[inherit]"
          >
            SkillsMP
          </button>
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
      {installError && (
        <div
          className="mb-3 px-4 py-2.5 rounded-lg bg-coral-light text-[#9a5858] text-[0.78rem] font-medium flex items-center gap-2"
          style={{ animation: "fade-in 0.2s ease-out" }}
        >
          <X size={14} />
          {installError}
        </div>
      )}
      <div className="mb-3 text-[0.75rem] text-text-muted">
        共找到 {result.total} 个相关 Skill
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {result.skills.map((skill, i) => {
          const repo = skill.repo ?? skill.name ?? "";
          const isInstalled = !!(skill.name && installedNames.has(skill.name));
          const isInstalling = installingRepo === repo;

          return (
            <MarketplaceSkillCard
              key={`${skill.repo}-${skill.name}-${i}`}
              skill={skill}
              index={i}
              installed={isInstalled}
              onInstall={() => handleInstall(skill)}
              installing={isInstalling}
              onShowDetail={() => setDetailSkill(skill)}
            />
          );
        })}
      </div>

      {detailSkill && (
        <MarketplaceDetailModal
          skill={detailSkill}
          installed={!!(detailSkill.name && installedNames.has(detailSkill.name))}
          installing={installingRepo === (detailSkill.repo ?? detailSkill.name ?? "")}
          onInstall={() => handleInstall(detailSkill)}
          onClose={() => setDetailSkill(null)}
        />
      )}
    </>
  );
}

// --- Marketplace Skill Detail Modal ---

function MarketplaceDetailModal({
  skill,
  installed,
  installing,
  onInstall,
  onClose,
}: {
  skill: MarketplaceSkill;
  installed: boolean;
  installing: boolean;
  onInstall: () => void;
  onClose: () => void;
}) {
  const repoShort = skill.repo?.replace("https://github.com/", "") ?? "";

  return (
    <Modal open onClose={onClose} title={skill.name ?? "Skill 详情"} width="560px">
      <div className="space-y-5">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-lavender/20 flex items-center justify-center text-[1rem] font-bold text-primary shrink-0">
            {(skill.name ?? "SK").slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-[1.05rem] font-semibold text-text">
              {skill.name ?? "未命名"}
            </h3>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
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
              {installed && (
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[0.68rem] font-medium bg-sage-light text-success">
                  <Check size={10} />
                  已安装
                </span>
              )}
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-[0.78rem] font-semibold text-text mb-2">描述</h4>
          <p className="text-[0.82rem] text-text-secondary leading-relaxed whitespace-pre-line">
            {skill.description ?? "暂无描述"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {repoShort && (
            <button
              onClick={() => skill.repo && openUrl(skill.repo)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-bg/60 border border-border-light/60 hover:border-primary/40 hover:bg-primary-light/20 transition-colors cursor-pointer text-left"
            >
              <Github size={14} className="text-text-muted shrink-0" />
              <div className="min-w-0">
                <div className="text-[0.68rem] text-text-muted">仓库</div>
                <div className="text-[0.75rem] text-text font-medium truncate">{repoShort}</div>
              </div>
            </button>
          )}
          {skill.updated_at && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-bg/60 border border-border-light/60">
              <Clock size={14} className="text-text-muted shrink-0" />
              <div className="min-w-0">
                <div className="text-[0.68rem] text-text-muted">更新时间</div>
                <div className="text-[0.75rem] text-text font-medium">{skill.updated_at.slice(0, 10)}</div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border-light/60">
          {skill.url && (
            <button
              onClick={() => openUrl(skill.url!)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[0.8rem] font-medium text-text-secondary hover:text-text hover:bg-bg-alt transition-colors cursor-pointer border-none bg-transparent"
            >
              <ExternalLink size={13} />
              在浏览器中查看
            </button>
          )}
          {installed ? (
            <span className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-[0.8rem] font-medium text-success bg-sage-light">
              <Check size={14} />
              已安装
            </span>
          ) : (
            <button
              onClick={onInstall}
              disabled={installing}
              className={cn(
                "inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-[0.8rem] font-medium transition-all cursor-pointer border-none shadow-sm",
                "bg-primary text-white hover:bg-primary-hover active:bg-primary-active",
                "disabled:opacity-50 disabled:cursor-not-allowed",
              )}
            >
              {installing ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Download size={14} />
              )}
              {installing ? "正在下载文件..." : "安装到本地"}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

// --- Marketplace Skill Card ---

function MarketplaceSkillCard({
  skill,
  index,
  installed,
  onInstall,
  installing,
  onShowDetail,
}: {
  skill: MarketplaceSkill;
  index: number;
  installed: boolean;
  onInstall: () => void;
  installing: boolean;
  onShowDetail: () => void;
}) {
  const repoShort = skill.repo?.replace("https://github.com/", "") ?? "";

  return (
    <div
      className="bg-surface rounded-xl border border-border-light p-4 transition-all hover:shadow-card-hover hover:border-border-hover group flex flex-col cursor-pointer"
      style={{ animation: `fade-in 0.3s ease-out ${index * 0.04}s both` }}
      onClick={onShowDetail}
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
        {skill.updated_at ? (
          <span className="text-[0.7rem] text-text-muted">
            {skill.updated_at.slice(0, 10)}
          </span>
        ) : <span />}
        <div className="flex items-center gap-1.5 ml-auto" onClick={(e) => e.stopPropagation()}>
          {installed ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[0.72rem] font-medium text-success bg-sage-light">
              <Check size={12} />
              已安装
            </span>
          ) : (
            <button
              onClick={onInstall}
              disabled={installing}
              className={cn(
                "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[0.72rem] font-medium transition-all cursor-pointer border-none",
                "bg-primary text-white hover:bg-primary-hover active:bg-primary-active shadow-sm",
                "disabled:opacity-50 disabled:cursor-not-allowed",
              )}
            >
              {installing ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Download size={12} />
              )}
              {installing ? "下载中..." : "安装"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
