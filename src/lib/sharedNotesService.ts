import { supabase } from './supabase';
import { Database } from '@/types/database';

type SharedNoteRow = Database['public']['Tables']['shared_notes']['Row'];
type SharedNoteInsert = Database['public']['Tables']['shared_notes']['Insert'];
type SharedNoteUpdate = Database['public']['Tables']['shared_notes']['Update'];

export interface SharedNote {
  id: string;
  title: string;
  content?: string;
  mentor_id: string;
  mentee_id: string;
  cohort_id: string;
  last_edited_by_id: string;
  last_edited_by_type: 'mentor' | 'mentee';
  version: number;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateSharedNoteInput {
  title: string;
  content?: string;
  mentor_id: string;
  mentee_id: string;
  cohort_id: string;
  last_edited_by_id: string;
  last_edited_by_type: 'mentor' | 'mentee';
}

export interface UpdateSharedNoteInput {
  title?: string;
  content?: string;
  last_edited_by_id: string;
  last_edited_by_type: 'mentor' | 'mentee';
}

// Convert database row to SharedNote interface
function dbSharedNoteToSharedNote(dbSharedNote: SharedNoteRow): SharedNote {
  return {
    id: dbSharedNote.id,
    title: dbSharedNote.title,
    content: dbSharedNote.content || undefined,
    mentor_id: dbSharedNote.mentor_id,
    mentee_id: dbSharedNote.mentee_id,
    cohort_id: dbSharedNote.cohort_id,
    last_edited_by_id: dbSharedNote.last_edited_by_id,
    last_edited_by_type: dbSharedNote.last_edited_by_type,
    version: dbSharedNote.version,
    is_archived: dbSharedNote.is_archived,
    created_at: dbSharedNote.created_at,
    updated_at: dbSharedNote.updated_at
  };
}

// Create a new shared note
export async function createSharedNote(noteData: CreateSharedNoteInput): Promise<SharedNote | null> {
  console.log('Creating shared note:', noteData);

  const insertData: SharedNoteInsert = {
    title: noteData.title,
    content: noteData.content || null,
    mentor_id: noteData.mentor_id,
    mentee_id: noteData.mentee_id,
    cohort_id: noteData.cohort_id,
    last_edited_by_id: noteData.last_edited_by_id,
    last_edited_by_type: noteData.last_edited_by_type,
    version: 1,
    is_archived: false
  };

  const { data, error } = await supabase
    .from('shared_notes')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('Error creating shared note:', error);
    return null;
  }

  console.log('Shared note created successfully:', data);
  return dbSharedNoteToSharedNote(data);
}

// Get shared notes for a mentor-mentee pair
export async function getSharedNotesForPair(mentorId: string, menteeId: string): Promise<SharedNote[]> {
  console.log('Fetching shared notes for pair:', { mentorId, menteeId });

  const { data, error } = await supabase
    .from('shared_notes')
    .select('*')
    .eq('mentor_id', mentorId)
    .eq('mentee_id', menteeId)
    .eq('is_archived', false)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching shared notes for pair:', error);
    return [];
  }

  return data.map(dbSharedNoteToSharedNote);
}

// Get shared notes for a user (all pairs they're involved in)
export async function getSharedNotesForUser(userId: string, userType: 'mentor' | 'mentee'): Promise<SharedNote[]> {
  console.log('Fetching shared notes for user:', { userId, userType });

  const idField = userType === 'mentor' ? 'mentor_id' : 'mentee_id';

  const { data, error } = await supabase
    .from('shared_notes')
    .select('*')
    .eq(idField, userId)
    .eq('is_archived', false)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching shared notes for user:', error);
    return [];
  }

  return data.map(dbSharedNoteToSharedNote);
}

// Get shared notes for a cohort
export async function getSharedNotesForCohort(cohortId: string): Promise<SharedNote[]> {
  console.log('Fetching shared notes for cohort:', cohortId);

  const { data, error } = await supabase
    .from('shared_notes')
    .select('*')
    .eq('cohort_id', cohortId)
    .eq('is_archived', false)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching shared notes for cohort:', error);
    return [];
  }

  return data.map(dbSharedNoteToSharedNote);
}

