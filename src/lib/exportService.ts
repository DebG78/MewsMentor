/**
 * Export Service
 * Provides CSV export functionality for various data types
 */

import { supabase } from './supabase';

// ============================================================================
// CSV UTILITIES
// ============================================================================

/**
 * Convert an array of objects to CSV string
 */
function objectsToCSV<T extends Record<string, unknown>>(
  data: T[],
  columns?: { key: keyof T; header: string }[]
): string {
  if (data.length === 0) return '';

  // Determine columns from first object if not provided
  const cols = columns || Object.keys(data[0]).map(key => ({
    key: key as keyof T,
    header: key.toString(),
  }));

  // Create header row
  const headers = cols.map(c => `"${c.header}"`).join(',');

  // Create data rows
  const rows = data.map(row => {
    return cols.map(col => {
      const value = row[col.key];
      if (value === null || value === undefined) return '""';
      if (typeof value === 'string') {
        // Escape quotes and wrap in quotes
        return `"${value.replace(/"/g, '""')}"`;
      }
      if (typeof value === 'object') {
        return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
      }
      return `"${String(value)}"`;
    }).join(',');
  });

  return [headers, ...rows].join('\n');
}

/**
 * Trigger a CSV file download in the browser
 */
function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');

  if (navigator.msSaveBlob) {
    // IE 10+
    navigator.msSaveBlob(blob, filename);
  } else {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

/**
 * Get current date string for filename
 */
function getDateString(): string {
  return new Date().toISOString().split('T')[0];
}

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

/**
 * Export match list for a cohort
 */
export async function exportMatchList(cohortId: string, cohortName?: string): Promise<void> {
  const { data, error } = await supabase
    .from('matches')
    .select(`
      id,
      mentor_id,
      mentee_id,
      status,
      score,
      created_at,
      assigned_at
    `)
    .eq('cohort_id', cohortId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching matches for export:', error);
    throw error;
  }

  const columns = [
    { key: 'id' as const, header: 'Match ID' },
    { key: 'mentor_id' as const, header: 'Mentor ID' },
    { key: 'mentee_id' as const, header: 'Mentee ID' },
    { key: 'status' as const, header: 'Status' },
    { key: 'score' as const, header: 'Match Score' },
    { key: 'created_at' as const, header: 'Created At' },
    { key: 'assigned_at' as const, header: 'Assigned At' },
  ];

  const csv = objectsToCSV(data || [], columns);
  const filename = `matches_${cohortName || cohortId}_${getDateString()}.csv`;
  downloadCSV(csv, filename);
}

/**
 * Export participant list for a cohort
 */
export async function exportParticipantList(
  cohortId: string,
  type: 'mentor' | 'mentee' | 'all',
  cohortName?: string
): Promise<void> {
  // Fetch mentors
  let mentors: Array<Record<string, unknown>> = [];
  if (type === 'mentor' || type === 'all') {
    const { data, error } = await supabase
      .from('cohort_members')
      .select(`
        mentor_id,
        mentors:mentor_id (
          id,
          full_name,
          email,
          job_title,
          company,
          expertise,
          capacity
        )
      `)
      .eq('cohort_id', cohortId)
      .not('mentor_id', 'is', null);

    if (error) {
      console.error('Error fetching mentors:', error);
    } else {
      mentors = (data || []).map((d: Record<string, unknown>) => ({
        type: 'mentor',
        ...(d.mentors as Record<string, unknown>),
      }));
    }
  }

  // Fetch mentees
  let mentees: Array<Record<string, unknown>> = [];
  if (type === 'mentee' || type === 'all') {
    const { data, error } = await supabase
      .from('cohort_members')
      .select(`
        mentee_id,
        mentees:mentee_id (
          id,
          full_name,
          email,
          job_title,
          company,
          goals
        )
      `)
      .eq('cohort_id', cohortId)
      .not('mentee_id', 'is', null);

    if (error) {
      console.error('Error fetching mentees:', error);
    } else {
      mentees = (data || []).map((d: Record<string, unknown>) => ({
        type: 'mentee',
        ...(d.mentees as Record<string, unknown>),
      }));
    }
  }

  const participants = [...mentors, ...mentees];

  const columns = [
    { key: 'type' as const, header: 'Type' },
    { key: 'id' as const, header: 'ID' },
    { key: 'full_name' as const, header: 'Full Name' },
    { key: 'email' as const, header: 'Email' },
    { key: 'job_title' as const, header: 'Job Title' },
    { key: 'company' as const, header: 'Company' },
  ];

  const csv = objectsToCSV(participants, columns);
  const filename = `participants_${type}_${cohortName || cohortId}_${getDateString()}.csv`;
  downloadCSV(csv, filename);
}

/**
 * Export VIP list for a cohort
 */
export async function exportVIPList(cohortId?: string, cohortName?: string): Promise<void> {
  let query = supabase
    .from('vip_scores')
    .select('*')
    .eq('is_vip', true)
    .order('total_score', { ascending: false });

  if (cohortId) {
    query = query.eq('cohort_id', cohortId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching VIPs for export:', error);
    throw error;
  }

  const columns = [
    { key: 'person_id' as const, header: 'Person ID' },
    { key: 'person_type' as const, header: 'Type' },
    { key: 'engagement_score' as const, header: 'Engagement Score' },
    { key: 'session_score' as const, header: 'Session Score' },
    { key: 'response_score' as const, header: 'Response Score' },
    { key: 'feedback_score' as const, header: 'Feedback Score' },
    { key: 'total_score' as const, header: 'Total Score' },
    { key: 'vip_reason' as const, header: 'VIP Reason' },
    { key: 'last_calculated_at' as const, header: 'Last Calculated' },
  ];

  const csv = objectsToCSV(data || [], columns);
  const filename = `vip_list_${cohortName || cohortId || 'all'}_${getDateString()}.csv`;
  downloadCSV(csv, filename);
}

/**
 * Export cohort metrics
 */
export async function exportCohortMetrics(cohortId: string, cohortName?: string): Promise<void> {
  const { data, error } = await supabase
    .from('metric_snapshots')
    .select('*')
    .eq('cohort_id', cohortId)
    .order('metric_name', { ascending: true })
    .order('snapshot_date', { ascending: false });

  if (error) {
    console.error('Error fetching metrics for export:', error);
    throw error;
  }

  const columns = [
    { key: 'metric_name' as const, header: 'Metric Name' },
    { key: 'actual_value' as const, header: 'Value' },
    { key: 'snapshot_date' as const, header: 'Date' },
    { key: 'notes' as const, header: 'Notes' },
  ];

  const csv = objectsToCSV(data || [], columns);
  const filename = `metrics_${cohortName || cohortId}_${getDateString()}.csv`;
  downloadCSV(csv, filename);
}

/**
 * Export runbook stages for a cohort
 */
export async function exportRunbookStages(cohortId: string, cohortName?: string): Promise<void> {
  const { data, error } = await supabase
    .from('cohort_stages')
    .select('*')
    .eq('cohort_id', cohortId)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching stages for export:', error);
    throw error;
  }

  // Flatten checklist for export
  const exportData = (data || []).map(stage => ({
    ...stage,
    checklist_completed: stage.checklist.filter((i: { completed: boolean }) => i.completed).length,
    checklist_total: stage.checklist.length,
    document_count: stage.documents.length,
  }));

  const columns = [
    { key: 'stage_name' as const, header: 'Stage Name' },
    { key: 'stage_type' as const, header: 'Stage Type' },
    { key: 'status' as const, header: 'Status' },
    { key: 'owner' as const, header: 'Owner' },
    { key: 'due_date' as const, header: 'Due Date' },
    { key: 'completed_date' as const, header: 'Completed Date' },
    { key: 'checklist_completed' as const, header: 'Tasks Completed' },
    { key: 'checklist_total' as const, header: 'Total Tasks' },
    { key: 'document_count' as const, header: 'Documents' },
    { key: 'notes' as const, header: 'Notes' },
  ];

  const csv = objectsToCSV(exportData, columns);
  const filename = `runbook_${cohortName || cohortId}_${getDateString()}.csv`;
  downloadCSV(csv, filename);
}

/**
 * Export matching models
 */
export async function exportMatchingModels(): Promise<void> {
  const { data, error } = await supabase
    .from('matching_models')
    .select('*')
    .order('name', { ascending: true })
    .order('version', { ascending: false });

  if (error) {
    console.error('Error fetching matching models for export:', error);
    throw error;
  }

  const columns = [
    { key: 'id' as const, header: 'Model ID' },
    { key: 'name' as const, header: 'Name' },
    { key: 'version' as const, header: 'Version' },
    { key: 'status' as const, header: 'Status' },
    { key: 'is_default' as const, header: 'Is Default' },
    { key: 'description' as const, header: 'Description' },
    { key: 'weights' as const, header: 'Weights (JSON)' },
    { key: 'filters' as const, header: 'Filters (JSON)' },
    { key: 'created_at' as const, header: 'Created At' },
  ];

  const csv = objectsToCSV(data || [], columns);
  const filename = `matching_models_${getDateString()}.csv`;
  downloadCSV(csv, filename);
}

/**
 * Export all cohorts summary
 */
export async function exportCohortsSummary(): Promise<void> {
  const { data, error } = await supabase
    .from('cohorts')
    .select('*')
    .order('start_date', { ascending: false });

  if (error) {
    console.error('Error fetching cohorts for export:', error);
    throw error;
  }

  const columns = [
    { key: 'id' as const, header: 'Cohort ID' },
    { key: 'name' as const, header: 'Name' },
    { key: 'description' as const, header: 'Description' },
    { key: 'status' as const, header: 'Status' },
    { key: 'start_date' as const, header: 'Start Date' },
    { key: 'end_date' as const, header: 'End Date' },
    { key: 'created_at' as const, header: 'Created At' },
  ];

  const csv = objectsToCSV(data || [], columns);
  const filename = `cohorts_summary_${getDateString()}.csv`;
  downloadCSV(csv, filename);
}
