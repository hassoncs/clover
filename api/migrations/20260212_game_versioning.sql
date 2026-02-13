-- Migration: Add game versioning support (iOS-style: semver + build number)
-- Date: 2026-02-12

-- Add version columns to games table
ALTER TABLE games ADD COLUMN version TEXT DEFAULT '1.0.0';
ALTER TABLE games ADD COLUMN build_number INTEGER DEFAULT 1;

-- Update existing games to have initial version
UPDATE games SET version = '1.0.0', build_number = 1 WHERE version IS NULL;
