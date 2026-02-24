-- Add difficulty_score to party_content_reviews
-- Works like quality_score and humor_score: nullable integer 1-5
ALTER TABLE party_content_reviews ADD COLUMN difficulty_score INTEGER CHECK (difficulty_score IS NULL OR (difficulty_score >= 1 AND difficulty_score <= 5));
