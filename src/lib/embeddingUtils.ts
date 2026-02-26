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
 * V3: capabilities_wanted + role_specific_area + mentoring_goal + specific_challenge + bio
 * V2: mentoring_goal + bio + primary/secondary capability
 * V1: goals_text + motivation + topics
 */
export function buildMenteeEmbeddingText(mentee: MenteeData): string {
  // V3 fields (free-text capabilities)
  if (mentee.capabilities_wanted || mentee.specific_challenge) {
    const parts = [
      mentee.capabilities_wanted ? `Capabilities to develop: ${mentee.capabilities_wanted}` : '',
      mentee.role_specific_area ? `Role-specific area: ${mentee.role_specific_area}` : '',
      mentee.mentoring_goal || '',
      mentee.specific_challenge ? `Challenge: ${mentee.specific_challenge}` : '',
      mentee.bio || '',
      mentee.business_title ? `Role: ${mentee.business_title}` : '',
    ].filter(Boolean);
    return parts.join('. ');
  }

  // V2 fields (capability framework)
  if (mentee.mentoring_goal || mentee.bio) {
    const parts = [
      mentee.mentoring_goal || '',
      mentee.bio || '',
      mentee.primary_capability ? `Capability: ${mentee.primary_capability}` : '',
      mentee.secondary_capability ? `Secondary: ${mentee.secondary_capability}` : '',
    ].filter(Boolean);
    return parts.join('. ');
  }

  // V1 Legacy fallback
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
 * V3: capabilities_offered + role_specific_offering + meaningful_impact + bio + natural_strengths
 * V2: mentor_motivation + hard_earned_lesson + bio + capabilities
 * V1: bio_text + motivation + topics
 */
export function buildMentorEmbeddingText(mentor: MentorData): string {
  // V3 fields (free-text capabilities)
  if (mentor.capabilities_offered || mentor.meaningful_impact) {
    const parts = [
      mentor.capabilities_offered ? `Capabilities for mentoring: ${mentor.capabilities_offered}` : '',
      mentor.role_specific_offering ? `Role-specific offering: ${mentor.role_specific_offering}` : '',
      mentor.meaningful_impact ? `Impact story: ${mentor.meaningful_impact}` : '',
      mentor.mentor_motivation || '',
      mentor.bio || '',
      mentor.business_title ? `Role: ${mentor.business_title}` : '',
      mentor.natural_strengths?.length ? `Strengths: ${mentor.natural_strengths.join(', ')}` : '',
    ].filter(Boolean);
    return parts.join('. ');
  }

  // V2 fields (capability framework)
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

  // V1 Legacy fallback
  const parts = [
    mentor.bio_text || '',
    mentor.motivation || '',
    mentor.expectations || '',
    mentor.topics_to_mentor?.length ? `Topics: ${mentor.topics_to_mentor.join(', ')}` : '',
    mentor.mentoring_style ? `Style: ${mentor.mentoring_style}` : '',
  ].filter(Boolean);

  return parts.join('. ');
}
