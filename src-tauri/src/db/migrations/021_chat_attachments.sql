-- 对话附件：附件独立存储，消息展示与模型上下文解耦

CREATE TABLE IF NOT EXISTS chat_attachments (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
    message_id TEXT NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    mime_type TEXT,
    size_bytes INTEGER NOT NULL DEFAULT 0,
    content_text TEXT,
    status TEXT NOT NULL DEFAULT 'ready' CHECK(status IN ('ready','unsupported','failed')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_chat_attachments_conversation_message
    ON chat_attachments(conversation_id, message_id, created_at ASC);