// Get a specific shared note by ID
export async function getSharedNoteById(noteId: string): Promise<SharedNote | null> {
  console.log('Fetching shared note:', noteId);

  const { data, error } = await supabase
    .from('shared_notes')
    .select('*')
    .eq('id', noteId)
    .single();

  if (error) {
    console.error('Error fetching shared note:', error);
    return null;
  }

  return dbSharedNoteToSharedNote(data);
}

// Update a shared note
export async function updateSharedNote(noteId: string, updates: UpdateSharedNoteInput): Promise<SharedNote | null> {
  console.log('Updating shared note:', noteId, updates);

  // First get the current note to increment version
  const currentNote = await getSharedNoteById(noteId);
  if (!currentNote) {
    console.error('Note not found for update');
    return null;
  }

  const updateData: SharedNoteUpdate = {
    ...(updates.title && { title: updates.title }),
    ...(updates.content !== undefined && { content: updates.content || null }),
    last_edited_by_id: updates.last_edited_by_id,
    last_edited_by_type: updates.last_edited_by_type,
    version: currentNote.version + 1
  };

  const { data, error } = await supabase
    .from('shared_notes')
    .update(updateData)
    .eq('id', noteId)
    .select()
    .single();

  if (error) {
    console.error('Error updating shared note:', error);
    return null;
  }

  console.log('Shared note updated successfully:', data);
  return dbSharedNoteToSharedNote(data);
}

// Archive a shared note
export async function archiveSharedNote(noteId: string, archivedById: string, archivedByType: 'mentor' | 'mentee'): Promise<boolean> {
  console.log('Archiving shared note:', noteId);

  const { error } = await supabase
    .from('shared_notes')
    .update({
      is_archived: true,
      last_edited_by_id: archivedById,
      last_edited_by_type: archivedByType
    })
    .eq('id', noteId);

  if (error) {
    console.error('Error archiving shared note:', error);
    return false;
  }

  console.log('Shared note archived successfully');
  return true;
}

// Delete a shared note
export async function deleteSharedNote(noteId: string): Promise<boolean> {
  console.log('Deleting shared note:', noteId);

  const { error } = await supabase
    .from('shared_notes')
    .delete()
    .eq('id', noteId);

  if (error) {
    console.error('Error deleting shared note:', error);
    return false;
  }

  console.log('Shared note deleted successfully');
  return true;
}

// Get shared notes statistics for a user
export async function getSharedNotesStats(userId: string, userType: 'mentor' | 'mentee'): Promise<{
  total: number;
  recent: number; // notes updated in last 7 days
  created_by_user: number;
}> {
  console.log('Fetching shared notes stats for user:', { userId, userType });

  const idField = userType === 'mentor' ? 'mentor_id' : 'mentee_id';

  const { data, error } = await supabase
    .from('shared_notes')
    .select('last_edited_by_id, last_edited_by_type, updated_at')
    .eq(idField, userId)
    .eq('is_archived', false);

  if (error) {
    console.error('Error fetching shared notes stats:', error);
    return { total: 0, recent: 0, created_by_user: 0 };
  }

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const stats = {
    total: data.length,
    recent: 0,
    created_by_user: 0
  };

  data.forEach(note => {
    // Count recent notes (updated in last 7 days)
    if (new Date(note.updated_at) >= sevenDaysAgo) {
      stats.recent++;
    }

    // Count notes last edited by this user
    if (note.last_edited_by_id === userId && note.last_edited_by_type === userType) {
      stats.created_by_user++;
    }
  });

  return stats;
}

// Restore an archived shared note
export async function restoreSharedNote(noteId: string, restoredById: string, restoredByType: 'mentor' | 'mentee'): Promise<boolean> {
  console.log('Restoring shared note:', noteId);

  const { error } = await supabase
    .from('shared_notes')
    .update({
      is_archived: false,
      last_edited_by_id: restoredById,
      last_edited_by_type: restoredByType
    })
    .eq('id', noteId);

  if (error) {
    console.error('Error restoring shared note:', error);
    return false;
  }

  console.log('Shared note restored successfully');
  return true;
}