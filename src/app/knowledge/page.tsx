import { useState, useCallback, useMemo, useRef } from "react";
import {
  Plus,
  FolderOpen,
  FolderClosed,
  FileText,
  ChevronRight,
  ChevronDown,
  Pencil,
  Save,
  Trash2,
  FolderPlus,
  FilePlus,
  Tag,
  Hash,
  X,
  Loader2,
  GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui";
import { TiptapEditor } from "@/components/TiptapEditor";
import {
  useKnowledgeFolders,
  useKnowledgeItems,
  useKnowledgeItem,
  useCreateKnowledgeFolder,
  useRenameKnowledgeFolder,
  useDeleteKnowledgeFolder,
  useCreateKnowledgeItem,
  useUpdateKnowledgeItem,
  useDeleteKnowledgeItem,
  useMoveKnowledgeItem,
} from "@/hooks/useKnowledge";
import type { KnowledgeFolder, KnowledgeItem } from "@/types";

export default function KnowledgePage() {
  const { data: folders = [], isLoading: foldersLoading } =
    useKnowledgeFolders();
  const { data: items = [], isLoading: itemsLoading } = useKnowledgeItems();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [manualExpanded, setManualExpanded] = useState<Set<string> | null>(
    null,
  );

  const createFolder = useCreateKnowledgeFolder();
  const renameFolder = useRenameKnowledgeFolder();
  const deleteFolder = useDeleteKnowledgeFolder();
  const createItem = useCreateKnowledgeItem();
  const updateItem = useUpdateKnowledgeItem();
  const deleteItem = useDeleteKnowledgeItem();
  const moveItem = useMoveKnowledgeItem();

  // group items by folder
  const rootItems = useMemo(
    () => items.filter((i) => !i.folder || i.folder === "root"),
    [items],
  );
  const itemsByFolder = useMemo(() => {
    const map = new Map<string, KnowledgeItem[]>();
    for (const item of items) {
      if (item.folder && item.folder !== "root") {
        if (!map.has(item.folder)) map.set(item.folder, []);
        map.get(item.folder)!.push(item);
      }
    }
    return map;
  }, [items]);

  const expandedFolders =
    manualExpanded ?? new Set(folders.map((f) => f.id));
  const effectiveSelectedId = selectedId || items[0]?.id || null;

  const { data: selectedItem } = useKnowledgeItem(effectiveSelectedId);

  const toggleFolder = useCallback(
    (id: string) => {
      setManualExpanded((prev) => {
        const current = prev ?? new Set(folders.map((f) => f.id));
        const next = new Set(current);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    [folders],
  );

  // ─── delete confirmation ─────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "folder" | "file";
    id: string;
    name: string;
  } | null>(null);

  const confirmDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === "folder") {
      deleteFolder.mutate(
        { id: deleteTarget.id },
        {
          onSuccess: () => {
            if (effectiveSelectedId) {
              const folderItems = itemsByFolder.get(deleteTarget.id) ?? [];
              if (folderItems.some((i) => i.id === effectiveSelectedId)) {
                setSelectedId(null);
              }
            }
          },
        },
      );
    } else {
      deleteItem.mutate(
        { id: deleteTarget.id },
        {
          onSuccess: () => {
            if (effectiveSelectedId === deleteTarget.id) setSelectedId(null);
          },
        },
      );
    }
    setDeleteTarget(null);
  };

  // ─── create menu ─────────────────────────────────────
  const [showCreateMenu, setShowCreateMenu] = useState(false);

  const handleCreateFolder = () => {
    setShowCreateMenu(false);
    createFolder.mutate({ name: "新文件夹" });
  };

  const handleCreateFile = (folderId?: string) => {
    setShowCreateMenu(false);
    createItem.mutate(
      { title: "新文档", content: "", folder: folderId || "" },
      {
        onSuccess: (data) => {
          setSelectedId(data.id);
        },
      },
    );
  };

  // ─── drag & drop ─────────────────────────────────────
  const dragItemId = useRef<string | null>(null);

  const handleDragStart = (itemId: string) => {
    dragItemId.current = itemId;
  };

  const handleDropOnFolder = (folderId: string) => {
    if (dragItemId.current) {
      moveItem.mutate({ id: dragItemId.current, folderId });
      dragItemId.current = null;
    }
  };

  const handleDropOnRoot = () => {
    if (dragItemId.current) {
      moveItem.mutate({ id: dragItemId.current, folderId: "" });
      dragItemId.current = null;
    }
  };

  const isLoading = foldersLoading || itemsLoading;

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 size={24} className="animate-spin text-text-muted" />
      </div>
    );
  }

  return (
    <div className="flex h-full gap-5 overflow-hidden px-4 sm:px-6 pt-5 pb-6">
      {/* ─── Left Panel: Document Tree ─── */}
      <div
        className="w-[260px] shrink-0 bg-surface border border-border-light rounded-xl flex flex-col overflow-hidden"
        style={{ animation: "fade-in 0.3s ease-out" }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-light">
          <h2 className="text-[0.85rem] font-semibold text-text">文档</h2>
          <div className="relative">
            <button
              onClick={() => setShowCreateMenu((v) => !v)}
              className={cn(
                "w-6 h-6 flex items-center justify-center rounded-md",
                "text-text-muted hover:text-primary hover:bg-primary-light",
                "transition-colors cursor-pointer",
              )}
            >
              <Plus size={14} strokeWidth={2.2} />
            </button>
            {showCreateMenu && (
              <div
                className="absolute right-0 top-8 z-20 bg-surface border border-border-light rounded-lg shadow-lg py-1 w-[140px]"
                style={{ animation: "fade-in 0.15s ease-out" }}
              >
                <button
                  onClick={handleCreateFolder}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[0.75rem] text-text-secondary hover:bg-bg-alt transition-colors cursor-pointer"
                >
                  <FolderPlus size={13} />
                  新建文件夹
                </button>
                <button
                  onClick={() => handleCreateFile()}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[0.75rem] text-text-secondary hover:bg-bg-alt transition-colors cursor-pointer"
                >
                  <FilePlus size={13} />
                  新建文件
                </button>
              </div>
            )}
          </div>
        </div>

        <div
          className="flex-1 overflow-y-auto py-2"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleDropOnRoot();
          }}
        >
          {folders.length === 0 && rootItems.length === 0 ? (
            <div className="px-4 py-8 text-center text-[0.75rem] text-text-muted">
              暂无文档，点击 + 创建
            </div>
          ) : (
            <>
              {/* Folders */}
              {folders.map((folder, fi) => (
                <FolderRow
                  key={folder.id}
                  folder={folder}
                  items={itemsByFolder.get(folder.id) ?? []}
                  isExpanded={expandedFolders.has(folder.id)}
                  selectedId={effectiveSelectedId}
                  animDelay={fi * 40}
                  onToggle={() => toggleFolder(folder.id)}
                  onSelect={setSelectedId}
                  onRename={(name) =>
                    renameFolder.mutate({ id: folder.id, name })
                  }
                  onDelete={() =>
                    setDeleteTarget({
                      type: "folder",
                      id: folder.id,
                      name: folder.name,
                    })
                  }
                  onDeleteItem={(item) =>
                    setDeleteTarget({
                      type: "file",
                      id: item.id,
                      name: item.title,
                    })
                  }
                  onCreateFile={() => handleCreateFile(folder.id)}
                  onDragStart={handleDragStart}
                  onDrop={() => handleDropOnFolder(folder.id)}
                />
              ))}
              {/* Root items */}
              {rootItems.map((item, di) => (
                <FileRow
                  key={item.id}
                  item={item}
                  isSelected={effectiveSelectedId === item.id}
                  animDelay={folders.length * 40 + di * 30}
                  onSelect={() => setSelectedId(item.id)}
                  onDelete={() =>
                    setDeleteTarget({
                      type: "file",
                      id: item.id,
                      name: item.title,
                    })
                  }
                  onDragStart={() => handleDragStart(item.id)}
                />
              ))}
            </>
          )}
        </div>
      </div>

      {/* ─── Center Panel: Editor ─── */}
      {selectedItem ? (
        <EditorPanel
          item={selectedItem}
          onUpdate={(params) => updateItem.mutate(params)}
        />
      ) : (
        <div
          className="flex-1 min-w-0 bg-surface border border-border-light rounded-xl flex items-center justify-center"
          style={{ animation: "fade-in 0.35s ease-out 80ms both" }}
        >
          <p className="text-[0.82rem] text-text-muted">
            {items.length === 0
              ? "暂无文档，点击左上角 + 创建"
              : "选择一个文档查看"}
          </p>
        </div>
      )}

      {/* ─── Delete Confirmation Modal ─── */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="确认删除"
        width="400px"
      >
        <div className="space-y-4">
          <p className="text-[0.82rem] text-text-secondary">
            {deleteTarget?.type === "folder"
              ? `确定删除文件夹「${deleteTarget?.name}」及其下所有文件吗？此操作不可撤销。`
              : `确定删除「${deleteTarget?.name}」吗？此操作不可撤销。`}
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setDeleteTarget(null)}
              className={cn(
                "px-4 py-2 rounded-lg text-[0.78rem] font-medium",
                "text-text-secondary bg-bg-alt hover:bg-border-light",
                "transition-colors cursor-pointer",
              )}
            >
              取消
            </button>
            <button
              onClick={confirmDelete}
              className={cn(
                "px-4 py-2 rounded-lg text-[0.78rem] font-medium",
                "text-white bg-danger hover:bg-danger/90",
                "transition-colors cursor-pointer",
              )}
            >
              删除
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Folder row
// ════════════════════════════════════════════════════════════════

