import { supabase } from './supabase';

// Use DB schema types directly
export type SessionStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';

export interface SessionRow {
  id: string;
  mentor_id: string;
  mentee_id: string;
  cohort_id: string;
  title: string;
  description: string | null;
  scheduled_datetime: string;
  duration_minutes: number;
  status: SessionStatus;
  meeting_url: string | null;
  meeting_id: string | null;
  notes: string | null;
  mentor_rating: number | null;
  mentee_rating: number | null;
  mentor_feedback: string | null;
  mentee_feedback: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSessionInput {
  mentor_id: string;
  mentee_id: string;
  cohort_id: string;
  title: string;
  description?: string;
  scheduled_datetime: string;
  duration_minutes?: number;
  status?: SessionStatus;
  notes?: string;
}

export interface UpdateSessionInput {
  title?: string;
  description?: string;
  scheduled_datetime?: string;
  duration_minutes?: number;
  status?: SessionStatus;
  notes?: string;
  mentor_rating?: number;
  mentee_rating?: number;
  mentor_feedback?: string;
  mentee_feedback?: string;
}

export interface SessionStats {
  total: number;
  completed: number;
  scheduled: number;
  cancelled: number;
  noShow: number;
  completionRate: number;
  avgMentorRating: number | null;
  avgMenteeRating: number | null;
}

export interface PairSessionSummary {
  mentor_id: string;
  mentee_id: string;
  sessionCount: number;
  completedCount: number;
  lastSessionDate: string | null;
  avgMentorRating: number | null;
  avgMenteeRating: number | null;
}

export interface SessionVolumePoint {
  month: string;
  completed: number;
  scheduled: number;
  cancelled: number;
  noShow: number;
}

// ============================================================================
// SESSION CRUD
// ============================================================================

export async function getSessionsByCohort(cohortId: string): Promise<SessionRow[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('cohort_id', cohortId)
    .order('scheduled_datetime', { ascending: false });

  if (error) {
    console.error('Error fetching sessions:', error);
    throw error;
  }

  return data || [];
}

export async function getSessionsByPair(
  cohortId: string,
  mentorId: string,
  menteeId: string
): Promise<SessionRow[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('cohort_id', cohortId)
    .eq('mentor_id', mentorId)
    .eq('mentee_id', menteeId)
    .order('scheduled_datetime', { ascending: false });

  if (error) {
    console.error('Error fetching pair sessions:', error);
    throw error;
  }

  return data || [];
}

export async function createSession(input: CreateSessionInput): Promise<SessionRow> {
  const { data, error } = await supabase
    .from('sessions')
    .insert({
      mentor_id: input.mentor_id,
      mentee_id: input.mentee_id,
      cohort_id: input.cohort_id,
      title: input.title,
      description: input.description,
      scheduled_datetime: input.scheduled_datetime,
      duration_minutes: input.duration_minutes || 60,
      status: input.status || 'scheduled',
      notes: input.notes,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating session:', error);
    throw error;
  }

  return data;
}

export async function updateSession(id: string, updates: UpdateSessionInput): Promise<SessionRow> {
  const { data, error } = await supabase
    .from('sessions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating session:', error);
    throw error;
  }

  return data;
}

export async function completeSession(
  id: string,
  mentorRating?: number,
  menteeRating?: number,
  notes?: string
): Promise<SessionRow> {
  const updates: UpdateSessionInput = {
    status: 'completed',
  };
  if (mentorRating !== undefined) updates.mentor_rating = mentorRating;
  if (menteeRating !== undefined) updates.mentee_rating = menteeRating;
  if (notes !== undefined) updates.notes = notes;

  return updateSession(id, updates);
}

export async function deleteSession(id: string): Promise<void> {
  const { error } = await supabase
    .from('sessions')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting session:', error);
    throw error;
  }
}

// ============================================================================
// ANALYTICS
// ============================================================================

