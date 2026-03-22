-- 为 execution_messages 添加重新生成分组字段
-- regen_group: 同组重新生成消息共享同一个 group ID（原始消息的 ID）
-- regen_index: 在组内的序号（0 = 原始，1 = 第一次重新生成，以此类推）
ALTER TABLE execution_messages ADD COLUMN regen_group TEXT;
ALTER TABLE execution_messages ADD COLUMN regen_index INTEGER DEFAULT 0;
CREATE INDEX idx_messages_regen_group ON execution_messages(regen_group);
