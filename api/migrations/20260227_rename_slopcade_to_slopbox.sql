-- Rename brand_id from 'slopcade' to 'slopbox' to match the canonical app name.
-- The Slopbox app queries brandId="slopbox" but templates/content were stored as "slopcade".

UPDATE party_game_templates SET brand_id = 'slopbox' WHERE brand_id = 'slopcade';
UPDATE party_content SET brand_id = 'slopbox' WHERE brand_id = 'slopcade';
UPDATE party_content_generation_jobs SET brand_id = 'slopbox' WHERE brand_id = 'slopcade';
