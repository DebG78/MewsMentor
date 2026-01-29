import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Trash2,
  Edit,
  Save,
  GripVertical,
  Copy,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff
} from "lucide-react";
import { SurveyTemplate, SurveyStep, SurveyQuestion, SurveyTemplateCreateInput } from "@/types/surveys";
import {
  createSurveyTemplate,
  updateSurveyTemplate
} from "@/lib/surveyTemplateSupabaseService";

// Validation function
function validateSurveyTemplate(template: any): string[] {
  const errors: string[] = [];

  if (!template.name || template.name.trim().length === 0) {
    errors.push('Survey name is required');
  }

  if (!template.steps || template.steps.length === 0) {
    errors.push('Survey must have at least one step');
  }

  template.steps?.forEach((step: any, stepIndex: number) => {
    if (!step.title || step.title.trim().length === 0) {
      errors.push(`Step ${stepIndex + 1}: Title is required`);
    }

    if (step.questions.length === 0) {
      errors.push(`Step ${stepIndex + 1}: Must have at least one question`);
    }

    step.questions.forEach((question: any, questionIndex: number) => {
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

  return errors;
}

interface SurveyTemplateEditorProps {
  template?: SurveyTemplate | null;
  type: "mentor" | "mentee";
  onSave: () => void;
  onCancel: () => void;
}

export const SurveyTemplateEditor = ({ template, type, onSave, onCancel }: SurveyTemplateEditorProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: template?.name || "",
    description: template?.description || "",
    isDefault: template?.isDefault || false,
    steps: template?.steps || []
  });

  // Initialize with empty step if no template
  useEffect(() => {
    if (!template && formData.steps.length === 0) {
      const emptyStep: SurveyStep = {
        id: `step_${Date.now()}`,
        title: "Step 1",
        description: "Enter step description",
        step: 1,
        questions: []
      };
      setFormData(prev => ({ ...prev, steps: [emptyStep] }));
    }
  }, [template, formData.steps.length]);

  // Add new step
  const addStep = () => {
    const newStep: SurveyStep = {
      id: `step_${Date.now()}`,
      title: `Step ${formData.steps.length + 1}`,
      description: "Enter step description",
      step: formData.steps.length + 1,
      questions: []
    };
    setFormData(prev => ({ ...prev, steps: [...prev.steps, newStep] }));
  };

  // Delete step
  const deleteStep = (stepId: string) => {
    if (formData.steps.length === 1) {
      toast({
        title: "Cannot Delete",
        description: "Survey must have at least one step.",
        variant: "destructive",
      });
      return;
    }

    setFormData(prev => ({
      ...prev,
      steps: prev.steps.filter(step => step.id !== stepId).map((step, index) => ({
        ...step,
        step: index + 1,
        title: step.title === `Step ${step.step}` ? `Step ${index + 1}` : step.title
      }))
    }));
  };

  // Update step
  const updateStep = (stepId: string, updates: Partial<SurveyStep>) => {
    setFormData(prev => ({
      ...prev,
      steps: prev.steps.map(step =>
        step.id === stepId ? { ...step, ...updates } : step
      )
    }));
  };

  // Add question to step
  const addQuestion = (stepId: string) => {
    const newQuestion: SurveyQuestion = {
      id: `q_${Date.now()}`,
      type: "text",
      title: "New Question",
      required: false,
      step: formData.steps.find(s => s.id === stepId)?.step || 1,
      order: (formData.steps.find(s => s.id === stepId)?.questions.length || 0) + 1,
      active: true
    };

    setFormData(prev => ({
      ...prev,
      steps: prev.steps.map(step =>
        step.id === stepId
          ? { ...step, questions: [...step.questions, newQuestion] }
          : step
      )
    }));

    setEditingQuestion(newQuestion.id);
  };

  // Update question
  const updateQuestion = (stepId: string, questionId: string, updates: Partial<SurveyQuestion>) => {
    setFormData(prev => ({
      ...prev,
      steps: prev.steps.map(step =>
        step.id === stepId
          ? {
              ...step,
              questions: step.questions.map(q =>
                q.id === questionId ? { ...q, ...updates } : q
              )
            }
          : step
      )
    }));
  };

  // Delete question
  const deleteQuestion = (stepId: string, questionId: string) => {
    setFormData(prev => ({
      ...prev,
      steps: prev.steps.map(step =>
        step.id === stepId
          ? {
              ...step,
              questions: step.questions.filter(q => q.id !== questionId)
            }
          : step
      )
    }));
  };

  // Duplicate question
  const duplicateQuestion = (stepId: string, questionId: string) => {
    const step = formData.steps.find(s => s.id === stepId);
    const question = step?.questions.find(q => q.id === questionId);

    if (!step || !question) return;

    const duplicatedQuestion: SurveyQuestion = {
      ...question,
      id: `q_${Date.now()}`,
      title: `${question.title} (Copy)`,
      order: step.questions.length + 1
    };

    setFormData(prev => ({
      ...prev,
      steps: prev.steps.map(s =>
        s.id === stepId
          ? { ...s, questions: [...s.questions, duplicatedQuestion] }
          : s
      )
    }));
  };

  // Move question up/down
  const moveQuestion = (stepId: string, questionId: string, direction: 'up' | 'down') => {
    const step = formData.steps.find(s => s.id === stepId);
    if (!step) return;

    const questionIndex = step.questions.findIndex(q => q.id === questionId);
    if (questionIndex === -1) return;

    const newIndex = direction === 'up' ? questionIndex - 1 : questionIndex + 1;
    if (newIndex < 0 || newIndex >= step.questions.length) return;

    const updatedQuestions = [...step.questions];
    [updatedQuestions[questionIndex], updatedQuestions[newIndex]] =
      [updatedQuestions[newIndex], updatedQuestions[questionIndex]];

    // Update order numbers
    updatedQuestions.forEach((q, index) => {
      q.order = index + 1;
    });

    setFormData(prev => ({
      ...prev,
      steps: prev.steps.map(s =>
        s.id === stepId ? { ...s, questions: updatedQuestions } : s
      )
    }));
  };

  // Validate and save
  const handleSave = async () => {
    setLoading(true);
    try {
      // Validate survey structure
      const input: SurveyTemplateCreateInput = {
        name: formData.name,
        description: formData.description,
        type: type,
        steps: formData.steps,
        isDefault: formData.isDefault
      };

      const validationErrors = validateSurveyTemplate(input);
      if (validationErrors.length > 0) {
        toast({
          title: "Validation Error",
          description: validationErrors.join(", "),
          variant: "destructive",
        });
        return;
      }

      // Save survey
      if (template) {
        await updateSurveyTemplate(template.id, input);
        toast({
          title: "Survey Updated",
          description: `"${formData.name}" has been updated successfully.`,
        });
      } else {
        await createSurveyTemplate(input);
        toast({
          title: "Survey Created",
          description: `"${formData.name}" has been created successfully.`,
        });
      }

      onSave();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save survey template",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Render question editor
  const renderQuestionEditor = (step: SurveyStep, question: SurveyQuestion) => {
    const isEditing = editingQuestion === question.id;

    return (
      <Card key={question.id} className={`mb-4 ${!question.active ? 'opacity-60' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
              <Badge variant={question.required ? "default" : "outline"}>
                {question.required ? "Required" : "Optional"}
              </Badge>
              <Badge variant="outline">{question.type}</Badge>
              {!question.active && <Badge variant="secondary">Disabled</Badge>}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => moveQuestion(step.id, question.id, 'up')}
                disabled={question.order === 1}
              >
                <ArrowUp className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => moveQuestion(step.id, question.id, 'down')}
                disabled={question.order === step.questions.length}
              >
                <ArrowDown className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => duplicateQuestion(step.id, question.id)}
              >
                <Copy className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingQuestion(isEditing ? null : question.id)}
              >
                <Edit className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteQuestion(step.id, question.id)}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor={`title-${question.id}`}>Question Title</Label>
                <Input
                  id={`title-${question.id}`}
                  value={question.title}
                  onChange={(e) => updateQuestion(step.id, question.id, { title: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor={`description-${question.id}`}>Description (Optional)</Label>
                <Input
                  id={`description-${question.id}`}
                  value={question.description || ""}
                  onChange={(e) => updateQuestion(step.id, question.id, { description: e.target.value })}
                  placeholder="Additional context or instructions"
                />
              </div>

              <div>
                <Label htmlFor={`type-${question.id}`}>Question Type</Label>
                <Select
                  value={question.type}
                  onValueChange={(value: SurveyQuestion['type']) => updateQuestion(step.id, question.id, { type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text Input</SelectItem>
                    <SelectItem value="textarea">Text Area</SelectItem>
                    <SelectItem value="select">Dropdown</SelectItem>
                    <SelectItem value="multiselect">Multi-select</SelectItem>
                    <SelectItem value="radio">Radio Buttons</SelectItem>
                    <SelectItem value="checkbox">Checkboxes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {question.type === "text" && (
                <div>
                  <Label htmlFor={`placeholder-${question.id}`}>Placeholder Text</Label>
                  <Input
                    id={`placeholder-${question.id}`}
                    value={question.placeholder || ""}
                    onChange={(e) => updateQuestion(step.id, question.id, { placeholder: e.target.value })}
                  />
                </div>
              )}

              {["select", "multiselect", "radio", "checkbox"].includes(question.type) && (
                <div>
                  <Label>Options</Label>
                  <Textarea
                    value={question.options?.join('\n') || ""}
                    onChange={(e) => updateQuestion(step.id, question.id, { options: e.target.value.split('\n').filter(o => o.trim()) })}
                    placeholder="Enter each option on a new line"
                    className="min-h-24"
                  />
                </div>
              )}

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={question.required}
                    onChange={(e) => updateQuestion(step.id, question.id, { required: e.target.checked })}
                  />
                  Required
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={question.active}
                    onChange={(e) => updateQuestion(step.id, question.id, { active: e.target.checked })}
                  />
                  Active
                </label>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => setEditingQuestion(null)}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
                <Button variant="outline" onClick={() => setEditingQuestion(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <h4 className="font-medium mb-1">{question.title}</h4>
              {question.description && (
                <p className="text-sm text-muted-foreground mb-2">{question.description}</p>
              )}
              {question.placeholder && (
                <p className="text-xs text-muted-foreground italic">Placeholder: {question.placeholder}</p>
              )}
              {question.options && question.options.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground mb-1">Options:</p>
                  <div className="flex flex-wrap gap-1">
                    {question.options.slice(0, 3).map((option, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {option}
                      </Badge>
                    ))}
                    {question.options.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{question.options.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto space-y-6 py-6">
        {/* Survey Details */}
        <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Survey Details</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewMode(!previewMode)}
              >
                {previewMode ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                {previewMode ? "Edit Mode" : "Preview"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="survey-name">Survey Name</Label>
            <Input
              id="survey-name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter survey name"
            />
          </div>

          <div>
            <Label htmlFor="survey-description">Description (Optional)</Label>
            <Textarea
              id="survey-description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe the purpose of this survey"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is-default"
              checked={formData.isDefault}
              onChange={(e) => setFormData(prev => ({ ...prev, isDefault: e.target.checked }))}
            />
            <Label htmlFor="is-default">Set as default {type} survey</Label>
          </div>
        </CardContent>
      </Card>

      {/* Survey Steps */}
      <div className="space-y-4">
        {formData.steps.map((step, stepIndex) => (
          <Card key={step.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Input
                      value={step.title}
                      onChange={(e) => updateStep(step.id, { title: e.target.value })}
                      className="font-semibold text-base border-none p-0 h-auto focus-visible:ring-0"
                    />
                  </div>
                  <Textarea
                    value={step.description}
                    onChange={(e) => updateStep(step.id, { description: e.target.value })}
                    className="text-sm text-muted-foreground border-none p-0 resize-none min-h-0 h-auto focus-visible:ring-0"
                    rows={1}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addQuestion(step.id)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Question
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteStep(step.id)}
                    disabled={formData.steps.length === 1}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {step.questions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No questions in this step yet</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => addQuestion(step.id)}
                  >
                    Add First Question
                  </Button>
                </div>
              ) : (
                step.questions.map((question) => renderQuestionEditor(step, question))
              )}
            </CardContent>
          </Card>
        ))}

        <Button variant="outline" onClick={addStep} className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Add Step
        </Button>
      </div>

      {/* Actions - Fixed at bottom */}
      <div className="flex-shrink-0 flex justify-between pt-6 pb-6 border-t bg-background sticky bottom-0">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={loading}>
          {loading ? "Saving..." : "Save Survey"}
        </Button>
      </div>
      </div>
    </div>
  );
};