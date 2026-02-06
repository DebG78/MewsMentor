import { supabase } from './supabase';
import { MenteeData, MentorData } from '@/types/mentoring';
import { buildMenteeEmbeddingText, buildMentorEmbeddingText } from './embeddingUtils';

export interface EmbeddingCache {
  menteeEmbeddings: Map<string, number[]>;
  mentorEmbeddings: Map<string, number[]>;
}

/**
 * Get or compute embeddings for all participants in a cohort.
 * Checks the profile_embeddings table for cached vectors first,
 * then calls the generate-embeddings Edge Function for any missing ones.
 */
export async function getOrComputeEmbeddings(
  cohortId: string,
  mentees: MenteeData[],
  mentors: MentorData[],
): Promise<EmbeddingCache> {
  const cache: EmbeddingCache = {
    menteeEmbeddings: new Map(),
    mentorEmbeddings: new Map(),
  };

  // 1. Load existing cached embeddings from DB
  const { data: cachedRows } = await supabase
    .from('profile_embeddings')
    .select('participant_id, participant_type, embedding')
    .eq('cohort_id', cohortId);

  if (cachedRows) {
    for (const row of cachedRows) {
      const embedding = row.embedding as unknown as number[];
      if (row.participant_type === 'mentee') {
        cache.menteeEmbeddings.set(row.participant_id, embedding);
      } else {
        cache.mentorEmbeddings.set(row.participant_id, embedding);
      }
    }
  }

  // 2. Identify participants missing embeddings
  const missingMentees = mentees.filter(m => !cache.menteeEmbeddings.has(m.id));
  const missingMentors = mentors.filter(m => !cache.mentorEmbeddings.has(m.id));

  if (missingMentees.length === 0 && missingMentors.length === 0) {
    return cache;
  }

  // 3. Build texts for missing participants
  const missingTexts: string[] = [];
  const missingMeta: { id: string; type: 'mentee' | 'mentor'; text: string }[] = [];

  for (const mentee of missingMentees) {
    const text = buildMenteeEmbeddingText(mentee);
    missingTexts.push(text);
    missingMeta.push({ id: mentee.id, type: 'mentee', text });
  }

  for (const mentor of missingMentors) {
    const text = buildMentorEmbeddingText(mentor);
    missingTexts.push(text);
    missingMeta.push({ id: mentor.id, type: 'mentor', text });
  }

  // 4. Call Edge Function in batches of 100
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < missingTexts.length; i += 100) {
    const batch = missingTexts.slice(i, i + 100);
    const { data, error } = await supabase.functions.invoke('generate-embeddings', {
      body: { texts: batch },
    });

    if (error) {
      throw new Error(`Embedding generation failed: ${error.message}`);
    }

    if (!data?.embeddings || !Array.isArray(data.embeddings)) {
      throw new Error('Invalid response from generate-embeddings function');
    }

    allEmbeddings.push(...data.embeddings);
  }

  // 5. Store new embeddings in DB and update cache
  const rowsToInsert = missingMeta.map((meta, idx) => ({
    cohort_id: cohortId,
    participant_id: meta.id,
    participant_type: meta.type,
    embedding_text: meta.text,
    embedding: allEmbeddings[idx],
    model_name: 'text-embedding-3-small',
  }));

  if (rowsToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from('profile_embeddings')
      .upsert(rowsToInsert, { onConflict: 'cohort_id,participant_id,participant_type' });

    if (insertError) {
      console.warn('Failed to cache embeddings:', insertError.message);
    }
  }

  // 6. Update the in-memory cache
  for (let i = 0; i < missingMeta.length; i++) {
    const meta = missingMeta[i];
    const embedding = allEmbeddings[i];
    if (meta.type === 'mentee') {
      cache.menteeEmbeddings.set(meta.id, embedding);
    } else {
      cache.mentorEmbeddings.set(meta.id, embedding);
    }
  }

  return cache;
}
