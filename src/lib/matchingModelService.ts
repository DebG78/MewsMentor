import { supabase } from './supabase';
import type {
  MatchingModel,
  MatchingModelWithCriteria,
  MatchingCriterion,
  MatchingRule,
  CreateMatchingModelInput,
  UpdateMatchingModelInput,
  CreateMatchingCriterionInput,
  CreateMatchingRuleInput,
  DEFAULT_MATCHING_WEIGHTS,
  DEFAULT_MATCHING_FILTERS,
} from '@/types/matching';

// ============================================================================
// MATCHING MODELS
// ============================================================================

/**
 * Get all matching models
 */
export async function getMatchingModels(): Promise<MatchingModel[]> {
  const { data, error } = await supabase
    .from('matching_models')
    .select('*')
    .order('name', { ascending: true })
    .order('version', { ascending: false });

  if (error) {
    console.error('Error fetching matching models:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get a matching model by ID
 */
export async function getMatchingModelById(id: string): Promise<MatchingModel | null> {
  const { data, error } = await supabase
    .from('matching_models')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('Error fetching matching model:', error);
    throw error;
  }

  return data;
}

/**
 * Get a matching model with its criteria and rules
 */
export async function getMatchingModelWithCriteria(id: string): Promise<MatchingModelWithCriteria | null> {
  const model = await getMatchingModelById(id);
  if (!model) return null;

  const [criteria, rules] = await Promise.all([
    getMatchingCriteria(id),
    getMatchingRules(id),
  ]);

  return {
    ...model,
    criteria,
    rules,
  };
}

/**
 * Get the default matching model
 */
export async function getDefaultMatchingModel(): Promise<MatchingModel | null> {
  const { data, error } = await supabase
    .from('matching_models')
    .select('*')
    .eq('is_default', true)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching default matching model:', error);
    throw error;
  }

  return data;
}

/**
 * Get active matching models
 */
export async function getActiveMatchingModels(): Promise<MatchingModel[]> {
  const { data, error } = await supabase
    .from('matching_models')
    .select('*')
    .eq('status', 'active')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching active matching models:', error);
    throw error;
  }

  return data || [];
}

/**
 * Create a new matching model
 */
export async function createMatchingModel(input: CreateMatchingModelInput): Promise<MatchingModel> {
  const weights = {
    topics: 40,
    industry: 15,
    seniority: 10,
    semantic: 20,
    timezone: 5,
    language: 5,
    capacity_penalty: 10,
    ...input.weights,
  };

  const filters = {
    min_language_overlap: 1,
    max_timezone_difference: 3,
    require_available_capacity: true,
    ...input.filters,
  };

  const { data, error } = await supabase
    .from('matching_models')
    .insert({
      name: input.name,
      description: input.description,
      weights,
      filters,
      created_by: input.created_by,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating matching model:', error);
    throw error;
  }

  return data;
}

/**
 * Create a new version of an existing matching model
 */
export async function createNewVersion(modelId: string): Promise<MatchingModel> {
  const existingModel = await getMatchingModelWithCriteria(modelId);
  if (!existingModel) {
    throw new Error('Model not found');
  }

  // Find the highest version for this model name
  const { data: versions } = await supabase
    .from('matching_models')
    .select('version')
    .eq('name', existingModel.name)
    .order('version', { ascending: false })
    .limit(1);

  const newVersion = (versions?.[0]?.version || 0) + 1;

  // Create new model
  const { data: newModel, error: modelError } = await supabase
    .from('matching_models')
    .insert({
      name: existingModel.name,
      version: newVersion,
      description: existingModel.description,
      status: 'draft',
      is_default: false,
      weights: existingModel.weights,
      filters: existingModel.filters,
      created_by: existingModel.created_by,
    })
    .select()
    .single();

  if (modelError) {
    console.error('Error creating new version:', modelError);
    throw modelError;
  }

  // Copy criteria
  if (existingModel.criteria.length > 0) {
    const criteriaToInsert = existingModel.criteria.map(c => ({
      matching_model_id: newModel.id,
      question_text: c.question_text,
      question_type: c.question_type,
      applies_to: c.applies_to,
      options: c.options,
      scoring_attribute: c.scoring_attribute,
      weight: c.weight,
      is_must_have: c.is_must_have,
      is_exclusion: c.is_exclusion,
      display_order: c.display_order,
      is_active: c.is_active,
    }));

    await supabase.from('matching_criteria').insert(criteriaToInsert);
  }

  // Copy rules
  if (existingModel.rules.length > 0) {
    const rulesToInsert = existingModel.rules.map(r => ({
      matching_model_id: newModel.id,
      rule_type: r.rule_type,
      name: r.name,
      description: r.description,
      condition: r.condition,
      action: r.action,
      priority: r.priority,
      is_active: r.is_active,
    }));

    await supabase.from('matching_rules').insert(rulesToInsert);
  }

  return newModel;
}

/**
 * Update a matching model
 */
export async function updateMatchingModel(id: string, updates: UpdateMatchingModelInput): Promise<MatchingModel> {
  const updateData: Record<string, unknown> = {};

  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.status !== undefined) updateData.status = updates.status;
  if (updates.is_default !== undefined) updateData.is_default = updates.is_default;

  // For weights and filters, merge with existing values
  if (updates.weights) {
    const existing = await getMatchingModelById(id);
    if (existing) {
      updateData.weights = { ...existing.weights, ...updates.weights };
    }
  }

  if (updates.filters) {
    const existing = await getMatchingModelById(id);
    if (existing) {
      updateData.filters = { ...existing.filters, ...updates.filters };
    }
  }

  // If setting as default, unset other defaults first
  if (updates.is_default === true) {
    await supabase
      .from('matching_models')
      .update({ is_default: false })
      .neq('id', id);
  }

  const { data, error } = await supabase
    .from('matching_models')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating matching model:', error);
    throw error;
  }

  return data;
}

