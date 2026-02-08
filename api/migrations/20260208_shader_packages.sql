CREATE TABLE IF NOT EXISTS shader_packages (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'deprecated')),
  engine_api_version TEXT NOT NULL,
  creator_id TEXT REFERENCES users(id),
  license TEXT NOT NULL DEFAULT 'open' CHECK (license IN ('open', 'custom', 'proprietary')),
  source_type TEXT NOT NULL DEFAULT 'user' CHECK (source_type IN ('system', 'user', 'ai')),
  moderation_status TEXT NOT NULL DEFAULT 'pending_review'
    CHECK (moderation_status IN ('pending_review', 'approved', 'rejected', 'published', 'deprecated')),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS shader_package_versions (
  id TEXT PRIMARY KEY,
  package_id TEXT NOT NULL REFERENCES shader_packages(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  graph_spec_r2_key TEXT NOT NULL,
  compiled_plan_r2_key TEXT NOT NULL,
  preview_r2_key TEXT,
  compiled_prompt TEXT,
  generation_job_id TEXT,
  published_at INTEGER,
  created_at INTEGER NOT NULL,
  UNIQUE(package_id, version)
);

CREATE INDEX IF NOT EXISTS idx_shader_packages_slug ON shader_packages(slug);
CREATE INDEX IF NOT EXISTS idx_shader_packages_status ON shader_packages(status);
CREATE INDEX IF NOT EXISTS idx_shader_packages_creator ON shader_packages(creator_id);
CREATE INDEX IF NOT EXISTS idx_shader_packages_moderation ON shader_packages(moderation_status);
CREATE INDEX IF NOT EXISTS idx_shader_package_versions_package ON shader_package_versions(package_id);
