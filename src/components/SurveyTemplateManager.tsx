import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  MoreVertical,
  Edit,
  Copy,
  Trash2,
  Eye,
  Star,
  StarOff,
  FileText,
  Users,
  Clock,
  CheckCircle
} from "lucide-react";
import { SurveyTemplate } from "@/types/surveys";
import {
  getAllSurveyTemplates,
  getSurveyTemplatesByType,
  duplicateSurveyTemplate,
  deleteSurveyTemplate,
  setAsDefaultSurveyTemplate,
  getSurveyTemplateStats,
  migrateFromLocalStorage
} from "@/lib/surveyTemplateSupabaseService";
import { SurveyTemplateEditor } from "./SurveyTemplateEditor";
import { SurveyTemplatePreview } from "./SurveyTemplatePreview";

export const SurveyTemplateManager = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("all");
  const [templates, setTemplates] = useState<SurveyTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<SurveyTemplate | null>(null);
  const [previewingTemplate, setPreviewingTemplate] = useState<SurveyTemplate | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createType, setCreateType] = useState<"mentor" | "mentee">("mentor");

  // Load survey templates
  const loadTemplates = async () => {
    try {
      setLoading(true);
      const allTemplates = await getAllSurveyTemplates();
      setTemplates(allTemplates);
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

  useEffect(() => {
    loadTemplates();
  }, []);

  // Filter templates based on active tab
  const getFilteredTemplates = () => {
    switch (activeTab) {
      case "mentor":
        return templates.filter(t => t.type === "mentor" && t.isActive);
      case "mentee":
        return templates.filter(t => t.type === "mentee" && t.isActive);
      case "drafts":
        return templates.filter(t => !t.isActive);
      default:
        return templates.filter(t => t.isActive);
    }
  };

  // Handle duplicate template
  const handleDuplicate = async (template: SurveyTemplate) => {
    try {
      await duplicateSurveyTemplate(template.id, `${template.name} (Copy)`);
      await loadTemplates();
      toast({
        title: "Survey Duplicated",
        description: `"${template.name}" has been duplicated successfully.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to duplicate survey template",
        variant: "destructive",
      });
    }
  };

  // Handle delete template
  const handleDelete = async (template: SurveyTemplate) => {
    if (template.isDefault) {
      toast({
        title: "Cannot Delete",
        description: "Default survey templates cannot be deleted.",
        variant: "destructive",
      });
      return;
    }

    try {
      await deleteSurveyTemplate(template.id);
      await loadTemplates();
      toast({
        title: "Survey Deleted",
        description: `"${template.name}" has been deleted.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete survey template",
        variant: "destructive",
      });
    }
  };

  // Handle set as default
  const handleSetAsDefault = async (template: SurveyTemplate) => {
    try {
      await setAsDefaultSurveyTemplate(template.id);
      await loadTemplates();
      toast({
        title: "Default Set",
        description: `"${template.name}" is now the default ${template.type} survey.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to set as default survey",
        variant: "destructive",
      });
    }
  };

  // Handle create new survey
  const handleCreate = (type: "mentor" | "mentee") => {
    setCreateType(type);
    setEditingTemplate(null);
    setShowCreateDialog(true);
  };

  // Handle edit survey
  const handleEdit = (template: SurveyTemplate) => {
    setEditingTemplate(template);
    setShowCreateDialog(true);
  };

  // Handle save from editor
  const handleSave = async () => {
    await loadTemplates();
    setShowCreateDialog(false);
    setEditingTemplate(null);
  };

  // Handle migration from localStorage
  const handleMigrateFromLocalStorage = async () => {
    try {
      const result = await migrateFromLocalStorage();
      await loadTemplates();
      toast({
        title: result.success ? "Migration Complete" : "Migration Failed",
        description: result.message,
        variant: result.success ? "default" : "destructive"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to migrate surveys from localStorage",
        variant: "destructive",
      });
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Get template stats badge
  const getStatsBadge = (template: SurveyTemplate) => {
    const stepCount = template.steps.length;
    const questionCount = template.steps.reduce((total, step) => total + step.questions.length, 0);
    return `${stepCount} steps, ${questionCount} questions`;
  };

  const filteredTemplates = getFilteredTemplates();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Survey Templates</h3>
          <p className="text-sm text-muted-foreground">
            Create and manage survey templates for mentor and mentee registration
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleMigrateFromLocalStorage}>
            Migrate from Local
          </Button>
          <Button variant="outline" onClick={() => handleCreate("mentee")}>
            <Plus className="w-4 h-4 mr-2" />
            New Mentee Survey
          </Button>
          <Button onClick={() => handleCreate("mentor")}>
            <Plus className="w-4 h-4 mr-2" />
            New Mentor Survey
          </Button>
        </div>
      </div>

      {/* Survey Type Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Surveys</TabsTrigger>
          <TabsTrigger value="mentor">Mentor Surveys</TabsTrigger>
          <TabsTrigger value="mentee">Mentee Surveys</TabsTrigger>
          <TabsTrigger value="drafts">Drafts</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {loading ? (
            <Card className="p-8 text-center">
              <div className="animate-pulse">Loading survey templates...</div>
            </Card>
          ) : filteredTemplates.length === 0 ? (
            <Card className="p-8 text-center">
              <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Survey Templates</h3>
              <p className="text-muted-foreground mb-4">
                {activeTab === "drafts"
                  ? "No draft surveys found."
                  : "Create your first survey template to get started."
                }
              </p>
              {activeTab !== "drafts" && (
                <div className="flex justify-center gap-2">
                  <Button variant="outline" onClick={() => handleCreate("mentee")}>
                    Create Mentee Survey
                  </Button>
                  <Button onClick={() => handleCreate("mentor")}>
                    Create Mentor Survey
                  </Button>
                </div>
              )}
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Survey Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Structure</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTemplates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{template.name}</span>
                            {template.isDefault && (
                              <Badge variant="default" className="text-xs">
                                <Star className="w-3 h-3 mr-1" />
                                Default
                              </Badge>
                            )}
                          </div>
                          {template.description && (
                            <p className="text-sm text-muted-foreground">
                              {template.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {template.type === "mentor" ? (
                            <Users className="w-3 h-3 mr-1" />
                          ) : (
                            <Users className="w-3 h-3 mr-1" />
                          )}
                          {template.type === "mentor" ? "Mentor" : "Mentee"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {getStatsBadge(template)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {template.isActive ? (
                            <Badge variant="default" className="text-xs">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              <Clock className="w-3 h-3 mr-1" />
                              Draft
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(template.updatedAt)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setPreviewingTemplate(template)}>
                              <Eye className="w-4 h-4 mr-2" />
                              Preview
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(template)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicate(template)}>
                              <Copy className="w-4 h-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            {!template.isDefault && (
                              <DropdownMenuItem onClick={() => handleSetAsDefault(template)}>
                                <Star className="w-4 h-4 mr-2" />
                                Set as Default
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDelete(template)}
                              disabled={template.isDefault}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-7xl w-[95vw] h-[95vh] flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle>
              {editingTemplate ? `Edit ${editingTemplate.name}` : `Create New ${createType} Survey`}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden px-6">
            <SurveyTemplateEditor
              template={editingTemplate}
              type={createType}
              onSave={handleSave}
              onCancel={() => setShowCreateDialog(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      {previewingTemplate && (
        <Dialog open={!!previewingTemplate} onOpenChange={() => setPreviewingTemplate(null)}>
          <DialogContent className="max-w-4xl w-[90vw] h-[90vh] flex flex-col p-0">
            <DialogHeader className="px-6 py-4 border-b">
              <DialogTitle>Preview: {previewingTemplate.name}</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <SurveyTemplatePreview template={previewingTemplate} />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};