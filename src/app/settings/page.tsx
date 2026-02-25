import { useState } from "react";
import {
  Bell,
  Database,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Toggle } from "@/components/ui";

export default function SettingsPage() {
  const [theme, setTheme] = useState("light");
  const [language, setLanguage] = useState("zh-CN");
  const [encryption, setEncryption] = useState(true);
  const [archiveDays, setArchiveDays] = useState("30");
  const [taskNotify, setTaskNotify] = useState(true);
  const [failNotify, setFailNotify] = useState(true);
  const [budgetNotify, setBudgetNotify] = useState(false);

  return (
    <div className="flex flex-col h-full overflow-hidden px-6 pt-5 pb-6">
      <div
        className="shrink-0 mb-5"
        style={{ animation: "fade-in 0.3s ease-out" }}
      >
        <p className="text-[0.82rem] text-text-secondary">应用偏好、数据存储与通知管理</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[720px] space-y-6">
          {/* General Settings */}
          <SettingsSection title="常规设置" delay={60}>
            <SettingsRow label="界面语言">
              <div className="relative">
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
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
                    onClick={() => setTheme(opt.id)}
                    className={cn(
                      "px-3 py-1 rounded-md text-[0.75rem] font-medium transition-all cursor-pointer",
                      theme === opt.id
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
              <Toggle checked={encryption} onChange={setEncryption} />
            </SettingsRow>
            <SettingsRow label="自动归档天数">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={archiveDays}
                  onChange={(e) => setArchiveDays(e.target.value)}
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
              <span className="text-[0.75rem] text-text-muted font-mono">~/.zerodesk/data</span>
            </SettingsRow>
          </SettingsSection>

          {/* Notification Settings */}
          <SettingsSection
            title="通知"
            icon={<Bell size={15} className="text-lavender" />}
            delay={180}
          >
            <SettingsRow label="任务完成通知">
              <Toggle checked={taskNotify} onChange={setTaskNotify} />
            </SettingsRow>
            <SettingsRow label="失败告警通知">
              <Toggle checked={failNotify} onChange={setFailNotify} />
            </SettingsRow>
            <SettingsRow label="超预算告警">
              <Toggle checked={budgetNotify} onChange={setBudgetNotify} />
            </SettingsRow>
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

function SettingsSection({
  title,
  icon,
  delay = 0,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  delay?: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className="bg-surface border border-border-light rounded-xl p-5"
      style={{ animation: `fade-in 0.3s ease-out ${delay}ms both` }}
    >
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border-light">
        {icon}
        <h3 className="text-[0.85rem] font-semibold text-text">{title}</h3>
      </div>
      <div className="space-y-4">{children}</div>
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
    <div className="flex items-center justify-between">
      <span className="text-[0.78rem] text-text-secondary">{label}</span>
      {children}
    </div>
  );
}
