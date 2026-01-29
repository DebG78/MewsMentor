// Production Survey Template Service - Supabase Integration

import { supabase } from './supabase';
import {
  SurveyTemplate,
  SurveyTemplateCreateInput,
  SurveyTemplateUpdateInput,
  DEFAULT_MENTOR_SURVEY_TEMPLATE,
  DEFAULT_MENTEE_SURVEY_TEMPLATE
} from "@/types/surveys";

// Database types for Supabase
interface SurveyTemplateRow {
  id: string;
  name: string;
  description: string | null;
  type: 'mentor' | 'mentee';
  steps: any; // JSONB
  is_default: boolean;
  is_active: boolean;
  version: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Convert database row to SurveyTemplate
function mapRowToTemplate(row: SurveyTemplateRow): SurveyTemplate {
  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    type: row.type,
    steps: row.steps,
    isDefault: row.is_default,
    isActive: row.is_active,
    version: row.version,
    createdBy: row.created_by || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// Convert SurveyTemplate to database row
function mapTemplateToRow(template: SurveyTemplateCreateInput): Omit<SurveyTemplateRow, 'id' | 'created_at' | 'updated_at' | 'version'> {
  return {
    name: template.name,
    description: template.description || null,
    type: template.type,
    steps: template.steps,
    is_default: template.isDefault || false,
    is_active: true,
    created_by: template.createdBy || null
  };
}

// Initialize default surveys in database
export async function initializeDefaultSurveys(): Promise<void> {
  try {
    // Check if default surveys already exist
    const { data: existingDefaults } = await supabase
      .from('survey_templates')
      .select('type')
      .eq('is_default', true)
      .eq('is_active', true);

    const existingTypes = existingDefaults?.map(d => d.type) || [];

    // Create default mentor survey if it doesn't exist
    if (!existingTypes.includes('mentor')) {
      const mentorTemplate: SurveyTemplateCreateInput = {
        ...DEFAULT_MENTOR_SURVEY_TEMPLATE,
        isDefault: true
      };

      const { error: mentorError } = await supabase
        .from('survey_templates')
        .insert(mapTemplateToRow(mentorTemplate));

      if (mentorError) {
        console.error('Error creating default mentor survey:', mentorError);
      }
    }

    // Create default mentee survey if it doesn't exist
    if (!existingTypes.includes('mentee')) {
      const menteeTemplate: SurveyTemplateCreateInput = {
        ...DEFAULT_MENTEE_SURVEY_TEMPLATE,
        isDefault: true
      };

      const { error: menteeError } = await supabase
        .from('survey_templates')
        .insert(mapTemplateToRow(menteeTemplate));

      if (menteeError) {
        console.error('Error creating default mentee survey:', menteeError);
      }
    }
  } catch (error) {
    console.error('Error initializing default surveys:', error);
    throw error;
  }
}

// Get all survey templates
export async function getAllSurveyTemplates(): Promise<SurveyTemplate[]> {
  try {
    // Initialize defaults if this is the first time
    await initializeDefaultSurveys();

    const { data, error } = await supabase
      .from('survey_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching survey templates:', error);
      throw error;
    }

    return data?.map(mapRowToTemplate) || [];
  } catch (error) {
    console.error('Error getting survey templates:', error);
    return [];
  }
}

// Get survey templates by type
export async function getSurveyTemplatesByType(type: "mentor" | "mentee"): Promise<SurveyTemplate[]> {
  try {
    const { data, error } = await supabase
      .from('survey_templates')
      .select('*')
      .eq('type', type)
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching survey templates by type:', error);
      throw error;
    }

    return data?.map(mapRowToTemplate) || [];
  } catch (error) {
    console.error('Error getting survey templates by type:', error);
    return [];
  }
}

// Get survey template by ID
export async function getSurveyTemplateById(id: string): Promise<SurveyTemplate | null> {
  try {
    const { data, error } = await supabase
      .from('survey_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      console.error('Error fetching survey template by ID:', error);
      throw error;
    }

    return data ? mapRowToTemplate(data) : null;
  } catch (error) {
    console.error('Error getting survey template by ID:', error);
    return null;
  }
}

