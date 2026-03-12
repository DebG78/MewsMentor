import { generateChatCompletion } from './openai.ts';

/** Only summarize values longer than this many characters */
export const SUMMARIZE_THRESHOLD = 120;

/** Field-specific system prompts for summarization */
const FIELD_PROMPTS: Record<string, string> = {
  mentoring_goal:
    'Summarize this mentoring goal into 1 concise sentence that captures the person\'s core development objective. Keep it under 100 characters. Output only the summary, no quotes or labels.',
  bio:
    'Summarize this bio into 1-2 concise sentences capturing the person\'s background and current focus. Keep it under 120 characters. Output only the summary, no quotes or labels.',
  hard_earned_lesson:
    'Condense this mentoring lesson or impact story into 1 concise sentence capturing the key insight. Keep it under 100 characters. Output only the summary, no quotes or labels.',
  mentor_motivation:
    'Summarize this mentor\'s motivation into 1 concise sentence. Keep it under 100 characters. Output only the summary, no quotes or labels.',
  mentoring_experience:
    'Summarize this mentoring experience into 1 concise sentence. Keep it under 100 characters. Output only the summary, no quotes or labels.',
};

/**
 * Summarize a single field value using LLM.
 * Returns the raw value unchanged if it's short enough.
 * Falls back to truncation if the LLM call fails.
 */
export async function summarizeField(
  fieldName: string,
  rawValue: string,
): Promise<string> {
  if (!rawValue || rawValue.length <= SUMMARIZE_THRESHOLD) {
    return rawValue;
  }

  const systemPrompt = FIELD_PROMPTS[fieldName];
  if (!systemPrompt) {
    console.warn(`[summarize] No prompt defined for field: ${fieldName}`);
    return rawValue;
  }

  try {
    const summary = await generateChatCompletion(systemPrompt, rawValue, 80);
    // Guard against LLM returning something longer than the original
    if (summary && summary.length < rawValue.length) {
      return summary.trim();
    }
    return rawValue.substring(0, SUMMARIZE_THRESHOLD) + '...';
  } catch (err) {
    console.error(`[summarize] LLM error for ${fieldName}:`, err);
    return rawValue.substring(0, SUMMARIZE_THRESHOLD) + '...';
  }
}

/** The summarizable fields for each participant type */
export const MENTEE_SUMMARY_FIELDS = ['mentoring_goal', 'bio'] as const;
export const MENTOR_SUMMARY_FIELDS = [
  'bio',
  'hard_earned_lesson',
  'mentor_motivation',
  'mentoring_experience',
] as const;

/**
 * Summarize all applicable fields for a profile.
 * Returns a map of `fieldName_summary` → summary value.
 * Only includes fields that exceeded the threshold and were summarized.
 */
export async function summarizeProfileFields(
  profile: Record<string, string | null | undefined>,
  fieldNames: readonly string[],
  force = false,
): Promise<Record<string, string>> {
  const results: Record<string, string> = {};
  const tasks: Array<Promise<void>> = [];

  for (const field of fieldNames) {
    const rawValue = profile[field];
    const summaryKey = `${field}_summary`;
    const existingSummary = profile[summaryKey];

    // Skip if already summarized (unless force)
    if (!force && existingSummary) continue;
    // Skip if raw value is missing or short
    if (!rawValue || rawValue.length <= SUMMARIZE_THRESHOLD) continue;

    tasks.push(
      summarizeField(field, rawValue).then(summary => {
        if (summary !== rawValue) {
          results[summaryKey] = summary;
        }
      }),
    );
  }

  await Promise.all(tasks);
  return results;
}
