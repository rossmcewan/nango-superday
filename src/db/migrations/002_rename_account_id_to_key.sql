-- Rename account_id column to key in rate_limit_alerts table
ALTER TABLE rate_limit_alerts RENAME COLUMN account_id TO key; 