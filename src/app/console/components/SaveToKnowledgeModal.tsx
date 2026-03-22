import { useEffect, useState, KeyboardEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { useKnowledgeFolders, useCreateKnowledgeItem } from "@/hooks/useKnowledge";
import { ExecutionMessage } from "@/types";

interface SaveToKnowledgeModalProps {
  msg: ExecutionMessage | null;
  onClose: () => void;
}

// 根据消息内容自动推导标题
function deriveTitle(content: string): string {
  const firstLine = content.split("\n")[0].trim();
  // 规则1：第一行是 Markdown 一级标题
  if (firstLine.startsWith("# ")) {
    return firstLine.slice(2).trim();
  }
  // 规则2：内容 ≤ 60 字符直接用
  if (content.length <= 60) {
    return content.trim();
  }
  // 规则3：截取前 40 字符加省略号
  return content.slice(0, 40) + "...";
}

// 根据消息发送者自动生成初始标签
function deriveTags(msg: ExecutionMessage): string[] {
  if (msg.sender_type === "agent") {
    return ["来源:agent", `agent:${msg.sender_name ?? "unknown"}`];
  }
  return ["来源:用户"];
}

export default function SaveToKnowledgeModal({ msg, onClose }: SaveToKnowledgeModalProps) {
  const { data: folders = [] } = useKnowledgeFolders();
  const createItem = useCreateKnowledgeItem();

  const [title, setTitle] = useState("");
  const [folder, setFolder] = useState("");
  const [visibility, setVisibility] = useState<"private" | "team" | "public">("private");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [content, setContent] = useState("");
  const [saved, setSaved] = useState(false);

  // msg 变化时重置所有表单状态
  useEffect(() => {
    if (!msg) return;
    setTitle(deriveTitle(msg.content));
    setFolder("");
    setVisibility("private");
    setTags(deriveTags(msg));
    setTagInput("");
    setContent(msg.content);
    setSaved(false);
  }, [msg]);

  // 添加标签（回车触发）
  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const val = tagInput.trim();
      if (val && !tags.includes(val)) {
        setTags((prev) => [...prev, val]);
      }
      setTagInput("");
    }
  };

  // 删除指定标签
  const removeTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  };

  // 保存到知识库
  const handleSave = async () => {
    await createItem.mutateAsync({
      title,
      content,
      folder: folder || undefined,
      visibility,
      tagsJson: JSON.stringify(tags),
    });
    setSaved(true);
    // 200ms 后关闭
    setTimeout(() => {
      onClose();
    }, 200);
  };

  return (
    <Modal open={!!msg} onClose={onClose} title="保存到知识库" width="520px">
      <div className="space-y-4">
        {/* 标题 */}
        <div>
          <label className="block text-[0.78rem] font-medium text-text-secondary mb-1.5">
            标题
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 text-[0.82rem] bg-bg border border-border-light rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/30 text-text"
          />
        </div>

        {/* 文件夹 */}
        <div>
          <label className="block text-[0.78rem] font-medium text-text-secondary mb-1.5">
            文件夹
          </label>
          <select
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            className="w-full px-3 py-2 text-[0.82rem] bg-bg border border-border-light rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/30 text-text"
          >
            <option value="">根目录（无分类）</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        {/* 可见性 */}
        <div>
          <label className="block text-[0.78rem] font-medium text-text-secondary mb-1.5">
            可见性
          </label>
          <div className="flex items-center gap-4">
            {(["private", "team", "public"] as const).map((v) => (
              <label key={v} className="flex items-center gap-1.5 text-[0.78rem] text-text cursor-pointer">
                <input
                  type="radio"
                  name="visibility"
                  value={v}
                  checked={visibility === v}
                  onChange={() => setVisibility(v)}
                />
                {v === "private" ? "私有" : v === "team" ? "团队" : "公开"}
              </label>
            ))}
          </div>
        </div>

        {/* 标签 */}
        <div>
          <label className="block text-[0.78rem] font-medium text-text-secondary mb-1.5">
            标签
          </label>
          {/* 已有标签列表 */}
          <div className="flex flex-wrap gap-1.5 mb-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-bg-alt rounded text-[0.72rem] text-text"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="hover:text-text-secondary transition-colors leading-none"
                  aria-label={`删除标签 ${tag}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          {/* 新标签输入框 */}
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            placeholder="输入标签后按回车添加"
            className="w-full px-3 py-2 text-[0.82rem] bg-bg border border-border-light rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/30 text-text"
          />
        </div>

        {/* 内容 */}
        <div>
          <label className="block text-[0.78rem] font-medium text-text-secondary mb-1.5">
            内容
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            className="w-full px-3 py-2 text-[0.82rem] bg-bg border border-border-light rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/30 text-text resize-none"
          />
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-[0.82rem] rounded-lg border border-border-light text-text-secondary hover:bg-bg-alt transition-colors cursor-pointer"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saved || createItem.isPending}
            className="px-4 py-2 text-[0.82rem] rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {saved ? "已保存 ✓" : createItem.isPending ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
