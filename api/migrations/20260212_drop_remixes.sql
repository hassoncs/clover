DROP TABLE IF EXISTS remixes;
DROP INDEX IF EXISTS idx_generation_jobs_remix;
ALTER TABLE generation_jobs DROP COLUMN remix_id;
