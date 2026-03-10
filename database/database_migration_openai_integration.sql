-- Migration: Add OpenAI integration tables for embeddings and match explanations

-- ============================================================
-- TABLE 1: profile_embeddings
-- Caches OpenAI text-embedding-3-small vectors for participants
-- ============================================================
CREATE TABLE IF NOT EXISTS profile_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id TEXT NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
  participant_id TEXT NOT NULL,
  participant_type TEXT NOT NULL CHECK (participant_type IN ('mentee', 'mentor')),
  embedding_text TEXT NOT NULL,
  embedding JSONB NOT NULL,
  model_name TEXT NOT NULL DEFAULT 'text-embedding-3-small',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(cohort_id, participant_id, participant_type)
);

CREATE INDEX IF NOT EXISTS idx_profile_embeddings_cohort
  ON profile_embeddings(cohort_id);

ALTER TABLE profile_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users"
  ON profile_embeddings FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ============================================================
-- TABLE 2: match_explanations
-- Caches LLM-generated match explanations
-- ============================================================
CREATE TABLE IF NOT EXISTS match_explanations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id TEXT NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
  mentee_id TEXT NOT NULL,
  mentor_id TEXT NOT NULL,
  explanation TEXT NOT NULL,
  model_used TEXT NOT NULL DEFAULT 'gpt-4o-mini',
  total_score NUMERIC,
  generated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(cohort_id, mentee_id, mentor_id)
);

CREATE INDEX IF NOT EXISTS idx_match_explanations_cohort
  ON match_explanations(cohort_id);

ALTER TABLE match_explanations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users"
  ON match_explanations FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