// Get default survey template by type
export async function getDefaultSurveyTemplate(type: "mentor" | "mentee"): Promise<SurveyTemplate | null> {
  try {
    const { data, error } = await supabase
      .from('survey_templates')
      .select('*')
      .eq('type', type)
      .eq('is_default', true)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No default found, initialize defaults and try again
        await initializeDefaultSurveys();
        return getDefaultSurveyTemplate(type);
      }
      console.error('Error fetching default survey template:', error);
      throw error;
    }

    return data ? mapRowToTemplate(data) : null;
  } catch (error) {
    console.error('Error getting default survey template:', error);
    return null;
  }
}

// Create new survey template
export async function createSurveyTemplate(input: SurveyTemplateCreateInput): Promise<SurveyTemplate> {
  try {
    // If this is being set as default, unset other defaults of the same type
    if (input.isDefault) {
      const { error: updateError } = await supabase
        .from('survey_templates')
        .update({ is_default: false })
        .eq('type', input.type)
        .eq('is_default', true);

      if (updateError) {
        console.error('Error updating existing defaults:', updateError);
      }
    }

    const { data, error } = await supabase
      .from('survey_templates')
      .insert(mapTemplateToRow(input))
      .select()
      .single();

    if (error) {
      console.error('Error creating survey template:', error);
      throw error;
    }

    return mapRowToTemplate(data);
  } catch (error) {
    console.error('Error creating survey template:', error);
    throw new Error('Failed to create survey template');
  }
}

// Update survey template
export async function updateSurveyTemplate(id: string, input: SurveyTemplateUpdateInput): Promise<SurveyTemplate | null> {
  try {
    // Get the current template to check type for default handling
    const currentTemplate = await getSurveyTemplateById(id);
    if (!currentTemplate) {
      throw new Error('Survey template not found');
    }

    // If this is being set as default, unset other defaults of the same type
    if (input.isDefault && !currentTemplate.isDefault) {
      const { error: updateError } = await supabase
        .from('survey_templates')
        .update({ is_default: false })
        .eq('type', currentTemplate.type)
        .eq('is_default', true)
        .neq('id', id);

      if (updateError) {
        console.error('Error updating existing defaults:', updateError);
      }
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.steps !== undefined) updateData.steps = input.steps;
    if (input.isActive !== undefined) updateData.is_active = input.isActive;
    if (input.isDefault !== undefined) updateData.is_default = input.isDefault;

    // Increment version
    updateData.version = currentTemplate.version + 1;

    const { data, error } = await supabase
      .from('survey_templates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating survey template:', error);
      throw error;
    }

    return mapRowToTemplate(data);
  } catch (error) {
    console.error('Error updating survey template:', error);
    throw new Error('Failed to update survey template');
  }
}

// Duplicate survey template
export async function duplicateSurveyTemplate(id: string, newName?: string): Promise<SurveyTemplate | null> {
  try {
    const originalTemplate = await getSurveyTemplateById(id);
    if (!originalTemplate) {
      throw new Error('Original survey template not found');
    }

    const duplicatedTemplate: SurveyTemplateCreateInput = {
      name: newName || `${originalTemplate.name} (Copy)`,
      description: originalTemplate.description,
      type: originalTemplate.type,
      steps: JSON.parse(JSON.stringify(originalTemplate.steps)), // Deep clone
      isDefault: false, // Duplicates are never default
      createdBy: originalTemplate.createdBy
    };

    return await createSurveyTemplate(duplicatedTemplate);
  } catch (error) {
    console.error('Error duplicating survey template:', error);
    throw new Error('Failed to duplicate survey template');
  }
}

