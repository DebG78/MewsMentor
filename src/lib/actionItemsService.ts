import { supabase } from './supabase';
import { Database } from '@/types/database';

type ActionItemRow = Database['public']['Tables']['action_items']['Row'];
type ActionItemInsert = Database['public']['Tables']['action_items']['Insert'];
type ActionItemUpdate = Database['public']['Tables']['action_items']['Update'];

export interface ActionItem {
  id: string;
  title: string;
  description?: string;
  assignee_id: string;
  assignee_type: 'mentor' | 'mentee';
  assigner_id: string;
  assigner_type: 'mentor' | 'mentee';
  cohort_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
  completed_at?: string;
  completion_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateActionItemInput {
  title: string;
  description?: string;
  assignee_id: string;
  assignee_type: 'mentor' | 'mentee';
  assigner_id: string;
  assigner_type: 'mentor' | 'mentee';
  cohort_id: string;
  priority?: 'low' | 'medium' | 'high';
  due_date?: string;
}

export interface UpdateActionItemInput {
  title?: string;
  description?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high';
  due_date?: string;
  completion_notes?: string;
}

// Convert database row to ActionItem interface
function dbActionItemToActionItem(dbActionItem: ActionItemRow): ActionItem {
  return {
    id: dbActionItem.id,
    title: dbActionItem.title,
    description: dbActionItem.description || undefined,
    assignee_id: dbActionItem.assignee_id,
    assignee_type: dbActionItem.assignee_type,
    assigner_id: dbActionItem.assigner_id,
    assigner_type: dbActionItem.assigner_type,
    cohort_id: dbActionItem.cohort_id,
    status: dbActionItem.status,
    priority: dbActionItem.priority,
    due_date: dbActionItem.due_date || undefined,
    completed_at: dbActionItem.completed_at || undefined,
    completion_notes: dbActionItem.completion_notes || undefined,
    created_at: dbActionItem.created_at,
    updated_at: dbActionItem.updated_at
  };
}

// Create a new action item
export async function createActionItem(actionItemData: CreateActionItemInput): Promise<ActionItem | null> {
  console.log('Creating action item:', actionItemData);

  const insertData: ActionItemInsert = {
    title: actionItemData.title,
    description: actionItemData.description || null,
    assignee_id: actionItemData.assignee_id,
    assignee_type: actionItemData.assignee_type,
    assigner_id: actionItemData.assigner_id,
    assigner_type: actionItemData.assigner_type,
    cohort_id: actionItemData.cohort_id,
    priority: actionItemData.priority || 'medium',
    due_date: actionItemData.due_date || null,
    status: 'pending'
  };

  const { data, error } = await supabase
    .from('action_items')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('Error creating action item:', error);
    return null;
  }

  console.log('Action item created successfully:', data);
  return dbActionItemToActionItem(data);
}

// Get action items for a user
export async function getActionItemsForUser(userId: string, userType: 'mentor' | 'mentee'): Promise<ActionItem[]> {
  console.log('Fetching action items for user:', { userId, userType });

  const { data, error } = await supabase
    .from('action_items')
    .select('*')
    .eq('assignee_id', userId)
    .eq('assignee_type', userType)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching action items for user:', error);
    return [];
  }

  return data.map(dbActionItemToActionItem);
}

// Get action items created by a user
export async function getActionItemsCreatedByUser(userId: string, userType: 'mentor' | 'mentee'): Promise<ActionItem[]> {
  console.log('Fetching action items created by user:', { userId, userType });

  const { data, error } = await supabase
    .from('action_items')
    .select('*')
    .eq('assigner_id', userId)
    .eq('assigner_type', userType)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching action items created by user:', error);
    return [];
  }

  return data.map(dbActionItemToActionItem);
}

// Get action items for a mentor-mentee pair
export async function getActionItemsForPair(mentorId: string, menteeId: string): Promise<ActionItem[]> {
  console.log('Fetching action items for pair:', { mentorId, menteeId });

  const { data, error } = await supabase
    .from('action_items')
    .select('*')
    .or(`and(assignee_id.eq.${mentorId},assignee_type.eq.mentor),and(assignee_id.eq.${menteeId},assignee_type.eq.mentee),and(assigner_id.eq.${mentorId},assigner_type.eq.mentor),and(assigner_id.eq.${menteeId},assigner_type.eq.mentee)`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching action items for pair:', error);
    return [];
  }

  return data.map(dbActionItemToActionItem);
}

// Get action items for a cohort
export async function getActionItemsForCohort(cohortId: string): Promise<ActionItem[]> {
  console.log('Fetching action items for cohort:', cohortId);

  const { data, error } = await supabase
    .from('action_items')
    .select('*')
    .eq('cohort_id', cohortId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching action items for cohort:', error);
    return [];
  }

  return data.map(dbActionItemToActionItem);
}

// Update an action item
export async function updateActionItem(actionItemId: string, updates: UpdateActionItemInput): Promise<ActionItem | null> {
  console.log('Updating action item:', actionItemId, updates);

  const updateData: ActionItemUpdate = {
    ...(updates.title && { title: updates.title }),
    ...(updates.description !== undefined && { description: updates.description || null }),
    ...(updates.status && { status: updates.status }),
    ...(updates.priority && { priority: updates.priority }),
    ...(updates.due_date !== undefined && { due_date: updates.due_date || null }),
    ...(updates.completion_notes !== undefined && { completion_notes: updates.completion_notes || null })
  };

  // If marking as completed, set completed_at timestamp
  if (updates.status === 'completed') {
    updateData.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('action_items')
    .update(updateData)
    .eq('id', actionItemId)
    .select()
    .single();

  if (error) {
    console.error('Error updating action item:', error);
    return null;
  }

  console.log('Action item updated successfully:', data);
  return dbActionItemToActionItem(data);
}

// Delete an action item
export async function deleteActionItem(actionItemId: string): Promise<boolean> {
  console.log('Deleting action item:', actionItemId);

  const { error } = await supabase
    .from('action_items')
    .delete()
    .eq('id', actionItemId);

  if (error) {
    console.error('Error deleting action item:', error);
    return false;
  }

  console.log('Action item deleted successfully');
  return true;
}

// Mark action item as completed
export async function completeActionItem(actionItemId: string, completionNotes?: string): Promise<ActionItem | null> {
  return updateActionItem(actionItemId, {
    status: 'completed',
    completion_notes: completionNotes
  });
}

// Get action items statistics for a user
export async function getActionItemStats(userId: string, userType: 'mentor' | 'mentee'): Promise<{
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
  overdue: number;
}> {
  console.log('Fetching action item stats for user:', { userId, userType });

  const { data, error } = await supabase
    .from('action_items')
    .select('status, due_date')
    .eq('assignee_id', userId)
    .eq('assignee_type', userType);

  if (error) {
    console.error('Error fetching action item stats:', error);
    return { total: 0, pending: 0, in_progress: 0, completed: 0, overdue: 0 };
  }

  const now = new Date();
  const stats = {
    total: data.length,
    pending: 0,
    in_progress: 0,
    completed: 0,
    overdue: 0
  };

  data.forEach(item => {
    // Count by status
    if (item.status === 'pending') stats.pending++;
    else if (item.status === 'in_progress') stats.in_progress++;
    else if (item.status === 'completed') stats.completed++;

    // Count overdue items (pending or in_progress with due_date in the past)
    if (
      (item.status === 'pending' || item.status === 'in_progress') &&
      item.due_date &&
      new Date(item.due_date) < now
    ) {
      stats.overdue++;
    }
  });

  return stats;
}