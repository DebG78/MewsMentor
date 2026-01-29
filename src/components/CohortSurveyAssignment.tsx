import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import {
  FileText,
  Users,
  User,
  Save,
  AlertTriangle,
  CheckCircle,
  Eye
} from "lucide-react";
import { SurveyTemplate } from "@/types/surveys";
import { Cohort } from "@/types/mentoring";
import { getAllSurveyTemplates, getDefaultSurveyTemplate } from "@/lib/surveyTemplateSupabaseService";
import { SurveyTemplatePreview } from "./SurveyTemplatePreview";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface CohortSurveyAssignmentProps {
  cohort: Cohort;
  onUpdate: (updates: { mentor_survey_id?: string; mentee_survey_id?: string }) => Promise<void>;
}

export const CohortSurveyAssignment = ({ cohort, onUpdate }: CohortSurveyAssignmentProps) => {
  const { toast } = useToast();
  const [surveyTemplates, setSurveyTemplates] = useState<SurveyTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedMentorSurvey, setSelectedMentorSurvey] = useState<string>(cohort.mentor_survey_id || "");
  const [selectedMenteeSurvey, setSelectedMenteeSurvey] = useState<string>(cohort.mentee_survey_id || "");
  const [previewingSurvey, setPreviewingSurvey] = useState<SurveyTemplate | null>(null);

  // Load survey templates
  useEffect(() => {
    loadSurveyTemplates();
  }, []);

  // Set default surveys if none are selected
  useEffect(() => {
    if (surveyTemplates.length > 0 && !cohort.mentor_survey_id && !cohort.mentee_survey_id) {
      setDefaultSurveys();
    }
  }, [surveyTemplates, cohort]);

  const loadSurveyTemplates = async () => {
    try {
      setLoading(true);
      const templates = await getAllSurveyTemplates();
      setSurveyTemplates(templates.filter(t => t.isActive));
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load survey templates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const setDefaultSurveys = async () => {
    try {
      const [defaultMentor, defaultMentee] = await Promise.all([
        getDefaultSurveyTemplate("mentor"),
        getDefaultSurveyTemplate("mentee")
      ]);

      if (defaultMentor && !selectedMentorSurvey) {
        setSelectedMentorSurvey(defaultMentor.id);
      }
      if (defaultMentee && !selectedMenteeSurvey) {
        setSelectedMenteeSurvey(defaultMentee.id);
      }
    } catch (error) {
      console.error("Error setting default surveys:", error);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await onUpdate({
        mentor_survey_id: selectedMentorSurvey || undefined,
        mentee_survey_id: selectedMenteeSurvey || undefined
      });

      toast({
        title: "Survey Assignment Updated",
        description: "Survey templates have been assigned to this cohort",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update survey assignments",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = () => {
    return selectedMentorSurvey !== (cohort.mentor_survey_id || "") ||
           selectedMenteeSurvey !== (cohort.mentee_survey_id || "");
  };

  const getMentorSurveys = () => surveyTemplates.filter(t => t.type === "mentor");
  const getMenteeSurveys = () => surveyTemplates.filter(t => t.type === "mentee");

  const getSurveyById = (id: string) => surveyTemplates.find(s => s.id === id);

  const getStepCount = (template: SurveyTemplate) => template.steps.length;
  const getQuestionCount = (template: SurveyTemplate) =>
    template.steps.reduce((total, step) => total + step.questions.length, 0);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Loading survey templates...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Survey Assignment Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Mentor Survey */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="w-4 h-4" />
              Mentor Survey
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mentor-survey">Select Survey Template</Label>
              <Select value={selectedMentorSurvey} onValueChange={setSelectedMentorSurvey}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a mentor survey template" />
                </SelectTrigger>
                <SelectContent>
                  {getMentorSurveys().map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex items-center gap-2">
                        <span>{template.name}</span>
                        {template.isDefault && (
                          <Badge variant="outline" className="text-xs">Default</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedMentorSurvey && getSurveyById(selectedMentorSurvey) && (
              <div className="space-y-3">
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        {getSurveyById(selectedMentorSurvey)!.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {getStepCount(getSurveyById(selectedMentorSurvey)!)} steps, {" "}
                        {getQuestionCount(getSurveyById(selectedMentorSurvey)!)} questions
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPreviewingSurvey(getSurveyById(selectedMentorSurvey)!)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Preview
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mentee Survey */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="w-4 h-4" />
              Mentee Survey
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mentee-survey">Select Survey Template</Label>
              <Select value={selectedMenteeSurvey} onValueChange={setSelectedMenteeSurvey}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a mentee survey template" />
                </SelectTrigger>
                <SelectContent>
                  {getMenteeSurveys().map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex items-center gap-2">
                        <span>{template.name}</span>
                        {template.isDefault && (
                          <Badge variant="outline" className="text-xs">Default</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedMenteeSurvey && getSurveyById(selectedMenteeSurvey) && (
              <div className="space-y-3">
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        {getSurveyById(selectedMenteeSurvey)!.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {getStepCount(getSurveyById(selectedMenteeSurvey)!)} steps, {" "}
                        {getQuestionCount(getSurveyById(selectedMenteeSurvey)!)} questions
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPreviewingSurvey(getSurveyById(selectedMenteeSurvey)!)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Preview
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Status Alert */}
      {selectedMentorSurvey && selectedMenteeSurvey ? (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            ✅ Both mentor and mentee surveys are assigned. New signups will use these custom surveys.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            ⚠️ Please assign both mentor and mentee surveys to complete the cohort setup.
          </AlertDescription>
        </Alert>
      )}

      {/* Save Button */}
      {hasChanges() && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save Survey Assignment"}
          </Button>
        </div>
      )}

      {/* Preview Dialog */}
      {previewingSurvey && (
        <Dialog open={!!previewingSurvey} onOpenChange={() => setPreviewingSurvey(null)}>
          <DialogContent className="max-w-4xl w-[90vw] h-[90vh] flex flex-col p-0">
            <DialogHeader className="px-6 py-4 border-b">
              <DialogTitle>Preview: {previewingSurvey.name}</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <SurveyTemplatePreview template={previewingSurvey} />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};