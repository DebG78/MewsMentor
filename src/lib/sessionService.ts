import { supabase } from './supabase';
import { Session, SessionCreateInput, SessionUpdateInput, SessionStats } from '@/types/mentoring';

// Simplified session service for logging meetings (no scheduling complexity)

// Get all sessions (logged meetings) for a cohort
export async function getSessionsByCohort(cohortId: string): Promise<Session[]> {
  console.log('Fetching sessions for cohort:', cohortId);

  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('cohort_id', cohortId)
    .order('meeting_date', { ascending: false });

  if (error) {
    console.error('Error fetching sessions:', error);
    return [];
  }

  return data as Session[];
}

// Get sessions for a specific mentor-mentee pair
export async function getSessionsByPair(mentorId: string, menteeId: string): Promise<Session[]> {
  console.log('Fetching sessions for pair:', { mentorId, menteeId });

  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('mentor_id', mentorId)
    .eq('mentee_id', menteeId)
    .order('meeting_date', { ascending: false });

  if (error) {
    console.error('Error fetching sessions for pair:', error);
    return [];
  }

  return data as Session[];
}

// Get session by ID
export async function getSessionById(sessionId: string): Promise<Session | null> {
  console.log('Fetching session:', sessionId);

  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (error) {
    console.error('Error fetching session:', error);
    return null;
  }

  return data as Session;
}

// Create a new session (log a meeting)
export async function createSession(sessionData: SessionCreateInput): Promise<Session | null> {
  console.log('Logging meeting:', sessionData);

  const { data, error} = await supabase
    .from('sessions')
    .insert({
      mentor_id: sessionData.mentor_id,
      mentee_id: sessionData.mentee_id,
      cohort_id: sessionData.cohort_id,
      meeting_date: sessionData.meeting_date,
      notes: sessionData.notes || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating session:', error);
    throw error;
  }

  return data as Session;
}

// Update session (edit notes, add ratings/feedback)
export async function updateSession(sessionId: string, updates: SessionUpdateInput): Promise<Session | null> {
  console.log('Updating session:', sessionId, updates);

  const { data, error } = await supabase
    .from('sessions')
    .update(updates)
    .eq('id', sessionId)
    .select()
    .single();

  if (error) {
    console.error('Error updating session:', error);
    throw error;
  }

  return data as Session;
}

// Delete session
export async function deleteSession(sessionId: string): Promise<boolean> {
  console.log('Deleting session:', sessionId);

  const { error } = await supabase
    .from('sessions')
    .delete()
    .eq('id', sessionId);

  if (error) {
    console.error('Error deleting session:', error);
    return false;
  }

  return true;
}

// Get sessions statistics for a cohort
export async function getSessionStats(cohortId: string): Promise<SessionStats> {
  console.log('Calculating session stats for cohort:', cohortId);

  const sessions = await getSessionsByCohort(cohortId);

  // Get total matches (mentor-mentee pairs) for engagement calculation
  const { count: totalPairsCount } = await supabase
    .from('cohorts')
    .select('matches', { count: 'exact', head: true })
    .eq('id', cohortId);

  // Calculate unique pairs that have logged meetings
  const uniquePairs = new Set(sessions.map(s => `${s.mentor_id}-${s.mentee_id}`));
  const activePairs = uniquePairs.size;

  // Calculate total pairs from cohort matches (approximate if not available)
  const totalPairs = totalPairsCount || activePairs;

  // Calculate engagement rate
  const engagementRate = totalPairs > 0 ? (activePairs / totalPairs) * 100 : 0;

  // Calculate average meetings per pair
  const averageMeetingsPerPair = activePairs > 0 ? sessions.length / activePairs : 0;

  // Calculate average rating (if ratings exist)
  const ratingsProvided = sessions.filter(s => s.mentor_rating || s.mentee_rating);
  let averageRating: number | undefined = undefined;

  if (ratingsProvided.length > 0) {
    const totalRatings = ratingsProvided.reduce((sum, s) => {
      const mentorRating = s.mentor_rating || 0;
      const menteeRating = s.mentee_rating || 0;
      return sum + mentorRating + menteeRating;
    }, 0);
    const ratingCount = ratingsProvided.reduce((count, s) => {
      return count + (s.mentor_rating ? 1 : 0) + (s.mentee_rating ? 1 : 0);
    }, 0);
    averageRating = ratingCount > 0 ? totalRatings / ratingCount : undefined;
  }

  // Get last meeting date
  const lastMeetingDate = sessions.length > 0 ? sessions[0].meeting_date : undefined;

  return {
    total_meetings: sessions.length,
    active_pairs: activePairs,
    engagement_rate: Math.round(engagementRate * 10) / 10, // Round to 1 decimal
    average_meetings_per_pair: Math.round(averageMeetingsPerPair * 10) / 10,
    average_rating: averageRating ? Math.round(averageRating * 10) / 10 : undefined,
    last_meeting_date: lastMeetingDate,
  };
}

// Get all sessions for a user (as mentor or mentee)
export async function getSessionsByUser(userId: string, userType: 'mentor' | 'mentee'): Promise<Session[]> {
  console.log('Fetching sessions for user:', { userId, userType });

  const column = userType === 'mentor' ? 'mentor_id' : 'mentee_id';

  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq(column, userId)
    .order('meeting_date', { ascending: false });

  if (error) {
    console.error('Error fetching user sessions:', error);
    return [];
  }

  return data as Session[];
}

// Get meeting count for a specific pair
export async function getMeetingCountForPair(mentorId: string, menteeId: string): Promise<number> {
  console.log('Getting meeting count for pair:', { mentorId, menteeId });

  const { count, error } = await supabase
    .from('sessions')
    .select('*', { count: 'exact', head: true })
    .eq('mentor_id', mentorId)
    .eq('mentee_id', menteeId);

  if (error) {
    console.error('Error getting meeting count:', error);
    return 0;
  }

  return count || 0;
}

// Get last meeting date for a pair
export async function getLastMeetingDate(mentorId: string, menteeId: string): Promise<string | null> {
  console.log('Getting last meeting date for pair:', { mentorId, menteeId });

  const { data, error } = await supabase
    .from('sessions')
    .select('meeting_date')
    .eq('mentor_id', mentorId)
    .eq('mentee_id', menteeId)
    .order('meeting_date', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return data.meeting_date;
}
