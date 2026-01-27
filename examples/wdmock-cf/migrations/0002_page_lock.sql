-- Add is_locked column to pages table
ALTER TABLE pages ADD COLUMN is_locked INTEGER NOT NULL DEFAULT 0;