// Delete survey template (soft delete - mark as inactive)
export async function deleteSurveyTemplate(id: string): Promise<boolean> {
  try {
    const template = await getSurveyTemplateById(id);
    if (!template) {
      throw new Error('Survey template not found');
    }

    if (template.isDefault) {
      throw new Error('Cannot delete default survey template');
    }

    // Check if any cohorts are using this survey
    const { data: cohortsUsingTemplate } = await supabase
      .from('cohorts')
      .select('id')
      .or(`mentor_survey_id.eq.${id},mentee_survey_id.eq.${id}`)
      .limit(1);

    if (cohortsUsingTemplate && cohortsUsingTemplate.length > 0) {
      throw new Error('Cannot delete survey template that is being used by cohorts');
    }

    const updated = await updateSurveyTemplate(id, { isActive: false });
    return !!updated;
  } catch (error) {
    console.error('Error deleting survey template:', error);
    throw new Error('Failed to delete survey template');
  }
}

// Set survey template as default
export async function setAsDefaultSurveyTemplate(id: string): Promise<SurveyTemplate | null> {
  try {
    return await updateSurveyTemplate(id, { isDefault: true });
  } catch (error) {
    console.error('Error setting survey template as default:', error);
    throw new Error('Failed to set survey template as default');
  }
}

// Get survey template usage statistics
export async function getSurveyTemplateStats(id: string): Promise<{
  totalResponses: number;
  recentResponses: number;
  averageCompletionTime?: number;
  cohortsUsing: number;
}> {
  try {
    // Count cohorts using this template
    const { data: cohorts } = await supabase
      .from('cohorts')
      .select('id')
      .or(`mentor_survey_id.eq.${id},mentee_survey_id.eq.${id}`);

    // Count mentor responses
    const { count: mentorResponses } = await supabase
      .from('mentors')
      .select('id', { count: 'exact' })
      .eq('survey_template_id', id);

    // Count mentee responses
    const { count: menteeResponses } = await supabase
      .from('mentees')
      .select('id', { count: 'exact' })
      .eq('survey_template_id', id);

    // Count recent responses (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count: recentMentorResponses } = await supabase
      .from('mentors')
      .select('id', { count: 'exact' })
      .eq('survey_template_id', id)
      .gte('created_at', thirtyDaysAgo.toISOString());

    const { count: recentMenteeResponses } = await supabase
      .from('mentees')
      .select('id', { count: 'exact' })
      .eq('survey_template_id', id)
      .gte('created_at', thirtyDaysAgo.toISOString());

    return {
      totalResponses: (mentorResponses || 0) + (menteeResponses || 0),
      recentResponses: (recentMentorResponses || 0) + (recentMenteeResponses || 0),
      cohortsUsing: cohorts?.length || 0
    };
  } catch (error) {
    console.error('Error getting survey template stats:', error);
    return {
      totalResponses: 0,
      recentResponses: 0,
      cohortsUsing: 0
    };
  }
}

// Migrate data from localStorage to Supabase (one-time operation)
export async function migrateFromLocalStorage(): Promise<{ success: boolean; message: string }> {
  try {
    const localData = localStorage.getItem('survey_templates');
    if (!localData) {
      return { success: true, message: 'No local data to migrate' };
    }

    const templates: SurveyTemplate[] = JSON.parse(localData);
    let migratedCount = 0;

    for (const template of templates) {
      // Check if template already exists in database
      const existing = await getSurveyTemplateById(template.id);
      if (!existing) {
        const templateInput: SurveyTemplateCreateInput = {
          name: template.name,
          description: template.description,
          type: template.type,
          steps: template.steps,
          isDefault: template.isDefault,
          createdBy: template.createdBy
        };

        await createSurveyTemplate(templateInput);
        migratedCount++;
      }
    }

    // Clear localStorage after successful migration
    localStorage.removeItem('survey_templates');

    return {
      success: true,
      message: `Successfully migrated ${migratedCount} survey templates to database`
    };
  } catch (error) {
    console.error('Error migrating from localStorage:', error);
    return {
      success: false,
      message: 'Failed to migrate data from localStorage'
    };
  }
}