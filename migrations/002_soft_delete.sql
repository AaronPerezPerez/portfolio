-- Añadir columna deleted_at a messages para soft delete
ALTER TABLE messages ADD COLUMN deleted_at DATETIME DEFAULT NULL;

-- Índice para queries eficientes
CREATE INDEX IF NOT EXISTS idx_messages_deleted_at ON messages(deleted_at);
