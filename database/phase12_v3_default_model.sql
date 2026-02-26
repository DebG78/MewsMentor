-- Phase 12: V3 LLM-Enhanced Default Matching Model
-- Adds a default model tuned for V3 survey data (free-text + LLM pairwise scoring)

-- Step 1: Unset existing defaults
UPDATE matching_models SET is_default = false WHERE is_default = true;

-- Step 2: Insert V3 LLM-Enhanced default model
INSERT INTO matching_models (id, name, version, description, status, is_default, weights, filters)
VALUES (
  gen_random_uuid(),
  'V3 LLM-Enhanced',
  1,
  'Default model for V3 survey data. Uses OpenAI LLM pairwise scoring (45%) + semantic embeddings (20%) + seniority fit (12%) + compatibility (10%) + department diversity (8%) + timezone (5%).',
  'active',
  true,
  '{"llm_content":45,"capability":0,"semantic":20,"domain":0,"seniority":12,"timezone":5,"capacity_penalty":10,"compatibility":10,"proficiency_gap":0,"department_diversity":8}',
  '{"max_timezone_difference":6,"require_available_capacity":true}'
);
