-- Add operator_name to audit_log so we don't lose actor info even if user is deleted
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS operator_name TEXT;
