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
 * Concatenates the most semantically meaningful fields.
 */
export function buildMenteeEmbeddingText(mentee: MenteeData): string {
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
 * Concatenates the most semantically meaningful fields.
 */
export function buildMentorEmbeddingText(mentor: MentorData): string {
  const parts = [
    mentor.bio_text || '',
    mentor.motivation || '',
    mentor.expectations || '',
    mentor.topics_to_mentor?.length ? `Topics: ${mentor.topics_to_mentor.join(', ')}` : '',
    mentor.mentoring_style ? `Style: ${mentor.mentoring_style}` : '',
  ].filter(Boolean);

  return parts.join('. ');
}