function FolderRow({
  folder,
  items,
  isExpanded,
  selectedId,
  animDelay,
  onToggle,
  onSelect,
  onRename,
  onDelete,
  onDeleteItem,
  onCreateFile,
  onDragStart,
  onDrop,
}: {
  folder: KnowledgeFolder;
  items: KnowledgeItem[];
  isExpanded: boolean;
  selectedId: string | null;
  animDelay: number;
  onToggle: () => void;
  onSelect: (id: string) => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onDeleteItem: (item: KnowledgeItem) => void;
  onCreateFile: () => void;
  onDragStart: (id: string) => void;
  onDrop: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(folder.name);
  const [dragOver, setDragOver] = useState(false);

  const commitRename = () => {
    setEditing(false);
    const trimmed = editName.trim();
    if (trimmed && trimmed !== folder.name) onRename(trimmed);
    else setEditName(folder.name);
  };

  return (
    <div
      style={{ animation: `fade-in 0.3s ease-out ${animDelay}ms both` }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(false);
        onDrop();
      }}
    >
      <div
        className={cn(
          "group w-full flex items-center gap-1.5 px-3 py-1.5",
          "text-[0.78rem] font-medium text-text-secondary",
          "hover:bg-bg-alt transition-colors",
          dragOver && "bg-primary-light/40 ring-1 ring-primary/30 rounded-md",
        )}
      >
        <button
          onClick={onToggle}
          className="shrink-0 cursor-pointer p-0.5"
        >
          {isExpanded ? (
            <ChevronDown size={13} className="text-text-muted" />
          ) : (
            <ChevronRight size={13} className="text-text-muted" />
          )}
        </button>
        {isExpanded ? (
          <FolderOpen size={14} className="text-sand shrink-0" />
        ) : (
          <FolderClosed size={14} className="text-sand shrink-0" />
        )}

        {editing ? (
          <input
            autoFocus
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") {
                setEditing(false);
                setEditName(folder.name);
              }
            }}
            className="flex-1 min-w-0 bg-bg border border-primary rounded px-1.5 py-0.5 text-[0.78rem] text-text outline-none"
          />
        ) : (
          <span
            className="truncate flex-1 cursor-pointer"
            onDoubleClick={() => {
              setEditName(folder.name);
              setEditing(true);
            }}
            onClick={onToggle}
          >
            {folder.name}
          </span>
        )}

        <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCreateFile();
            }}
            className="p-0.5 text-text-muted hover:text-primary transition-colors cursor-pointer"
            title="新建文件"
          >
            <FilePlus size={12} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditName(folder.name);
              setEditing(true);
            }}
            className="p-0.5 text-text-muted hover:text-primary transition-colors cursor-pointer"
            title="重命名"
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-0.5 text-text-muted hover:text-danger transition-colors cursor-pointer"
            title="删除"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="ml-3">
          {items.length === 0 ? (
            <div className="pl-7 py-1 text-[0.7rem] text-text-muted">
              空文件夹
            </div>
          ) : (
            items.map((item, di) => (
              <FileRow
                key={item.id}
                item={item}
                isSelected={selectedId === item.id}
                animDelay={di * 25}
                onSelect={() => onSelect(item.id)}
                onDelete={() => onDeleteItem(item)}
                onDragStart={() => onDragStart(item.id)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// File row
// ════════════════════════════════════════════════════════════════

function FileRow({
  item,
  isSelected,
  animDelay,
  onSelect,
  onDelete,
  onDragStart,
}: {
  item: KnowledgeItem;
  isSelected: boolean;
  animDelay: number;
  onSelect: () => void;
  onDelete: () => void;
  onDragStart: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onClick={onSelect}
      className={cn(
        "group w-full flex items-center gap-2 pl-5 pr-3 py-1.5 text-left",
        "text-[0.75rem] transition-colors cursor-pointer rounded-md mx-1",
        isSelected
          ? "bg-primary-light text-primary-active font-medium"
          : "text-text-secondary hover:bg-bg-alt",
      )}
      style={{ animation: `fade-in 0.25s ease-out ${animDelay}ms both` }}
    >
      <GripVertical
        size={11}
        className="shrink-0 opacity-0 group-hover:opacity-50 cursor-grab"
      />
      <FileText size={13} className="shrink-0" />
      <span className="truncate flex-1">{item.title}</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="hidden group-hover:flex p-0.5 text-text-muted hover:text-danger transition-colors cursor-pointer shrink-0"
        title="删除"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Editor panel
// ════════════════════════════════════════════════════════════════

function EditorPanel({
  item,
  onUpdate,
}: {
  item: KnowledgeItem;
  onUpdate: (params: {
    id: string;
    title?: string;
    content?: string;
    tagsJson?: string;
  }) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title);
  const [titleEditing, setTitleEditing] = useState(false);
  const [draftContent, setDraftContent] = useState(item.content ?? "");
  const [tagInput, setTagInput] = useState("");

  // sync when item changes
  const [trackId, setTrackId] = useState(item.id);
  if (item.id !== trackId) {
    setTrackId(item.id);
    setEditTitle(item.title);
    setDraftContent(item.content ?? "");
    setIsEditing(false);
    setTitleEditing(false);
    setTagInput("");
  }

  const tags: string[] = useMemo(() => {
    try {
      return JSON.parse(item.tags_json ?? "[]");
    } catch {
      return [];
    }
  }, [item.tags_json]);

  const charCount = (isEditing ? draftContent : item.content ?? "").length;

  const handleSave = () => {
    onUpdate({ id: item.id, content: draftContent });
    setIsEditing(false);
  };

  const commitTitle = () => {
    setTitleEditing(false);
    const t = editTitle.trim();
    if (t && t !== item.title) onUpdate({ id: item.id, title: t });
    else setEditTitle(item.title);
  };

  const addTag = (tag: string) => {
    const t = tag.trim();
    if (!t || tags.includes(t)) return;
    const next = [...tags, t];
    onUpdate({ id: item.id, tagsJson: JSON.stringify(next) });
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    const next = tags.filter((t) => t !== tag);
    onUpdate({ id: item.id, tagsJson: JSON.stringify(next) });
  };

  return (
    <div
      className="flex-1 min-w-0 bg-surface border border-border-light rounded-xl flex flex-col overflow-hidden"
      style={{ animation: "fade-in 0.35s ease-out 80ms both" }}
    >
      {/* Top bar */}
      <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-border-light">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {titleEditing ? (
            <input
              autoFocus
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitTitle();
                if (e.key === "Escape") {
                  setTitleEditing(false);
                  setEditTitle(item.title);
                }
              }}
              className="text-[0.9rem] font-semibold text-text bg-bg border border-primary rounded px-2 py-1 outline-none flex-1 min-w-0"
            />
          ) : (
            <h2
              className="text-[0.9rem] font-semibold text-text truncate cursor-pointer hover:text-primary transition-colors"
              onClick={() => {
                setEditTitle(item.title);
                setTitleEditing(true);
              }}
              title="点击修改标题"
            >
              {item.title}
            </h2>
          )}
          <span className="text-[0.65rem] text-text-muted shrink-0">
            {charCount} 字
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-3">
          {isEditing ? (
            <button
              onClick={handleSave}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg",
                "text-[0.75rem] font-medium text-white bg-primary",
                "hover:bg-primary-hover transition-colors cursor-pointer",
              )}
            >
              <Save size={13} />
              保存
            </button>
          ) : (
            <button
              onClick={() => {
                setDraftContent(item.content ?? "");
                setIsEditing(true);
              }}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg",
                "text-[0.75rem] font-medium text-primary-active bg-primary-light",
                "hover:bg-primary/10 transition-colors cursor-pointer",
              )}
            >
              <Pencil size={13} />
              编辑
            </button>
          )}
        </div>
      </div>

      {/* Editor area */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        <TiptapEditor
          content={isEditing ? draftContent : item.content ?? ""}
          onChange={setDraftContent}
          editable={isEditing}
          placeholder="开始输入内容..."
        />

        {/* Tags */}
        <div className="mt-8 pt-5 border-t border-border-light">
          <div className="flex items-center gap-2 mb-3">
            <Tag size={13} className="text-text-muted" />
            <span className="text-[0.78rem] font-medium text-text">标签</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {tags.map((tag) => (
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
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag(tagInput);
                }
              }}
              placeholder="输入标签，回车保存"
              className={cn(
                "px-2.5 py-1 rounded-full text-[0.72rem]",
                "border border-dashed border-border",
                "hover:border-primary focus:border-primary focus:outline-none",
                "bg-transparent text-text placeholder:text-text-muted",
                "transition-colors w-[130px]",
              )}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