export async function getSessionStats(cohortId: string): Promise<SessionStats> {
  const sessions = await getSessionsByCohort(cohortId);

  const completed = sessions.filter(s => s.status === 'completed');
  const scheduled = sessions.filter(s => s.status === 'scheduled');
  const cancelled = sessions.filter(s => s.status === 'cancelled');
  const noShow = sessions.filter(s => s.status === 'no_show');

  const mentorRatings = completed
    .map(s => s.mentor_rating)
    .filter((r): r is number => r !== null);
  const menteeRatings = completed
    .map(s => s.mentee_rating)
    .filter((r): r is number => r !== null);

  return {
    total: sessions.length,
    completed: completed.length,
    scheduled: scheduled.length,
    cancelled: cancelled.length,
    noShow: noShow.length,
    completionRate: sessions.length > 0
      ? (completed.length / sessions.length) * 100
      : 0,
    avgMentorRating: mentorRatings.length > 0
      ? mentorRatings.reduce((a, b) => a + b, 0) / mentorRatings.length
      : null,
    avgMenteeRating: menteeRatings.length > 0
      ? menteeRatings.reduce((a, b) => a + b, 0) / menteeRatings.length
      : null,
  };
}

export function computeSessionVolume(sessions: SessionRow[]): SessionVolumePoint[] {
  const monthMap = new Map<string, SessionVolumePoint>();

  for (const session of sessions) {
    const date = new Date(session.scheduled_datetime);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!monthMap.has(month)) {
      monthMap.set(month, { month, completed: 0, scheduled: 0, cancelled: 0, noShow: 0 });
    }
    const entry = monthMap.get(month)!;
    if (session.status === 'completed') entry.completed++;
    else if (session.status === 'scheduled') entry.scheduled++;
    else if (session.status === 'cancelled') entry.cancelled++;
    else if (session.status === 'no_show') entry.noShow++;
  }

  return Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month));
}

export function computePairSessionSummaries(sessions: SessionRow[]): PairSessionSummary[] {
  const pairMap = new Map<string, PairSessionSummary>();

  for (const session of sessions) {
    const key = `${session.mentor_id}:${session.mentee_id}`;

    if (!pairMap.has(key)) {
      pairMap.set(key, {
        mentor_id: session.mentor_id,
        mentee_id: session.mentee_id,
        sessionCount: 0,
        completedCount: 0,
        lastSessionDate: null,
        avgMentorRating: null,
        avgMenteeRating: null,
      });
    }

    const pair = pairMap.get(key)!;
    pair.sessionCount++;
    if (session.status === 'completed') pair.completedCount++;

    const sessionDate = session.scheduled_datetime.split('T')[0];
    if (!pair.lastSessionDate || sessionDate > pair.lastSessionDate) {
      pair.lastSessionDate = sessionDate;
    }
  }

  // Calculate average ratings per pair
  for (const [key, pair] of pairMap) {
    const pairSessions = sessions.filter(
      s => s.mentor_id === pair.mentor_id && s.mentee_id === pair.mentee_id && s.status === 'completed'
    );
    const mentorRatings = pairSessions.map(s => s.mentor_rating).filter((r): r is number => r !== null);
    const menteeRatings = pairSessions.map(s => s.mentee_rating).filter((r): r is number => r !== null);

    pair.avgMentorRating = mentorRatings.length > 0
      ? mentorRatings.reduce((a, b) => a + b, 0) / mentorRatings.length
      : null;
    pair.avgMenteeRating = menteeRatings.length > 0
      ? menteeRatings.reduce((a, b) => a + b, 0) / menteeRatings.length
      : null;
  }

  return Array.from(pairMap.values()).sort((a, b) => b.sessionCount - a.sessionCount);
}

export function computeRatingDistribution(sessions: SessionRow[]): { rating: string; mentor: number; mentee: number }[] {
  const dist = [
    { rating: '1', mentor: 0, mentee: 0 },
    { rating: '2', mentor: 0, mentee: 0 },
    { rating: '3', mentor: 0, mentee: 0 },
    { rating: '4', mentor: 0, mentee: 0 },
    { rating: '5', mentor: 0, mentee: 0 },
  ];

  for (const session of sessions) {
    if (session.mentor_rating !== null) {
      const idx = Math.min(Math.max(Math.round(session.mentor_rating) - 1, 0), 4);
      dist[idx].mentor++;
    }
    if (session.mentee_rating !== null) {
      const idx = Math.min(Math.max(Math.round(session.mentee_rating) - 1, 0), 4);
      dist[idx].mentee++;
    }
  }

  return dist;
}
