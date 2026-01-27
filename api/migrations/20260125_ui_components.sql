-- Add UI component metadata columns to asset_packs
-- These columns are nullable to maintain backward compatibility with existing asset packs

ALTER TABLE asset_packs ADD COLUMN component_type TEXT;
ALTER TABLE asset_packs ADD COLUMN nine_patch_margins_json TEXT;
ALTER TABLE asset_packs ADD COLUMN generation_strategy TEXT;

-- component_type: 'button', 'checkbox', 'radio', 'slider', 'panel', 'progress_bar', 'list_item', 'dropdown', 'toggle_switch'
-- nine_patch_margins_json: JSON object like {"left": 12, "right": 12, "top": 12, "bottom": 12}
-- generation_strategy: 'sequential' (base + variations), future: 'parallel', 'single'
