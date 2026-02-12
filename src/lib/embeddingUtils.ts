import { MenteeData, MentorData } from "@/types/mentoring";

/**
 * Calculate cosine similarity between two vectors.
 * Returns a value between -1 and 1 (typically 0 to 1 for OpenAI embeddings).
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Build a text string for embedding a mentee's profile.
 * New survey: mentoring_goal + bio are the primary semantic fields.
 * Falls back to legacy fields for old cohorts.
 */
export function buildMenteeEmbeddingText(mentee: MenteeData): string {
  // Prefer new survey fields
  if (mentee.mentoring_goal || mentee.bio) {
    const parts = [
      mentee.mentoring_goal || '',
      mentee.bio || '',
      mentee.primary_capability ? `Capability: ${mentee.primary_capability}` : '',
      mentee.secondary_capability ? `Secondary: ${mentee.secondary_capability}` : '',
    ].filter(Boolean);
    return parts.join('. ');
  }

  // Legacy fallback
  const parts = [
    mentee.goals_text || '',
    mentee.main_reason || '',
    mentee.motivation || '',
    mentee.expectations || '',
    mentee.topics_to_learn?.length ? `Topics: ${mentee.topics_to_learn.join(', ')}` : '',
    mentee.desired_qualities || '',
  ].filter(Boolean);

  return parts.join('. ');
}

/**
 * Build a text string for embedding a mentor's profile.
 * New survey: mentor_motivation + hard_earned_lesson + bio are the primary semantic fields.
 * Falls back to legacy fields for old cohorts.
 */
export function buildMentorEmbeddingText(mentor: MentorData): string {
  // Prefer new survey fields
  if (mentor.mentor_motivation || mentor.hard_earned_lesson || mentor.bio) {
    const parts = [
      mentor.mentor_motivation || '',
      mentor.hard_earned_lesson || '',
      mentor.bio || '',
      mentor.primary_capability ? `Capability: ${mentor.primary_capability}` : '',
      mentor.secondary_capabilities?.length ? `Also: ${mentor.secondary_capabilities.join(', ')}` : '',
    ].filter(Boolean);
    return parts.join('. ');
  }

  // Legacy fallback
  const parts = [
    mentor.bio_text || '',
    mentor.motivation || '',
    mentor.expectations || '',
    mentor.topics_to_mentor?.length ? `Topics: ${mentor.topics_to_mentor.join(', ')}` : '',
    mentor.mentoring_style ? `Style: ${mentor.mentoring_style}` : '',
  ].filter(Boolean);

  return parts.join('. ');
}
