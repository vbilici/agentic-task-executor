-- Execution connections table for tracking active SSE connections
-- Used to detect client disconnects in Cloud Run where TCP disconnect signals
-- are not reliably forwarded to the container.
CREATE TABLE execution_connections (
    session_id UUID PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
    connection_id UUID NOT NULL,
    last_heartbeat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for cleanup of stale connections (optional maintenance)
CREATE INDEX idx_execution_connections_last_heartbeat ON execution_connections(last_heartbeat);
