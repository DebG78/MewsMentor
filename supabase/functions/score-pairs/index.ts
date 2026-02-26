import { corsHeaders } from '../_shared/cors.ts';

// ============================================================================
// LLM Pairwise Scoring Edge Function
// Accepts batches of mentee-mentor profile pairs and returns compatibility
// scores using OpenAI GPT-4o-mini. The OpenAI API key stays server-side.
// ============================================================================

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

interface PairInput {
  mentee_id: string;
  mentor_id: string;
  mentee_profile: string;
  mentor_profile: string;
}

interface PairScore {
  mentee_id: string;
  mentor_id: string;
  overall_score: number;
  capability_alignment: number;
  goal_experience_fit: number;
  complementary_strengths: number;
  reasoning: string;
}

const SYSTEM_PROMPT = `You are a mentoring program matching assistant. You evaluate mentee-mentor pairs for compatibility.

For each pair, rate the following on a 0-10 scale:
1. Capability Alignment: How well the mentor's offered capabilities match what the mentee wants to develop.
2. Goal-Experience Fit: How well the mentor's experience and offerings align with the mentee's goals and challenges.
3. Complementary Strengths: How well the mentor's natural strengths complement what the mentee is looking for in a mentor.

Return a JSON object with these fields:
- overall_score: number (0-10, weighted average)
- capability_alignment: number (0-10)
- goal_experience_fit: number (0-10)
- complementary_strengths: number (0-10)
- reasoning: string (2-3 sentences explaining the match quality)

Be strict but fair. A score of 5 means average fit, 7+ means good fit, 9+ means exceptional fit.
If profiles have little overlapping information, score conservatively (3-5).`;

function clamp(val: number): number {
  return Math.min(10, Math.max(0, val));
}

async function scoreSinglePair(pair: PairInput): Promise<PairScore | null> {
  const userPrompt = `Rate this mentee-mentor pair:

=== MENTEE ===
${pair.mentee_profile}

=== MENTOR ===
${pair.mentor_profile}

Return ONLY a valid JSON object.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 300,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenAI error for ${pair.mentee_id}::${pair.mentor_id}:`, response.status, errorText);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content);
    return {
      mentee_id: pair.mentee_id,
      mentor_id: pair.mentor_id,
      overall_score: clamp(Number(parsed.overall_score) || 0),
      capability_alignment: clamp(Number(parsed.capability_alignment) || 0),
      goal_experience_fit: clamp(Number(parsed.goal_experience_fit) || 0),
      complementary_strengths: clamp(Number(parsed.complementary_strengths) || 0),
      reasoning: String(parsed.reasoning || ''),
    };
  } catch (err) {
    console.error(`LLM scoring error for ${pair.mentee_id}::${pair.mentor_id}:`, err);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  if (!OPENAI_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'OPENAI_API_KEY not configured in Supabase secrets' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  try {
    const { pairs } = await req.json() as { pairs: PairInput[] };

    if (!pairs?.length) {
      return new Response(
        JSON.stringify({ error: 'pairs array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    console.log(`score-pairs: scoring ${pairs.length} pairs`);

    // Process all pairs in parallel (edge function handles concurrency)
    const results = await Promise.all(pairs.map(scoreSinglePair));

    // Filter out nulls (failed pairs)
    const scores = results.filter((r): r is PairScore => r !== null);

    console.log(`score-pairs: ${scores.length}/${pairs.length} scored successfully`);

    return new Response(
      JSON.stringify({ scores }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('score-pairs error:', message);
    return new Response(
      JSON.stringify({ error: message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
