import { supabase } from './supabase';
import { Database } from '@/types/database';
import { MenteeMatchStatus } from './supabaseService';

// Extend the database types to include our new table
export interface MenteeRecommendation {
  id: string;
  mentee_id: string;
  cohort_id: string;
  recommendation_key: string;
  title: string;
  description: string;
  icon: string;
  stage: MenteeMatchStatus;
  display_order: number;
  is_completed: boolean;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface RecommendationTemplate {
  key: string;
  title: string;
  description: string;
  icon: string;
  stage: MenteeMatchStatus;
  order: number;
}

// Default recommendation templates for each stage
export const RECOMMENDATION_TEMPLATES: Record<MenteeMatchStatus, RecommendationTemplate[]> = {
  unassigned: [
    {
      key: 'complete_profile',
      title: 'Complete your profile',
      description: 'Make sure all your signup details are accurate to help us find the perfect mentor match.',
      icon: 'User',
      stage: 'unassigned',
      order: 1
    },
    {
      key: 'review_goals',
      title: 'Review your learning goals',
      description: 'Revisit the topics you want to learn and make sure they reflect your current priorities.',
      icon: 'Target',
      stage: 'unassigned',
      order: 2
    },
    {
      key: 'set_expectations',
      title: 'Set your expectations',
      description: 'Think about what you want to get out of this mentorship and what success looks like.',
      icon: 'CheckCircle2',
      stage: 'unassigned',
      order: 3
    }
  ],
  awaiting_match: [
    {
      key: 'clarify_goals',
      title: 'Clarify your mentoring goals',
      description: 'Draft three concrete outcomes you\'d love to achieve during the sprint.',
      icon: 'Sparkles',
      stage: 'awaiting_match',
      order: 1
    },
    {
      key: 'prepare_availability',
      title: 'Prepare availability',
      description: 'Share preferred days and times so scheduling your first session is easy.',
      icon: 'Compass',
      stage: 'awaiting_match',
      order: 2
    },
    {
      key: 'gather_context',
      title: 'Gather context',
      description: 'Collect recent wins or challenges to give your mentor a rich starting point.',
      icon: 'Layers',
      stage: 'awaiting_match',
      order: 3
    }
  ],
  match_pending: [
    {
      key: 'review_mentor_profiles',
      title: 'Review mentor recommendations',
      description: 'Look through the recommended mentors and think about which one aligns best with your goals.',
      icon: 'Users',
      stage: 'match_pending',
      order: 1
    },
    {
      key: 'prepare_questions',
      title: 'Prepare your questions',
      description: 'Draft questions you want to ask your mentor about their experience and approach.',
      icon: 'MessageCircle',
      stage: 'match_pending',
      order: 2
    },
    {
      key: 'share_preference',
      title: 'Share your preference',
      description: 'Let your program manager know which mentor you\'d prefer to work with and why.',
      icon: 'ThumbsUp',
      stage: 'match_pending',
      order: 3
    }
  ],
  matched: [
    {
      key: 'introduce_yourself',
      title: 'Introduce yourself',
      description: 'Send a message to your mentor sharing a bit about yourself and what you hope to work on.',
      icon: 'Mail',
      stage: 'matched',
      order: 1
    },
    {
      key: 'schedule_kickoff',
      title: 'Schedule your kickoff session',
      description: 'Work with your mentor to find a time for your first session together.',
      icon: 'Calendar',
      stage: 'matched',
      order: 2
    },
    {
      key: 'prepare_session_topics',
      title: 'Prepare session topics',
      description: 'List 2-3 specific topics or challenges you want to discuss in your first session.',
      icon: 'FileText',
      stage: 'matched',
      order: 3
    },
    {
      key: 'set_cadence',
      title: 'Agree on meeting cadence',
      description: 'Discuss and confirm how often you\'ll meet and what the session format will be.',
      icon: 'Repeat',
      stage: 'matched',
      order: 4
    }
  ]
};

// Initialize recommendations for a mentee based on their current stage
export async function initializeRecommendationsForMentee(
  menteeId: string,
  cohortId: string,
  stage: MenteeMatchStatus
): Promise<MenteeRecommendation[]> {
  const templates = RECOMMENDATION_TEMPLATES[stage];

  if (!templates || templates.length === 0) {
    return [];
  }

  const recommendations = templates.map(template => ({
    mentee_id: menteeId,
    cohort_id: cohortId,
    recommendation_key: template.key,
    title: template.title,
    description: template.description,
    icon: template.icon,
    stage: template.stage,
    display_order: template.order,
    is_completed: false
  }));

  const { data, error } = await supabase
    .from('mentee_recommendations')
    .upsert(recommendations, { onConflict: 'mentee_id,recommendation_key', ignoreDuplicates: false })
    .select();

  if (error) {
    console.error('Error initializing recommendations:', error);
    return [];
  }

  return data as MenteeRecommendation[];
}

// Get recommendations for a mentee at their current stage
export async function getRecommendationsForMentee(
  menteeId: string,
  stage: MenteeMatchStatus
): Promise<{ active: MenteeRecommendation[]; completed: MenteeRecommendation[] }> {
  const { data, error } = await supabase
    .from('mentee_recommendations')
    .select('*')
    .eq('mentee_id', menteeId)
    .eq('stage', stage)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching recommendations:', error);
    return { active: [], completed: [] };
  }

