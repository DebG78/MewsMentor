import { supabase } from './supabase';
import type {
  SuccessTarget,
  MetricSnapshot,
  CreateSuccessTargetInput,
  UpdateSuccessTargetInput,
  CreateMetricSnapshotInput,
  MetricWithStatus,
  MetricStatus,
  CategorySummary,
  MetricCategory,
  TrendDataPoint,
  MetricsDashboardSummary,
  CohortComparison,
} from '@/types/metrics';

// ============================================================================
// SUCCESS TARGETS CRUD
// ============================================================================

/**
 * Get all success targets (global + cohort-specific)
 */
export async function getSuccessTargets(cohortId?: string): Promise<SuccessTarget[]> {
  let query = supabase
    .from('success_targets')
    .select('*')
    .eq('is_active', true)
    .order('metric_category', { ascending: true })
    .order('metric_name', { ascending: true });

  if (cohortId) {
    // Get both global and cohort-specific targets
    query = query.or(`cohort_id.is.null,cohort_id.eq.${cohortId}`);
  } else {
    // Get only global targets
    query = query.is('cohort_id', null);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching success targets:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get a single target by ID
 */
export async function getSuccessTargetById(id: string): Promise<SuccessTarget | null> {
  const { data, error } = await supabase
    .from('success_targets')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching success target:', error);
    throw error;
  }

  return data;
}

/**
 * Create a new success target
 */
export async function createSuccessTarget(input: CreateSuccessTargetInput): Promise<SuccessTarget> {
  const { data, error } = await supabase
    .from('success_targets')
    .insert({
      cohort_id: input.cohort_id,
      metric_name: input.metric_name,
      metric_category: input.metric_category,
      target_value: input.target_value,
      target_unit: input.target_unit,
      warning_threshold: input.warning_threshold,
      critical_threshold: input.critical_threshold,
      comparison_direction: input.comparison_direction || 'higher_is_better',
      description: input.description,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating success target:', error);
    throw error;
  }

  return data;
}

/**
 * Update a success target
 */
export async function updateSuccessTarget(
  id: string,
  updates: UpdateSuccessTargetInput
): Promise<SuccessTarget> {
  const { data, error } = await supabase
    .from('success_targets')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating success target:', error);
    throw error;
  }

  return data;
}

/**
 * Delete a success target
 */
export async function deleteSuccessTarget(id: string): Promise<void> {
  const { error } = await supabase
    .from('success_targets')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting success target:', error);
    throw error;
  }
}

// ============================================================================
// METRIC SNAPSHOTS CRUD
// ============================================================================

/**
 * Get snapshots for a cohort and metric
 */
