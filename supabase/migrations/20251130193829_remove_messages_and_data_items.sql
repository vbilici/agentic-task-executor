-- Remove messages and data_items tables (not implementing US4 - Agent CRUD Operations)

-- Drop trigger for data_items
DROP TRIGGER IF EXISTS update_data_items_updated_at ON data_items;

-- Drop tables
DROP TABLE IF EXISTS data_items;
DROP TABLE IF EXISTS messages;

-- Drop message_role enum (no longer needed)
DROP TYPE IF EXISTS message_role;
