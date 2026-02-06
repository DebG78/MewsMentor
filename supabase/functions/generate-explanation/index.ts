import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { generateChatCompletion } from '../_shared/openai.ts';

const SYSTEM_PROMPT = `You are a mentoring program coordinator at Mews. Given a mentee's profile and a mentor's profile along with their compatibility scores, write 2-3 sentences explaining why this mentor-mentee pair is a strong match. Focus on complementary goals, shared interests, and practical logistics. Be specific and encouraging but honest. If there are concerns, mention them diplomatically. Do not use bullet points or formatting -- write in flowing prose.`;

interface ProfileSummary {
  id: string;
  role?: string;
  experience_years?: string;
  goals_text?: string;
  bio_text?: string;
  topics?: string[];
  motivation?: string;
  expectations?: string;
  mentoring_style?: string;
  preferred_mentor_style?: string;
  timezone?: string;
  languages?: string[];
}

interface ScoreBreakdownItem {
  criterion: string;
  criterion_name: string;
  raw_score: number;
  weight: number;
  weighted_score: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { mentee, mentor, score_breakdown, total_score } = await req.json() as {
      mentee: ProfileSummary;
      mentor: ProfileSummary;
      score_breakdown: ScoreBreakdownItem[];
      total_score: number;
    };

    if (!mentee || !mentor) {
      return new Response(
        JSON.stringify({ error: 'mentee and mentor profile summaries are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const userPrompt = buildUserPrompt(mentee, mentor, score_breakdown, total_score);
    const explanation = await generateChatCompletion(SYSTEM_PROMPT, userPrompt);

    return new Response(
      JSON.stringify({ explanation }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('generate-explanation error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

function buildUserPrompt(
  mentee: ProfileSummary,
  mentor: ProfileSummary,
  scoreBreakdown: ScoreBreakdownItem[],
  totalScore: number,
): string {
  const lines: string[] = [];

  lines.push('MENTEE:');
  if (mentee.role) lines.push(`Role: ${mentee.role}`);
  if (mentee.experience_years) lines.push(`Experience: ${mentee.experience_years}`);
  if (mentee.goals_text) lines.push(`Goals: ${mentee.goals_text}`);
  if (mentee.topics?.length) lines.push(`Topics they want to develop: ${mentee.topics.join(', ')}`);
  if (mentee.preferred_mentor_style) lines.push(`Preferred mentor style: ${mentee.preferred_mentor_style}`);
  if (mentee.motivation) lines.push(`Motivation: ${mentee.motivation}`);
  if (mentee.timezone) lines.push(`Timezone: ${mentee.timezone}`);
  if (mentee.languages?.length) lines.push(`Languages: ${mentee.languages.join(', ')}`);

  lines.push('');
  lines.push('MENTOR:');
  if (mentor.role) lines.push(`Role: ${mentor.role}`);
  if (mentor.experience_years) lines.push(`Experience: ${mentor.experience_years}`);
  if (mentor.bio_text) lines.push(`Bio: ${mentor.bio_text}`);
  if (mentor.topics?.length) lines.push(`Topics they mentor: ${mentor.topics.join(', ')}`);
  if (mentor.mentoring_style) lines.push(`Mentoring style: ${mentor.mentoring_style}`);
  if (mentor.motivation) lines.push(`Motivation: ${mentor.motivation}`);
  if (mentor.timezone) lines.push(`Timezone: ${mentor.timezone}`);
  if (mentor.languages?.length) lines.push(`Languages: ${mentor.languages.join(', ')}`);

  lines.push('');
  lines.push('MATCH SCORES:');
  lines.push(`Total: ${Math.round(totalScore)}/100`);
  if (scoreBreakdown?.length) {
    for (const item of scoreBreakdown) {
      lines.push(`${item.criterion_name}: ${Math.round(item.raw_score * 100)}%`);
    }
  }

  return lines.join('\n');
}
