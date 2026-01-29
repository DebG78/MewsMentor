// Survey Template Service - Handles CRUD operations for survey templates

import {
  SurveyTemplate,
  SurveyTemplateCreateInput,
  SurveyTemplateUpdateInput,
  DEFAULT_MENTOR_SURVEY_TEMPLATE,
  DEFAULT_MENTEE_SURVEY_TEMPLATE
} from "@/types/surveys";

// For now, we'll use localStorage to store survey templates
// Later this will be replaced with Supabase integration

const STORAGE_KEY = 'survey_templates';

// Helper to generate unique IDs
function generateSurveyId(): string {
  return `survey_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Helper to get current timestamp
function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

// Initialize default surveys if they don't exist
function initializeDefaultSurveys(): SurveyTemplate[] {
  const existing = localStorage.getItem(STORAGE_KEY);

  // Always reload default surveys to get the latest updates
  const defaultSurveys: SurveyTemplate[] = [
    {
      ...DEFAULT_MENTOR_SURVEY_TEMPLATE,
      id: generateSurveyId(),
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp()
    },
    {
      ...DEFAULT_MENTEE_SURVEY_TEMPLATE,
      id: generateSurveyId(),
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp()
    }
  ];

  // If we have existing surveys, merge them with defaults but replace defaults
  if (existing) {
    try {
      const existingSurveys: SurveyTemplate[] = JSON.parse(existing);
      const nonDefaultSurveys = existingSurveys.filter(survey => !survey.isDefault);
      const mergedSurveys = [...defaultSurveys, ...nonDefaultSurveys];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedSurveys));
      return mergedSurveys;
    } catch (error) {
      console.error('Error parsing existing surveys, resetting to defaults:', error);
    }
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultSurveys));
  return defaultSurveys;
}

// Reset all surveys to defaults (useful for development/testing)
export async function resetToDefaultSurveys(): Promise<SurveyTemplate[]> {
  localStorage.removeItem(STORAGE_KEY);
  return initializeDefaultSurveys();
}

// Get all survey templates
export async function getAllSurveyTemplates(): Promise<SurveyTemplate[]> {
  try {
    return initializeDefaultSurveys();
  } catch (error) {
    console.error('Error getting survey templates:', error);
    return [];
  }
}

// Get survey templates by type
export async function getSurveyTemplatesByType(type: "mentor" | "mentee"): Promise<SurveyTemplate[]> {
  try {
    const allTemplates = await getAllSurveyTemplates();
    return allTemplates.filter(template => template.type === type && template.isActive);
  } catch (error) {
    console.error('Error getting survey templates by type:', error);
    return [];
  }
}

// Get survey template by ID
export async function getSurveyTemplateById(id: string): Promise<SurveyTemplate | null> {
  try {
    const allTemplates = await getAllSurveyTemplates();
    return allTemplates.find(template => template.id === id) || null;
  } catch (error) {
    console.error('Error getting survey template by ID:', error);
    return null;
  }
}

// Get default survey template by type
export async function getDefaultSurveyTemplate(type: "mentor" | "mentee"): Promise<SurveyTemplate | null> {
  try {
    const allTemplates = await getAllSurveyTemplates();
    return allTemplates.find(template => template.type === type && template.isDefault && template.isActive) || null;
  } catch (error) {
    console.error('Error getting default survey template:', error);
    return null;
  }
}

// Create new survey template
export async function createSurveyTemplate(input: SurveyTemplateCreateInput): Promise<SurveyTemplate> {
  try {
    const allTemplates = await getAllSurveyTemplates();

    // If this is being set as default, unset other defaults of the same type
    if (input.isDefault) {
      allTemplates.forEach(template => {
        if (template.type === input.type && template.isDefault) {
          template.isDefault = false;
        }
      });
    }

    const newTemplate: SurveyTemplate = {
      id: generateSurveyId(),
      name: input.name,
      description: input.description,
      type: input.type,
      steps: input.steps,
      isDefault: input.isDefault || false,
      createdBy: input.createdBy,
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp(),
      isActive: true,
      version: 1
    };

    const updatedTemplates = [...allTemplates, newTemplate];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTemplates));

    return newTemplate;
  } catch (error) {
    console.error('Error creating survey template:', error);
    throw new Error('Failed to create survey template');
  }
}

// Update survey template
export async function updateSurveyTemplate(id: string, input: SurveyTemplateUpdateInput): Promise<SurveyTemplate | null> {
  try {
    const allTemplates = await getAllSurveyTemplates();
    const templateIndex = allTemplates.findIndex(template => template.id === id);

    if (templateIndex === -1) {
      throw new Error('Survey template not found');
    }

    const existingTemplate = allTemplates[templateIndex];

    // If this is being set as default, unset other defaults of the same type
    if (input.isDefault && !existingTemplate.isDefault) {
      allTemplates.forEach(template => {
        if (template.type === existingTemplate.type && template.isDefault && template.id !== id) {
          template.isDefault = false;
        }
      });
    }

    const updatedTemplate: SurveyTemplate = {
      ...existingTemplate,
      ...input,
      updatedAt: getCurrentTimestamp(),
      version: existingTemplate.version + 1
    };

    allTemplates[templateIndex] = updatedTemplate;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allTemplates));

    return updatedTemplate;
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
    const allTemplates = await getAllSurveyTemplates();
    const template = allTemplates.find(t => t.id === id);

    if (!template) {
      throw new Error('Survey template not found');
    }

    if (template.isDefault) {
      throw new Error('Cannot delete default survey template');
    }

    // Check if any cohorts are using this survey
    // TODO: Add check when cohort integration is implemented

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

// Validate survey template structure
export function validateSurveyTemplate(template: SurveyTemplateCreateInput | SurveyTemplateUpdateInput): string[] {
  const errors: string[] = [];

  if ('name' in template && (!template.name || template.name.trim().length === 0)) {
    errors.push('Survey name is required');
  }

  if ('steps' in template && template.steps) {
    if (template.steps.length === 0) {
      errors.push('Survey must have at least one step');
    }

    template.steps.forEach((step, stepIndex) => {
      if (!step.title || step.title.trim().length === 0) {
        errors.push(`Step ${stepIndex + 1}: Title is required`);
      }

      if (step.questions.length === 0) {
        errors.push(`Step ${stepIndex + 1}: Must have at least one question`);
      }

      step.questions.forEach((question, questionIndex) => {
        if (!question.title || question.title.trim().length === 0) {
          errors.push(`Step ${stepIndex + 1}, Question ${questionIndex + 1}: Title is required`);
        }

        if (['select', 'multiselect', 'radio', 'checkbox'].includes(question.type)) {
          if (!question.options || question.options.length === 0) {
            errors.push(`Step ${stepIndex + 1}, Question ${questionIndex + 1}: Options are required for ${question.type} questions`);
          }
        }
      });
    });
  }

  return errors;
}

// Get survey template usage statistics
export async function getSurveyTemplateStats(id: string): Promise<{
  totalResponses: number;
  recentResponses: number;
  averageCompletionTime?: number;
  cohortsUsing: number;
}> {
  // TODO: Implement when response tracking is added
  return {
    totalResponses: 0,
    recentResponses: 0,
    cohortsUsing: 0
  };
}