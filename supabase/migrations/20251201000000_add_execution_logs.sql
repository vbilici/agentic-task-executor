-- Execution log event type enum
CREATE TYPE execution_log_event_type AS ENUM (
    'task_selected',
    'tool_call',
    'tool_result',
    'content',
    'reflection',
    'task_completed',
    'artifact_analysis_start',
    'artifact_analysis_complete',
    'artifact_created',
    'error',
    'done'
);

-- Execution logs table to persist SSE events for session reload
CREATE TABLE execution_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    event_type execution_log_event_type NOT NULL,
    event_data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_execution_logs_session_created ON execution_logs(session_id, created_at);
CREATE INDEX idx_execution_logs_task ON execution_logs(task_id);
