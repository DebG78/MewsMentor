import { supabase } from './supabase';
import type {
  CohortStage,
  CreateCohortStageInput,
  UpdateCohortStageInput,
  ChecklistItem,
  DocumentLink,
  NextAction,
  StageStatus,
} from '@/types/runbook';
import { DEFAULT_STAGE_TEMPLATES } from '@/types/runbook';

// ============================================================================
// COHORT STAGES CRUD
// ============================================================================

/**
 * Get all stages for a cohort
 */
export async function getCohortStages(cohortId: string): Promise<CohortStage[]> {
  const { data, error } = await supabase
    .from('cohort_stages')
    .select('*')
    .eq('cohort_id', cohortId)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching cohort stages:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get a single stage by ID
 */
export async function getCohortStageById(stageId: string): Promise<CohortStage | null> {
  const { data, error } = await supabase
    .from('cohort_stages')
    .select('*')
    .eq('id', stageId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching cohort stage:', error);
    throw error;
  }

  return data;
}

/**
 * Initialize default stages for a cohort
 */
export async function initializeCohortStages(cohortId: string): Promise<CohortStage[]> {
  const stagesToInsert = DEFAULT_STAGE_TEMPLATES.map(template => ({
    cohort_id: cohortId,
    stage_type: template.stage_type,
    stage_name: template.stage_name,
    display_order: template.display_order,
    checklist: template.checklist || [],
    documents: [],
    status: 'pending' as StageStatus,
  }));

  const { data, error } = await supabase
    .from('cohort_stages')
    .insert(stagesToInsert)
    .select();

  if (error) {
    console.error('Error initializing cohort stages:', error);
    throw error;
  }

  return data || [];
}

/**
 * Create a new stage
 */
export async function createCohortStage(input: CreateCohortStageInput): Promise<CohortStage> {
  const { data, error } = await supabase
    .from('cohort_stages')
    .insert({
      cohort_id: input.cohort_id,
      stage_type: input.stage_type,
      stage_name: input.stage_name,
      owner: input.owner,
      due_date: input.due_date,
      checklist: input.checklist || [],
      documents: input.documents || [],
      notes: input.notes,
      display_order: input.display_order ?? 0,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating cohort stage:', error);
    throw error;
  }

  return data;
}

/**
 * Update a stage
 */
export async function updateCohortStage(
  stageId: string,
  updates: UpdateCohortStageInput
): Promise<CohortStage> {
  const { data, error } = await supabase
    .from('cohort_stages')
    .update(updates)
    .eq('id', stageId)
    .select()
    .single();

  if (error) {
    console.error('Error updating cohort stage:', error);
    throw error;
  }

  return data;
}

/**
 * Delete a stage
 */
export async function deleteCohortStage(stageId: string): Promise<void> {
  const { error } = await supabase
    .from('cohort_stages')
    .delete()
    .eq('id', stageId);

  if (error) {
    console.error('Error deleting cohort stage:', error);
    throw error;
  }
}

/**
 * Delete all stages for a cohort (delete entire runbook)
 */
export async function deleteAllCohortStages(cohortId: string): Promise<void> {
  const { error } = await supabase
    .from('cohort_stages')
    .delete()
    .eq('cohort_id', cohortId);

  if (error) {
    console.error('Error deleting all cohort stages:', error);
    throw error;
  }
}

/**
 * Complete all stages for a cohort at once
 */
export async function completeAllStages(cohortId: string): Promise<void> {
  const { error } = await supabase
    .from('cohort_stages')
    .update({
      status: 'completed',
      completed_date: new Date().toISOString()
    })
    .eq('cohort_id', cohortId);

  if (error) {
    console.error('Error completing all stages:', error);
    throw error;
  }
}

// ============================================================================
// STATUS UPDATES
// ============================================================================

/**
 * Start a stage (set to in_progress)
 */
export async function startStage(stageId: string): Promise<CohortStage> {
  return updateCohortStage(stageId, { status: 'in_progress' });
}

/**
 * Complete a stage
 */
export async function completeStage(stageId: string): Promise<CohortStage> {
  return updateCohortStage(stageId, {
    status: 'completed',
    completed_date: new Date().toISOString().split('T')[0],
  });
}

/**
 * Block a stage
 */
export async function blockStage(stageId: string, reason?: string): Promise<CohortStage> {
  const updates: UpdateCohortStageInput = { status: 'blocked' };
  if (reason) {
    updates.notes = reason;
  }
  return updateCohortStage(stageId, updates);
}

/**
 * Reset a stage to pending
 */
export async function resetStage(stageId: string): Promise<CohortStage> {
  return updateCohortStage(stageId, {
    status: 'pending',
    completed_date: undefined,
  });
}

// ============================================================================
// CHECKLIST MANAGEMENT
// ============================================================================

/**
 * Toggle a checklist item
 */
export async function toggleChecklistItem(
  stageId: string,
  itemId: string
): Promise<CohortStage> {
  const stage = await getCohortStageById(stageId);
  if (!stage) {
    throw new Error('Stage not found');
  }

  const updatedChecklist = stage.checklist.map(item => {
    if (item.id === itemId) {
      return {
        ...item,
        completed: !item.completed,
        completed_at: !item.completed ? new Date().toISOString() : undefined,
      };
    }
    return item;
  });

  return updateCohortStage(stageId, { checklist: updatedChecklist });
}

/**
 * Add a checklist item
 */
export async function addChecklistItem(
  stageId: string,
  text: string
): Promise<CohortStage> {
  const stage = await getCohortStageById(stageId);
  if (!stage) {
    throw new Error('Stage not found');
  }

  const newItem: ChecklistItem = {
    id: crypto.randomUUID(),
    text,
    completed: false,
  };

  const updatedChecklist = [...stage.checklist, newItem];
  return updateCohortStage(stageId, { checklist: updatedChecklist });
}

/**
 * Remove a checklist item
 */
export async function removeChecklistItem(
  stageId: string,
  itemId: string
): Promise<CohortStage> {
  const stage = await getCohortStageById(stageId);
  if (!stage) {
    throw new Error('Stage not found');
  }

  const updatedChecklist = stage.checklist.filter(item => item.id !== itemId);
  return updateCohortStage(stageId, { checklist: updatedChecklist });
}

/**
 * Update a checklist item text
 */
export async function updateChecklistItem(
  stageId: string,
  itemId: string,
  text: string
): Promise<CohortStage> {
  const stage = await getCohortStageById(stageId);
  if (!stage) {
    throw new Error('Stage not found');
  }

  const updatedChecklist = stage.checklist.map(item => {
    if (item.id === itemId) {
      return { ...item, text };
    }
    return item;
  });

  return updateCohortStage(stageId, { checklist: updatedChecklist });
}

// ============================================================================
// DOCUMENT MANAGEMENT
// ============================================================================

/**
 * Add a document link
 */
export async function addDocument(
  stageId: string,
  doc: Omit<DocumentLink, 'id' | 'added_at'>
): Promise<CohortStage> {
  const stage = await getCohortStageById(stageId);
  if (!stage) {
    throw new Error('Stage not found');
  }

  const newDoc: DocumentLink = {
    id: crypto.randomUUID(),
    ...doc,
    added_at: new Date().toISOString(),
  };

  const updatedDocuments = [...stage.documents, newDoc];
  return updateCohortStage(stageId, { documents: updatedDocuments });
}

/**
 * Remove a document link
 */
export async function removeDocument(
  stageId: string,
  docId: string
): Promise<CohortStage> {
  const stage = await getCohortStageById(stageId);
  if (!stage) {
    throw new Error('Stage not found');
  }

  const updatedDocuments = stage.documents.filter(doc => doc.id !== docId);
  return updateCohortStage(stageId, { documents: updatedDocuments });
}

// ============================================================================
// NEXT ACTIONS
// ============================================================================

/**
 * Get next actions across all cohorts for dashboard widget
 */
export async function getNextActions(limit: number = 10): Promise<NextAction[]> {
  const today = new Date().toISOString().split('T')[0];
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Get all non-completed stages with due dates or blocked status
  const { data: stages, error } = await supabase
    .from('cohort_stages')
    .select('*, cohorts(name)')
    .or(`status.eq.blocked,status.eq.in_progress,and(status.eq.pending,due_date.lte.${nextWeek})`)
    .neq('status', 'completed')
    .order('due_date', { ascending: true, nullsFirst: false })
    .limit(limit * 2); // Get more to filter

  if (error) {
    console.error('Error fetching next actions:', error);
    throw error;
  }

  const actions: NextAction[] = [];

  for (const stage of stages || []) {
    // Check for overdue
    if (stage.due_date && stage.due_date < today && stage.status !== 'completed') {
      actions.push({
        stage_id: stage.id,
        stage_name: stage.stage_name,
        stage_type: stage.stage_type,
        cohort_id: stage.cohort_id,
        cohort_name: stage.cohorts?.name,
        action_type: 'overdue',
        description: `${stage.stage_name} is overdue`,
        due_date: stage.due_date,
        priority: 'high',
      });
    }
    // Check for due soon
    else if (stage.due_date && stage.due_date <= nextWeek && stage.status !== 'completed') {
      actions.push({
        stage_id: stage.id,
        stage_name: stage.stage_name,
        stage_type: stage.stage_type,
        cohort_id: stage.cohort_id,
        cohort_name: stage.cohorts?.name,
        action_type: 'due_soon',
        description: `${stage.stage_name} due soon`,
        due_date: stage.due_date,
        priority: 'medium',
      });
    }
    // Check for blocked
    else if (stage.status === 'blocked') {
      actions.push({
        stage_id: stage.id,
        stage_name: stage.stage_name,
        stage_type: stage.stage_type,
        cohort_id: stage.cohort_id,
        cohort_name: stage.cohorts?.name,
        action_type: 'blocked',
        description: `${stage.stage_name} is blocked`,
        priority: 'high',
      });
    }
  }

  // Sort by priority and limit
  return actions
    .sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    })
    .slice(0, limit);
}

/**
 * Get runbook progress summary for a cohort
 */
export async function getRunbookProgress(cohortId: string): Promise<{
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  blocked: number;
  percentComplete: number;
}> {
  const stages = await getCohortStages(cohortId);

  const completed = stages.filter(s => s.status === 'completed').length;
  const inProgress = stages.filter(s => s.status === 'in_progress').length;
  const pending = stages.filter(s => s.status === 'pending').length;
  const blocked = stages.filter(s => s.status === 'blocked').length;
  const total = stages.length;

  return {
    total,
    completed,
    inProgress,
    pending,
    blocked,
    percentComplete: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}
