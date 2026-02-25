import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "tiptap-markdown";
import { useEffect, useCallback } from "react";

function getEditorMarkdown(editor: Editor): string {
  // tiptap-markdown stores getMarkdown on editor.storage.markdown
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (editor.storage as any).markdown.getMarkdown();
}
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Minus,
  Undo,
  Redo,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TiptapEditorProps {
  content: string;
  onChange?: (markdown: string) => void;
  editable: boolean;
  placeholder?: string;
}

export function TiptapEditor({
  content,
  onChange,
  editable,
  placeholder = "开始输入内容...",
}: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({ placeholder }),
      Markdown.configure({
        html: false,
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor: e }) => {
      onChange?.(getEditorMarkdown(e));
    },
    editorProps: {
      attributes: {
        class: cn(
          "prose-sm max-w-none focus:outline-none min-h-[200px] px-1",
          "text-[0.82rem] text-text leading-relaxed",
        ),
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(editable);
  }, [editor, editable]);

  useEffect(() => {
    if (!editor || editor.isFocused) return;
    const currentMd = getEditorMarkdown(editor);
    if (currentMd !== content) {
      editor.commands.setContent(content);
    }
  }, [editor, content]);

  if (!editor) return null;

  return (
    <div className="flex flex-col">
      {editable && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor) return null;

  const btn = useCallback(
    (
      action: () => void,
      active: boolean,
      icon: React.ReactNode,
      title: string,
    ) => (
      <button
        type="button"
        onClick={action}
        title={title}
        className={cn(
          "w-7 h-7 flex items-center justify-center rounded-md transition-colors cursor-pointer",
          active
            ? "bg-primary-light text-primary"
            : "text-text-muted hover:text-text hover:bg-bg-alt",
        )}
      >
        {icon}
      </button>
    ),
    [],
  );

  return (
    <div className="flex items-center gap-0.5 pb-3 mb-3 border-b border-border-light flex-wrap">
      {btn(
        () => editor.chain().focus().toggleBold().run(),
        editor.isActive("bold"),
        <Bold size={14} />,
        "粗体",
      )}
      {btn(
        () => editor.chain().focus().toggleItalic().run(),
        editor.isActive("italic"),
        <Italic size={14} />,
        "斜体",
      )}

      <div className="w-px h-4 bg-border mx-1" />

      {btn(
        () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
        editor.isActive("heading", { level: 1 }),
        <Heading1 size={14} />,
        "标题 1",
      )}
      {btn(
        () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
        editor.isActive("heading", { level: 2 }),
        <Heading2 size={14} />,
        "标题 2",
      )}
      {btn(
        () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
        editor.isActive("heading", { level: 3 }),
        <Heading3 size={14} />,
        "标题 3",
      )}

      <div className="w-px h-4 bg-border mx-1" />

      {btn(
        () => editor.chain().focus().toggleBulletList().run(),
        editor.isActive("bulletList"),
        <List size={14} />,
        "无序列表",
      )}
      {btn(
        () => editor.chain().focus().toggleOrderedList().run(),
        editor.isActive("orderedList"),
        <ListOrdered size={14} />,
        "有序列表",
      )}
      {btn(
        () => editor.chain().focus().toggleBlockquote().run(),
        editor.isActive("blockquote"),
        <Quote size={14} />,
        "引用",
      )}
      {btn(
        () => editor.chain().focus().toggleCodeBlock().run(),
        editor.isActive("codeBlock"),
        <Code size={14} />,
        "代码块",
      )}
      {btn(
        () => editor.chain().focus().setHorizontalRule().run(),
        false,
        <Minus size={14} />,
        "分割线",
      )}

      <div className="w-px h-4 bg-border mx-1" />

      {btn(
        () => editor.chain().focus().undo().run(),
        false,
        <Undo size={14} />,
        "撤销",
      )}
      {btn(
        () => editor.chain().focus().redo().run(),
        false,
        <Redo size={14} />,
        "重做",
      )}
    </div>
  );
}
