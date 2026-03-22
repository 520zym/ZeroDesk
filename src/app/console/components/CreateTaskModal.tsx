import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { useCreateTask } from "@/hooks/useTasks";
import { ExecutionMessage } from "@/types";

interface CreateTaskModalProps {
  msg: ExecutionMessage | null; // null 时不显示
  onClose: () => void;
}

export default function CreateTaskModal({ msg, onClose }: CreateTaskModalProps) {
  // 表单状态
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  // 成功反馈状态
  const [created, setCreated] = useState(false);

  const mutation = useCreateTask();

  // msg 变化时重置表单字段
  useEffect(() => {
    if (msg) {
      // 标题截取前 50 字，超出加省略号
      const rawTitle = msg.content.slice(0, 50);
      setTitle(msg.content.length > 50 ? rawTitle + "..." : rawTitle);
      setDescription(msg.content);
      setCreated(false);
    }
  }, [msg]);

  // 关闭时重置成功状态，避免下次打开残留
  const handleClose = () => {
    setCreated(false);
    onClose();
  };

  // 提交创建任务
  const handleCreate = () => {
    if (!title.trim() || mutation.isPending) return;

    mutation.mutate(
      { title: title.trim(), description: description.trim() || undefined },
      {
        onSuccess: () => {
          setCreated(true);
          // 200ms 后关闭
          setTimeout(() => {
            handleClose();
          }, 200);
        },
      }
    );
  };

  return (
    <Modal
      open={msg !== null}
      onClose={handleClose}
      title="创建任务"
    >
      <div className="space-y-4">
        {/* 任务标题 */}
        <div>
          <label className="block text-[0.78rem] font-medium text-text-secondary mb-1.5">
            任务标题
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 text-[0.82rem] bg-bg border border-border-light rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/30 text-text"
          />
        </div>

        {/* 任务描述 */}
        <div>
          <label className="block text-[0.78rem] font-medium text-text-secondary mb-1.5">
            任务描述
          </label>
          <textarea
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 text-[0.82rem] bg-bg border border-border-light rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/30 text-text resize-none"
          />
        </div>
      </div>

      {/* 底部按钮行 */}
      <div className="flex justify-end gap-2 mt-5">
        <button
          onClick={handleClose}
          className="px-4 py-2 text-[0.82rem] rounded-lg border border-border-light text-text-secondary hover:bg-bg-alt transition-colors cursor-pointer"
        >
          取消
        </button>
        <button
          onClick={handleCreate}
          disabled={mutation.isPending || created}
          className="px-4 py-2 text-[0.82rem] rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50"
        >
          {created ? "已创建 ✓" : mutation.isPending ? "创建中..." : "创建任务"}
        </button>
      </div>
    </Modal>
  );
}