  const recommendations = data as MenteeRecommendation[];

  return {
    active: recommendations.filter(r => !r.is_completed),
    completed: recommendations.filter(r => r.is_completed)
  };
}

// Mark a recommendation as completed
export async function completeRecommendation(
  recommendationId: string
): Promise<MenteeRecommendation | null> {
  const { data, error } = await supabase
    .from('mentee_recommendations')
    .update({
      is_completed: true,
      completed_at: new Date().toISOString()
    })
    .eq('id', recommendationId)
    .select()
    .single();

  if (error) {
    console.error('Error completing recommendation:', error);
    return null;
  }

  return data as MenteeRecommendation;
}

// Mark a recommendation as incomplete (undo)
export async function uncompleteRecommendation(
  recommendationId: string
): Promise<MenteeRecommendation | null> {
  const { data, error } = await supabase
    .from('mentee_recommendations')
    .update({
      is_completed: false,
      completed_at: null
    })
    .eq('id', recommendationId)
    .select()
    .single();

  if (error) {
    console.error('Error uncompleting recommendation:', error);
    return null;
  }

  return data as MenteeRecommendation;
}

// Get completion stats for a mentee
export async function getRecommendationStats(
  menteeId: string
): Promise<{
  total: number;
  completed: number;
  byStage: Record<MenteeMatchStatus, { total: number; completed: number }>;
}> {
  const { data, error } = await supabase
    .from('mentee_recommendations')
    .select('stage, is_completed')
    .eq('mentee_id', menteeId);

  if (error) {
    console.error('Error fetching recommendation stats:', error);
    return {
      total: 0,
      completed: 0,
      byStage: {
        unassigned: { total: 0, completed: 0 },
        awaiting_match: { total: 0, completed: 0 },
        match_pending: { total: 0, completed: 0 },
        matched: { total: 0, completed: 0 }
      }
    };
  }

  const recommendations = data as { stage: MenteeMatchStatus; is_completed: boolean }[];

  const byStage: Record<MenteeMatchStatus, { total: number; completed: number }> = {
    unassigned: { total: 0, completed: 0 },
    awaiting_match: { total: 0, completed: 0 },
    match_pending: { total: 0, completed: 0 },
    matched: { total: 0, completed: 0 }
  };

  let totalCompleted = 0;

  recommendations.forEach(rec => {
    byStage[rec.stage].total++;
    if (rec.is_completed) {
      byStage[rec.stage].completed++;
      totalCompleted++;
    }
  });

  return {
    total: recommendations.length,
    completed: totalCompleted,
    byStage
  };
}

// Update recommendations when a mentee's stage changes
export async function updateRecommendationsForStageChange(
  menteeId: string,
  cohortId: string,
  newStage: MenteeMatchStatus
): Promise<MenteeRecommendation[]> {
  // Initialize recommendations for the new stage
  return initializeRecommendationsForMentee(menteeId, cohortId, newStage);
}