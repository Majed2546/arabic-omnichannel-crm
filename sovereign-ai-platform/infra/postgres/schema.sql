CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  language VARCHAR(20) DEFAULT 'mixed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS organization_units (id TEXT PRIMARY KEY, name VARCHAR(255) UNIQUE NOT NULL, mandate TEXT DEFAULT '');
CREATE TABLE IF NOT EXISTS capability_domains (id TEXT PRIMARY KEY, name VARCHAR(255) UNIQUE NOT NULL);
CREATE TABLE IF NOT EXISTS capability_areas (id TEXT PRIMARY KEY, name VARCHAR(255) NOT NULL, domain_id TEXT);
CREATE TABLE IF NOT EXISTS capabilities (
  id TEXT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  standardized_name VARCHAR(255) NOT NULL,
  domain VARCHAR(255) NOT NULL,
  area VARCHAR(255) NOT NULL,
  parent_capability VARCHAR(255),
  sub_capability VARCHAR(255),
  owner_unit_id TEXT,
  status VARCHAR(40) DEFAULT 'approved',
  description TEXT,
  original_name VARCHAR(255),
  original_standardized_name VARCHAR(255),
  original_domain VARCHAR(255),
  original_area VARCHAR(255),
  naming_audit JSONB
);
CREATE TABLE IF NOT EXISTS evidence (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id TEXT NOT NULL,
  quote TEXT NOT NULL,
  page INTEGER,
  confidence FLOAT DEFAULT 0.75
);
CREATE TABLE IF NOT EXISTS extracted_capabilities (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  name VARCHAR(255) NOT NULL,
  standardized_name VARCHAR(255) NOT NULL,
  domain VARCHAR(255) NOT NULL,
  area VARCHAR(255) NOT NULL,
  capability VARCHAR(255) NOT NULL,
  sub_capability VARCHAR(255),
  evidence_quote TEXT NOT NULL,
  confidence FLOAT NOT NULL,
  status VARCHAR(40) DEFAULT 'pending',
  published_capability_id TEXT,
  original_name VARCHAR(255),
  original_standardized_name VARCHAR(255),
  original_domain VARCHAR(255),
  original_area VARCHAR(255),
  capability_type VARCHAR(120),
  description TEXT,
  keywords JSONB,
  ontology_match_type VARCHAR(80),
  reviewer_notes TEXT,
  review_audit JSONB
);
CREATE TABLE IF NOT EXISTS processes (id TEXT PRIMARY KEY, name VARCHAR(255) UNIQUE NOT NULL, description TEXT DEFAULT '');
CREATE TABLE IF NOT EXISTS applications (id TEXT PRIMARY KEY, name VARCHAR(255) UNIQUE NOT NULL, description TEXT DEFAULT '');
CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, name VARCHAR(255) UNIQUE NOT NULL, description TEXT DEFAULT '', owner_unit_id TEXT);
CREATE TABLE IF NOT EXISTS initiatives (id TEXT PRIMARY KEY, name VARCHAR(255) UNIQUE NOT NULL, description TEXT DEFAULT '');
CREATE TABLE IF NOT EXISTS roles (id TEXT PRIMARY KEY, name VARCHAR(255) UNIQUE NOT NULL, responsibilities TEXT DEFAULT '');
CREATE TABLE IF NOT EXISTS kpis (id TEXT PRIMARY KEY, name VARCHAR(255) UNIQUE NOT NULL, target VARCHAR(255) DEFAULT '');
CREATE TABLE IF NOT EXISTS entity_relationships (
  id TEXT PRIMARY KEY,
  source_type VARCHAR(80) NOT NULL,
  source_id TEXT NOT NULL,
  relationship VARCHAR(80) NOT NULL,
  target_type VARCHAR(80) NOT NULL,
  target_id TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS overlap_findings (
  id TEXT PRIMARY KEY,
  source_type VARCHAR(80) NOT NULL,
  source_id TEXT NOT NULL,
  source_name VARCHAR(255) NOT NULL,
  target_type VARCHAR(80) NOT NULL,
  target_id TEXT NOT NULL,
  target_name VARCHAR(255) NOT NULL,
  overlap_type VARCHAR(80) NOT NULL,
  score INTEGER NOT NULL,
  explanation TEXT NOT NULL,
  recommendation VARCHAR(80) NOT NULL,
  evidence JSONB DEFAULT '{}'
);
