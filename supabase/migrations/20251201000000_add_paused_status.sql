-- Add 'paused' value to session_status enum
ALTER TYPE session_status ADD VALUE 'paused' AFTER 'executing';

-- Add 'paused' value to execution_log_event_type enum
ALTER TYPE execution_log_event_type ADD VALUE 'paused';