/**
 * Archive a matching model
 */
export async function archiveMatchingModel(id: string): Promise<void> {
  await updateMatchingModel(id, { status: 'archived', is_default: false });
}

/**
 * Activate a matching model
 */
export async function activateMatchingModel(id: string): Promise<void> {
  await updateMatchingModel(id, { status: 'active' });
}

/**
 * Delete a matching model (only if draft)
 */
export async function deleteMatchingModel(id: string): Promise<void> {
  const model = await getMatchingModelById(id);
  if (!model) {
    throw new Error('Model not found');
  }

  if (model.status !== 'draft') {
    throw new Error('Can only delete draft models');
  }

  const { error } = await supabase
    .from('matching_models')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting matching model:', error);
    throw error;
  }
}

// ============================================================================
// MATCHING CRITERIA
// ============================================================================

/**
 * Get all criteria for a matching model
 */
export async function getMatchingCriteria(modelId: string): Promise<MatchingCriterion[]> {
  const { data, error } = await supabase
    .from('matching_criteria')
    .select('*')
    .eq('matching_model_id', modelId)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching matching criteria:', error);
    throw error;
  }

  return data || [];
}

/**
 * Create a new criterion
 */
export async function createMatchingCriterion(input: CreateMatchingCriterionInput): Promise<MatchingCriterion> {
  const { data, error } = await supabase
    .from('matching_criteria')
    .insert({
      matching_model_id: input.matching_model_id,
      question_text: input.question_text,
      question_type: input.question_type,
      applies_to: input.applies_to,
      options: input.options,
      scoring_attribute: input.scoring_attribute,
      weight: input.weight ?? 1.0,
      is_must_have: input.is_must_have ?? false,
      is_exclusion: input.is_exclusion ?? false,
      display_order: input.display_order ?? 0,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating matching criterion:', error);
    throw error;
  }

  return data;
}

/**
 * Update a criterion
 */
export async function updateMatchingCriterion(
  id: string,
  updates: Partial<Omit<MatchingCriterion, 'id' | 'matching_model_id' | 'created_at' | 'updated_at'>>
): Promise<MatchingCriterion> {
  const { data, error } = await supabase
    .from('matching_criteria')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating matching criterion:', error);
    throw error;
  }

  return data;
}

/**
 * Delete a criterion
 */
export async function deleteMatchingCriterion(id: string): Promise<void> {
  const { error } = await supabase
    .from('matching_criteria')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting matching criterion:', error);
    throw error;
  }
}

/**
 * Reorder criteria
 */
export async function reorderMatchingCriteria(modelId: string, criteriaIds: string[]): Promise<void> {
  const updates = criteriaIds.map((id, index) => ({
    id,
    display_order: index,
  }));

  for (const update of updates) {
    await supabase
      .from('matching_criteria')
      .update({ display_order: update.display_order })
      .eq('id', update.id);
  }
}

// ============================================================================
// MATCHING RULES
// ============================================================================

/**
 * Get all rules for a matching model
 */
export async function getMatchingRules(modelId: string): Promise<MatchingRule[]> {
  const { data, error } = await supabase
    .from('matching_rules')
    .select('*')
    .eq('matching_model_id', modelId)
    .order('priority', { ascending: true });

  if (error) {
    console.error('Error fetching matching rules:', error);
    throw error;
  }

  return data || [];
}

/**
 * Create a new rule
 */
export async function createMatchingRule(input: CreateMatchingRuleInput): Promise<MatchingRule> {
  const { data, error } = await supabase
    .from('matching_rules')
    .insert({
      matching_model_id: input.matching_model_id,
      rule_type: input.rule_type,
      name: input.name,
      description: input.description,
      condition: input.condition,
      action: input.action,
      priority: input.priority ?? 0,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating matching rule:', error);
    throw error;
  }

  return data;
}

/**
 * Update a rule
 */
export async function updateMatchingRule(
  id: string,
  updates: Partial<Omit<MatchingRule, 'id' | 'matching_model_id' | 'created_at' | 'updated_at'>>
): Promise<MatchingRule> {
  const { data, error } = await supabase
    .from('matching_rules')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating matching rule:', error);
    throw error;
  }

  return data;
}

/**
 * Delete a rule
 */
export async function deleteMatchingRule(id: string): Promise<void> {
  const { error } = await supabase
    .from('matching_rules')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting matching rule:', error);
    throw error;
  }
}