export async function getMetricSnapshots(
  cohortId: string,
  metricName?: string,
  startDate?: string,
  endDate?: string
): Promise<MetricSnapshot[]> {
  let query = supabase
    .from('metric_snapshots')
    .select('*')
    .eq('cohort_id', cohortId)
    .order('snapshot_date', { ascending: true });

  if (metricName) {
    query = query.eq('metric_name', metricName);
  }
  if (startDate) {
    query = query.gte('snapshot_date', startDate);
  }
  if (endDate) {
    query = query.lte('snapshot_date', endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching metric snapshots:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get latest snapshot for each metric in a cohort
 */
export async function getLatestSnapshots(cohortId: string): Promise<MetricSnapshot[]> {
  // Use a subquery to get the latest date per metric
  const { data, error } = await supabase
    .from('metric_snapshots')
    .select('*')
    .eq('cohort_id', cohortId)
    .order('snapshot_date', { ascending: false });

  if (error) {
    console.error('Error fetching latest snapshots:', error);
    throw error;
  }

  // Group by metric_name and take the first (latest) for each
  const latestByMetric = new Map<string, MetricSnapshot>();
  for (const snapshot of data || []) {
    if (!latestByMetric.has(snapshot.metric_name)) {
      latestByMetric.set(snapshot.metric_name, snapshot);
    }
  }

  return Array.from(latestByMetric.values());
}

/**
 * Create a metric snapshot
 */
export async function createMetricSnapshot(input: CreateMetricSnapshotInput): Promise<MetricSnapshot> {
  const { data, error } = await supabase
    .from('metric_snapshots')
    .insert({
      cohort_id: input.cohort_id,
      metric_name: input.metric_name,
      actual_value: input.actual_value,
      snapshot_date: input.snapshot_date || new Date().toISOString().split('T')[0],
      notes: input.notes,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating metric snapshot:', error);
    throw error;
  }

  return data;
}

/**
 * Upsert a metric snapshot (update if exists for same date)
 */
export async function upsertMetricSnapshot(input: CreateMetricSnapshotInput): Promise<MetricSnapshot> {
  const { data, error } = await supabase
    .from('metric_snapshots')
    .upsert({
      cohort_id: input.cohort_id,
      metric_name: input.metric_name,
      actual_value: input.actual_value,
      snapshot_date: input.snapshot_date || new Date().toISOString().split('T')[0],
      notes: input.notes,
    }, {
      onConflict: 'cohort_id,metric_name,snapshot_date',
    })
    .select()
    .single();

  if (error) {
    console.error('Error upserting metric snapshot:', error);
    throw error;
  }

  return data;
}

/**
 * Delete a metric snapshot
 */
export async function deleteMetricSnapshot(id: string): Promise<void> {
  const { error } = await supabase
    .from('metric_snapshots')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting metric snapshot:', error);
    throw error;
  }
}

// ============================================================================
// METRIC STATUS CALCULATION
// ============================================================================

/**
 * Calculate status for a metric value against its target
 */
export function calculateMetricStatus(
  actualValue: number,
  target: SuccessTarget
): MetricStatus {
  const { target_value, warning_threshold, critical_threshold, comparison_direction } = target;

  if (comparison_direction === 'higher_is_better') {
    if (critical_threshold && actualValue <= critical_threshold) return 'critical';
    if (warning_threshold && actualValue <= warning_threshold) return 'warning';
    if (actualValue >= target_value) return 'on_track';
    return 'warning';
  } else {
    // lower_is_better
    if (critical_threshold && actualValue >= critical_threshold) return 'critical';
    if (warning_threshold && actualValue >= warning_threshold) return 'warning';
    if (actualValue <= target_value) return 'on_track';
    return 'warning';
  }
}

/**
 * Calculate percent of target achieved
 */
export function calculatePercentOfTarget(
  actualValue: number,
  target: SuccessTarget
): number {
  const { target_value, comparison_direction } = target;

  if (target_value === 0) return 0;

  if (comparison_direction === 'higher_is_better') {
    return Math.min(100, (actualValue / target_value) * 100);
  } else {
    // For lower_is_better, invert the calculation
    return Math.min(100, (target_value / Math.max(actualValue, 0.01)) * 100);
  }
}

// ============================================================================
// DASHBOARD DATA
// ============================================================================

/**
 * Get metrics with their status for a cohort
 */
export async function getMetricsWithStatus(cohortId: string): Promise<MetricWithStatus[]> {
  const [targets, snapshots] = await Promise.all([
    getSuccessTargets(cohortId),
    getLatestSnapshots(cohortId),
  ]);

  const snapshotMap = new Map(snapshots.map(s => [s.metric_name, s]));

  return targets.map(target => {
    const snapshot = snapshotMap.get(target.metric_name);
    const latestValue = snapshot?.actual_value;
    const status = latestValue !== undefined
      ? calculateMetricStatus(latestValue, target)
      : 'warning';
    const percentOfTarget = latestValue !== undefined
      ? calculatePercentOfTarget(latestValue, target)
      : 0;

    return {
      target,
      latestValue,
      latestDate: snapshot?.snapshot_date,
      status,
      percentOfTarget,
    };
  });
}

/**
 * Get trend data for a metric
 */
export async function getMetricTrend(
  cohortId: string,
  metricName: string,
  days: number = 30
): Promise<TrendDataPoint[]> {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const [snapshots, targets] = await Promise.all([
    getMetricSnapshots(cohortId, metricName, startDate),
    getSuccessTargets(cohortId),
  ]);

  const target = targets.find(t => t.metric_name === metricName);

  return snapshots.map(s => ({
    date: s.snapshot_date,
    value: s.actual_value,
    target: target?.target_value,
  }));
}

/**
 * Get category summaries for dashboard
 */
export async function getCategorySummaries(cohortId: string): Promise<CategorySummary[]> {
  const metrics = await getMetricsWithStatus(cohortId);

  const categories: MetricCategory[] = ['engagement', 'satisfaction', 'completion', 'retention'];

  return categories.map(category => {
    const categoryMetrics = metrics.filter(m => m.target.metric_category === category);
    const onTrack = categoryMetrics.filter(m => m.status === 'on_track').length;
    const warning = categoryMetrics.filter(m => m.status === 'warning').length;
    const critical = categoryMetrics.filter(m => m.status === 'critical').length;

    const avgPerformance = categoryMetrics.length > 0
      ? categoryMetrics.reduce((sum, m) => sum + m.percentOfTarget, 0) / categoryMetrics.length
      : 0;

    return {
      category,
      totalMetrics: categoryMetrics.length,
      onTrack,
      warning,
      critical,
      averagePerformance: Math.round(avgPerformance),
    };
  });
}

/**
 * Get full dashboard summary
 */
export async function getMetricsDashboardSummary(cohortId: string): Promise<MetricsDashboardSummary> {
  const [metrics, categorySummaries] = await Promise.all([
    getMetricsWithStatus(cohortId),
    getCategorySummaries(cohortId),
  ]);

  const onTrack = metrics.filter(m => m.status === 'on_track');
  const warning = metrics.filter(m => m.status === 'warning');
  const critical = metrics.filter(m => m.status === 'critical');

  // Sort by performance to get top performers and needs attention
  const sorted = [...metrics].sort((a, b) => b.percentOfTarget - a.percentOfTarget);
  const topPerformers = sorted.slice(0, 3);
  const needsAttention = [...metrics]
    .filter(m => m.status === 'critical' || m.status === 'warning')
    .sort((a, b) => a.percentOfTarget - b.percentOfTarget)
    .slice(0, 3);

  return {
    totalMetrics: metrics.length,
    onTrack: onTrack.length,
    warning: warning.length,
    critical: critical.length,
    categorySummaries,
    topPerformers,
    needsAttention,
  };
}

/**
 * Compare metrics across cohorts
 */
export async function compareCohortMetrics(
  cohortIds: string[],
  metricName: string
): Promise<CohortComparison[]> {
  const results: CohortComparison[] = [];

  for (const cohortId of cohortIds) {
    const [targets, snapshots] = await Promise.all([
      getSuccessTargets(cohortId),
      getLatestSnapshots(cohortId),
    ]);

    const target = targets.find(t => t.metric_name === metricName);
    const snapshot = snapshots.find(s => s.metric_name === metricName);

    if (target && snapshot) {
      results.push({
        cohort_id: cohortId,
        cohort_name: cohortId, // Would need to join with cohorts table for actual name
        metric_name: metricName,
        actual_value: snapshot.actual_value,
        target_value: target.target_value,
        status: calculateMetricStatus(snapshot.actual_value, target),
      });
    }
  }

  return results;
}
