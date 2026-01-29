import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Eye } from "lucide-react";
import { SurveyTemplate, SurveyQuestion } from "@/types/surveys";

interface SurveyTemplatePreviewProps {
  template: SurveyTemplate;
}

export const SurveyTemplatePreview = ({ template }: SurveyTemplatePreviewProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Record<string, any>>({});

  const currentStepData = template.steps.find(step => step.step === currentStep);
  const totalSteps = template.steps.length;
  const progress = (currentStep / totalSteps) * 100;

  // Handle form field changes
  const handleFieldChange = (questionId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  // Handle checkbox array changes
  const handleCheckboxChange = (questionId: string, option: string, checked: boolean) => {
    setFormData(prev => {
      const currentValues = prev[questionId] || [];
      if (checked) {
        return {
          ...prev,
          [questionId]: [...currentValues, option]
        };
      } else {
        return {
          ...prev,
          [questionId]: currentValues.filter((item: string) => item !== option)
        };
      }
    });
  };

  // Render form field based on question type
  const renderFormField = (question: SurveyQuestion) => {
    if (!question.active) return null;

    const value = formData[question.id];

    switch (question.type) {
      case "text":
        return (
          <Input
            value={value || ""}
            onChange={(e) => handleFieldChange(question.id, e.target.value)}
            placeholder={question.placeholder}
          />
        );

      case "textarea":
        return (
          <Textarea
            value={value || ""}
            onChange={(e) => handleFieldChange(question.id, e.target.value)}
            placeholder={question.placeholder}
            className="min-h-24"
          />
        );

      case "select":
        return (
          <Select
            value={value || ""}
            onValueChange={(val) => handleFieldChange(question.id, val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {question.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "radio":
        return (
          <RadioGroup
            value={value || ""}
            onValueChange={(val) => handleFieldChange(question.id, val)}
          >
            {question.options?.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`${question.id}-${option}`} />
                <Label htmlFor={`${question.id}-${option}`}>{option}</Label>
              </div>
            ))}
          </RadioGroup>
        );

      case "checkbox":
        const selectedValues = value || [];
        return (
          <div className="space-y-2">
            {question.options?.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <Checkbox
                  id={`${question.id}-${option}`}
                  checked={selectedValues.includes(option)}
                  onCheckedChange={(checked) =>
                    handleCheckboxChange(question.id, option, checked as boolean)
                  }
                />
                <Label htmlFor={`${question.id}-${option}`}>{option}</Label>
              </div>
            ))}
          </div>
        );

      case "multiselect":
        // For preview, we'll show this as checkboxes
        const multiSelectValues = value || [];
        return (
          <div className="space-y-2">
            {question.options?.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <Checkbox
                  id={`${question.id}-${option}`}
                  checked={multiSelectValues.includes(option)}
                  onCheckedChange={(checked) =>
                    handleCheckboxChange(question.id, option, checked as boolean)
                  }
                />
                <Label htmlFor={`${question.id}-${option}`}>{option}</Label>
              </div>
            ))}
          </div>
        );

      default:
        return <div className="text-muted-foreground italic">Unsupported question type</div>;
    }
  };

  // Check if current step is valid (required fields filled)
  const isCurrentStepValid = () => {
    if (!currentStepData) return false;

    const requiredQuestions = currentStepData.questions.filter(q => q.required && q.active);
    return requiredQuestions.every(question => {
      const value = formData[question.id];
      if (question.type === "checkbox" || question.type === "multiselect") {
        return value && Array.isArray(value) && value.length > 0;
      }
      return value && value.toString().trim().length > 0;
    });
  };

  const canProceed = () => {
    return currentStep === totalSteps || isCurrentStepValid();
  };

  const canGoBack = () => {
    return currentStep > 1;
  };

  if (!currentStepData) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No step data found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Preview Header */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-blue-600" />
            <CardTitle className="text-blue-900">Survey Preview</CardTitle>
          </div>
          <CardDescription className="text-blue-700">
            This is how the survey will appear to users during registration
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Survey Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">{template.name}</h1>
        {template.description && (
          <p className="text-muted-foreground">{template.description}</p>
        )}
        <Badge variant="outline" className="mt-2">
          {template.type === "mentor" ? "Mentor" : "Mentee"} Registration
        </Badge>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Step {currentStep} of {totalSteps}</span>
          <span>{Math.round(progress)}% complete</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Current Step */}
      <Card>
        <CardHeader>
          <CardTitle>{currentStepData.title}</CardTitle>
          <CardDescription>{currentStepData.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {currentStepData.questions
            .filter(q => q.active)
            .sort((a, b) => a.order - b.order)
            .map((question) => (
              <div key={question.id} className="space-y-2">
                <Label className="text-base font-medium">
                  {question.title}
                  {question.required && <span className="text-red-500 ml-1">*</span>}
                </Label>
                {question.description && (
                  <p className="text-sm text-muted-foreground">{question.description}</p>
                )}
                {renderFormField(question)}
              </div>
            ))}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
          disabled={!canGoBack()}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>

        {currentStep < totalSteps ? (
          <Button
            onClick={() => setCurrentStep(prev => prev + 1)}
            disabled={!isCurrentStepValid()}
          >
            Next
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button disabled={!isCurrentStepValid()}>
            Complete Registration
          </Button>
        )}
      </div>

      {/* Step Navigation */}
      <div className="flex justify-center space-x-2">
        {template.steps.map((step) => (
          <Button
            key={step.id}
            variant={step.step === currentStep ? "default" : "outline"}
            size="sm"
            onClick={() => setCurrentStep(step.step)}
            className="w-10 h-10 p-0"
          >
            {step.step}
          </Button>
        ))}
      </div>

      {/* Debug Info (for preview only) */}
      <Card className="bg-gray-50 border-gray-200">
        <CardHeader>
          <CardTitle className="text-sm">Preview Data (Debug)</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(formData, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
};