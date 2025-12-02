-- Add pause_requested column for manual pause functionality
-- When set to TRUE, the execution loop will pause at the next checkpoint
ALTER TABLE execution_connections
ADD COLUMN pause_requested BOOLEAN NOT NULL DEFAULT FALSE;
