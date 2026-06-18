-- ============================================================
-- SUPABASE SCHEMA FOR EDICTOS SCRAPER
-- ============================================================
-- Run this SQL in Supabase SQL Editor to create the table
-- https://app.supabase.com/project/YOUR_PROJECT/sql

-- Create main table
CREATE TABLE IF NOT EXISTS edictos (
  id BIGINT PRIMARY KEY,
  titulo TEXT NOT NULL,
  contenido TEXT NOT NULL,
  fecha_publicacion TIMESTAMP NOT NULL,
  url TEXT,
  hash TEXT,
  scraped_at TIMESTAMP DEFAULT now(),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Create indices for performance
CREATE UNIQUE INDEX IF NOT EXISTS idx_edictos_id ON edictos(id);
CREATE INDEX IF NOT EXISTS idx_edictos_fecha ON edictos(fecha_publicacion DESC);
CREATE INDEX IF NOT EXISTS idx_edictos_updated ON edictos(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_edictos_hash ON edictos(hash);

-- Enable Row Level Security (optional)
ALTER TABLE edictos ENABLE ROW LEVEL SECURITY;

-- Allow public read access (optional)
CREATE POLICY "Allow public read" ON edictos
  FOR SELECT
  USING (true);

-- Restrict write to service role (if using RLS)
CREATE POLICY "Allow service role write" ON edictos
  FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- Verification queries (run after creation)
-- ============================================================

-- Check table exists
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'edictos';

-- Check indices
SELECT indexname FROM pg_indexes
WHERE tablename = 'edictos' AND schemaname = 'public';

-- Check table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'edictos'
ORDER BY ordinal_position;
