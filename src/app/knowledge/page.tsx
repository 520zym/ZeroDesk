import { useState, useCallback } from "react";
import {
  Plus,
  FolderOpen,
  FolderClosed,
  FileText,
  ChevronRight,
  ChevronDown,
  Eye,
  EyeOff,
  X,
  Tag,
  Clock,
  Hash,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DocFile {
  id: string;
  name: string;
}

interface DocFolder {
  id: string;
  name: string;
  files: DocFile[];
}

const mockFolders: DocFolder[] = [
  {
    id: "f1",
    name: "竞品分析",
    files: [
      { id: "d1", name: "Cursor分析.md" },
      { id: "d2", name: "Copilot评测.md" },
      { id: "d3", name: "对比矩阵.md" },
    ],
  },
  {
    id: "f2",
    name: "技术文档",
    files: [
      { id: "d4", name: "缓存架构.md" },
      { id: "d5", name: "API规范.md" },
    ],
  },
  {
    id: "f3",
    name: "运营资料",
    files: [{ id: "d6", name: "Q4周报模板.md" }],
  },
];

const mockContent = {
  title: "对比矩阵.md",
  updated: "2025-02-25 14:32",
  tags: ["竞品分析", "AI编程", "工具对比"],
  body: `## AI 编程工具竞品对比矩阵

### 1. 产品概览

本文档汇总了主流 AI 编程助手的核心能力对比，帮助团队在技术选型和产品定位时作为参考依据。

### 2. 功能维度对比

- **代码补全**：Cursor 支持多行补全与上下文感知，Copilot 侧重行级补全
- **对话能力**：Cursor 内置 Chat 面板支持多轮对话，Copilot Chat 需额外安装插件
- **Agent 模式**：Cursor 支持自主规划+执行的 Agent 流程，Copilot Workspace 仍处于预览

### 3. 定价分析

| 产品 | 免费版 | 专业版 | 企业版 |
|------|--------|--------|--------|
| Cursor | 有限额度 | $20/月 | 定制 |
| Copilot | 无 | $10/月 | $19/月 |
| Windsurf | 有限额度 | $15/月 | 定制 |

### 4. 建议

综合来看，Cursor 在 Agent 能力和上下文理解方面领先，但价格较高；Copilot 生态最完善且成本较低。建议根据团队实际需求选型。`,
};

const mockVersions = [
  { version: "v3", label: "当前版本", note: "更新对比矩阵", date: "今天 14:32", current: true },
  { version: "v2", label: "", note: "添加定价分析", date: "昨天 10:15", current: false },
  { version: "v1", label: "", note: "初始版本", date: "3天前", current: false },
];

export default function KnowledgePage() {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(["f1"])
  );
  const [selectedFile, setSelectedFile] = useState("d3");
  const [showVersions, setShowVersions] = useState(true);
  const [docTags, setDocTags] = useState(mockContent.tags);

  const toggleFolder = useCallback((id: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const removeTag = useCallback((tag: string) => {
    setDocTags((prev) => prev.filter((t) => t !== tag));
  }, []);

  return (
    <div className="flex h-full gap-5 overflow-hidden px-4 sm:px-6 pt-5 pb-6">
      {/* Left Panel: Document Tree */}
      <div
        className="w-[240px] shrink-0 bg-surface border border-border-light rounded-xl flex flex-col overflow-hidden"
        style={{ animation: "fade-in 0.3s ease-out" }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-light">
          <h2 className="text-[0.85rem] font-semibold text-text">文档</h2>
          <button
            className={cn(
              "w-6 h-6 flex items-center justify-center rounded-md",
              "text-text-muted hover:text-primary hover:bg-primary-light",
              "transition-colors cursor-pointer"
            )}
          >
            <Plus size={14} strokeWidth={2.2} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {mockFolders.map((folder, fi) => {
            const isExpanded = expandedFolders.has(folder.id);
            return (
              <div
                key={folder.id}
                style={{ animation: `fade-in 0.3s ease-out ${fi * 60}ms both` }}
              >
                <button
                  onClick={() => toggleFolder(folder.id)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-1.5 text-left",
                    "text-[0.78rem] font-medium text-text-secondary",
                    "hover:bg-bg-alt transition-colors cursor-pointer"
                  )}
                >
                  {isExpanded ? (
                    <ChevronDown size={13} className="text-text-muted shrink-0" />
                  ) : (
                    <ChevronRight size={13} className="text-text-muted shrink-0" />
                  )}
                  {isExpanded ? (
                    <FolderOpen size={14} className="text-sand shrink-0" />
                  ) : (
                    <FolderClosed size={14} className="text-sand shrink-0" />
                  )}
                  <span className="truncate">{folder.name}</span>
                </button>
                {isExpanded && (
                  <div className="ml-3">
                    {folder.files.map((file, di) => (
                      <button
                        key={file.id}
                        onClick={() => setSelectedFile(file.id)}
                        className={cn(
                          "w-full flex items-center gap-2 pl-5 pr-3 py-1.5 text-left",
                          "text-[0.75rem] transition-colors cursor-pointer rounded-md mx-1",
                          selectedFile === file.id
                            ? "bg-primary-light text-primary-active font-medium"
                            : "text-text-secondary hover:bg-bg-alt"
                        )}
                        style={{
                          animation: `fade-in 0.25s ease-out ${di * 40}ms both`,
                        }}
                      >
                        <FileText size={13} className="shrink-0" />
                        <span className="truncate">{file.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Center Panel: Document Viewer */}
      <div
        className="flex-1 min-w-0 bg-surface border border-border-light rounded-xl flex flex-col overflow-hidden"
        style={{ animation: "fade-in 0.35s ease-out 80ms both" }}
      >
        {/* Top bar */}
        <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-border-light">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-[0.9rem] font-semibold text-text truncate">
              {mockContent.title}
            </h2>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[0.65rem] font-medium bg-primary-light text-primary-active">
              Markdown
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[0.65rem] font-medium bg-success-light text-success">
              公开
            </span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="inline-flex items-center gap-1 text-[0.72rem] text-text-muted">
              <Clock size={12} />
              {mockContent.updated}
            </span>
            <button
              onClick={() => setShowVersions(!showVersions)}
              className={cn(
                "w-7 h-7 flex items-center justify-center rounded-lg",
                "transition-colors cursor-pointer",
                showVersions
                  ? "text-primary bg-primary-light"
                  : "text-text-muted hover:text-text hover:bg-bg-alt"
              )}
              title={showVersions ? "隐藏版本" : "显示版本"}
            >
              {showVersions ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="prose-sm max-w-none">
            {mockContent.body.split("\n").map((line, i) => {
              const trimmed = line.trim();
              if (!trimmed) return <div key={i} className="h-3" />;
              if (trimmed.startsWith("## "))
                return (
                  <h2
                    key={i}
                    className="text-[1rem] font-bold text-text mt-5 mb-3 tracking-tight"
                  >
                    {trimmed.replace("## ", "")}
                  </h2>
                );
              if (trimmed.startsWith("### "))
                return (
                  <h3
                    key={i}
                    className="text-[0.88rem] font-semibold text-text mt-4 mb-2"
                  >
                    {trimmed.replace("### ", "")}
                  </h3>
                );
              if (trimmed.startsWith("- "))
                return (
                  <div key={i} className="flex gap-2 mb-1.5 text-[0.8rem] text-text-secondary leading-relaxed">
                    <span className="text-primary mt-0.5 shrink-0">•</span>
                    <span>{trimmed.replace("- ", "")}</span>
                  </div>
                );
              if (trimmed.startsWith("|")) {
                if (trimmed.startsWith("|---")) return null;
                const cells = trimmed.split("|").filter(Boolean).map((c) => c.trim());
                const isHeader = i > 0 && mockContent.body.split("\n")[i + 1]?.trim().startsWith("|---");
                return (
                  <div
                    key={i}
                    className={cn(
                      "grid grid-cols-4 gap-2 px-3 py-1.5 text-[0.75rem] border-b border-border-light",
                      isHeader ? "font-medium text-text bg-bg-alt rounded-t-lg" : "text-text-secondary"
                    )}
                  >
                    {cells.map((cell, ci) => (
                      <span key={ci}>{cell}</span>
                    ))}
                  </div>
                );
              }
              return (
                <p key={i} className="text-[0.8rem] text-text-secondary leading-relaxed mb-2">
                  {trimmed}
                </p>
              );
            })}
          </div>

          {/* Tags Section */}
          <div className="mt-8 pt-5 border-t border-border-light">
            <div className="flex items-center gap-2 mb-3">
              <Tag size={13} className="text-text-muted" />
              <span className="text-[0.78rem] font-medium text-text">标签</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {docTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.72rem] font-medium bg-primary-light text-primary-active"
                >
                  <Hash size={11} />
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="hover:text-danger transition-colors cursor-pointer"
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
              <button
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-1 rounded-full",
                  "text-[0.72rem] font-medium text-text-muted",
                  "border border-dashed border-border hover:border-primary hover:text-primary",
                  "transition-colors cursor-pointer"
                )}
              >
                <Plus size={11} />
                添加标签
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel: Version Timeline */}
      {showVersions && (
        <div
          className="w-[240px] shrink-0 bg-surface border border-border-light rounded-xl flex flex-col overflow-hidden"
          style={{ animation: "slide-right 0.25s ease-out" }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-light">
            <h2 className="text-[0.85rem] font-semibold text-text">版本记录</h2>
            <span className="text-[0.65rem] text-text-muted font-medium">
              {mockVersions.length} 个版本
            </span>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="relative">
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
              <div className="space-y-5">
                {mockVersions.map((v, i) => (
                  <div
                    key={v.version}
                    className="relative pl-6"
                    style={{ animation: `fade-in 0.3s ease-out ${i * 80}ms both` }}
                  >
                    <div
                      className={cn(
                        "absolute left-0 top-1 w-[15px] h-[15px] rounded-full border-2 bg-surface",
                        v.current
                          ? "border-primary"
                          : "border-border"
                      )}
                    >
                      {v.current && (
                        <div className="absolute inset-[3px] rounded-full bg-primary" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={cn(
                            "text-[0.78rem] font-semibold",
                            v.current ? "text-primary" : "text-text"
                          )}
                        >
                          {v.version}
                        </span>
                        {v.current && (
                          <span className="inline-flex px-1.5 py-0.5 rounded text-[0.6rem] font-medium bg-primary-light text-primary">
                            当前
                          </span>
                        )}
                      </div>
                      <p className="text-[0.75rem] text-text-secondary mb-1">
                        {v.note}
                      </p>
                      <span className="text-[0.68rem] text-text-muted">
                        {v.date}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
