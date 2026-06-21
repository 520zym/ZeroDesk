-- 对话补充：会话 Prompt 与回复使用量统计

ALTER TABLE chat_conversations ADD COLUMN system_prompt TEXT;

ALTER TABLE chat_messages ADD COLUMN duration_ms INTEGER;

ALTER TABLE chat_messages ADD COLUMN tokens_per_second REAL;
