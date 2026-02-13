import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  Settings,
  Upload,
  Shuffle,
  Eye,
  Rocket,
  Activity,
  Flag,
  BarChart,
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  Plus,
  Trash2,
  Link as LinkIcon,
  FileText,
  ExternalLink,
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  MessageSquare,
  Send,
} from 'lucide-react';
import type { CohortStage, StageStatus, StageType, ChecklistItem, DocumentLink } from '@/types/runbook';
import { STAGE_METADATA } from '@/types/runbook';
import {
  getCohortStages,
  initializeCohortStages,
  updateCohortStage,
  startStage,
  completeStage,
  blockStage,
  resetStage,
  toggleChecklistItem,
  addChecklistItem,
  removeChecklistItem,
  addDocument,
  removeDocument,
  getRunbookProgress,
  deleteCohortStage,
  deleteAllCohortStages,
  completeAllStages,
} from '@/lib/runbookService';
import { getAllCohorts, updateCohort } from '@/lib/supabaseService';
import { cn } from '@/lib/utils';
import {
  getMessageTemplates, getMessageLogSummary, sendWelcomeMessages, sendStageMessages,
  TEMPLATE_TYPES,
  type MessageTemplate, type MessageLogSummary,
} from '@/lib/messageService';
import { DEFAULT_SESSION_THRESHOLDS, type SessionThresholds, type JourneyPhase } from '@/types/mentoring';

// Icon mapping for stage types
const stageIcons: Record<StageType, React.ComponentType<{ className?: string }>> = {
  setup: Settings,
  import: Upload,
  matching: Shuffle,
  review: Eye,
  launch: Rocket,
  midpoint: Activity,
  closure: Flag,
  reporting: BarChart,
};

// Status colors and icons
const statusConfig: Record<StageStatus, { color: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending: { color: 'bg-gray-400', icon: Circle },
  in_progress: { color: 'bg-blue-500', icon: Clock },
  completed: { color: 'bg-green-500', icon: CheckCircle2 },
  blocked: { color: 'bg-red-500', icon: AlertTriangle },
};

export default function CohortRunbook() {
  const { cohortId } = useParams<{ cohortId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [cohorts, setCohorts] = useState<Array<{ id: string; name: string; session_thresholds?: SessionThresholds | null }>>([]);
  const [selectedCohort, setSelectedCohort] = useState<string>(cohortId || '');
  const [stages, setStages] = useState<CohortStage[]>([]);
  const [progress, setProgress] = useState({ total: 0, completed: 0, percentComplete: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [expandedStages, setExpandedStages] = useState<string[]>([]);

  // Dialog states
  const [isAddDocDialogOpen, setIsAddDocDialogOpen] = useState(false);
  const [selectedStageForDoc, setSelectedStageForDoc] = useState<string | null>(null);
  const [newDocName, setNewDocName] = useState('');
  const [newDocUrl, setNewDocUrl] = useState('');
  const [newDocType, setNewDocType] = useState<'doc' | 'sheet' | 'pdf' | 'link'>('link');

  const [isAddChecklistDialogOpen, setIsAddChecklistDialogOpen] = useState(false);
  const [selectedStageForChecklist, setSelectedStageForChecklist] = useState<string | null>(null);
  const [newChecklistText, setNewChecklistText] = useState('');

  // Confirmation dialog states
  const [isDeleteStageDialogOpen, setIsDeleteStageDialogOpen] = useState(false);
  const [stageToDelete, setStageToDelete] = useState<string | null>(null);
  const [isDeleteRunbookDialogOpen, setIsDeleteRunbookDialogOpen] = useState(false);
  const [isCompleteAllDialogOpen, setIsCompleteAllDialogOpen] = useState(false);

  // Message template state
  const [stageTemplates, setStageTemplates] = useState<MessageTemplate[]>([]);
  const [stageMsgSummary, setStageMsgSummary] = useState<Record<string, MessageLogSummary>>({});
  const [isSendingMessages, setIsSendingMessages] = useState(false);
  const [isSendConfirmOpen, setIsSendConfirmOpen] = useState(false);
  const [previewBody, setPreviewBody] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Stage message sending state
  const [isSendingStageMessages, setIsSendingStageMessages] = useState(false);
  const [isSendStageConfirmOpen, setIsSendStageConfirmOpen] = useState(false);
  const [sendStagePhase, setSendStagePhase] = useState<string>('');
  const [sendStageLabel, setSendStageLabel] = useState<string>('');

  // Session threshold editing state
  const [editingThresholds, setEditingThresholds] = useState<SessionThresholds | null>(null);
  const [isSavingThresholds, setIsSavingThresholds] = useState(false);

  // Stage type → template type mapping
  const STAGE_TEMPLATE_MAP: Record<string, { types: string[]; phase?: string }> = {
    launch: { types: ['welcome_mentee', 'welcome_mentor', 'channel_announcement'] },
    midpoint: { types: ['next_steps', 'next_steps_mentee', 'next_steps_mentor'], phase: 'midpoint' },
    closure: { types: ['next_steps', 'next_steps_mentee', 'next_steps_mentor'], phase: 'wrapping_up' },
  };

  useEffect(() => {
    loadCohorts();
  }, []);

  useEffect(() => {
    if (selectedCohort) {
      loadStages();
    }
  }, [selectedCohort]);

  const loadCohorts = async () => {
    try {
      const data = await getAllCohorts();
      setCohorts(data.map(c => ({ id: c.id, name: c.name, session_thresholds: c.session_thresholds })));
      if (!selectedCohort && data.length > 0) {
        setSelectedCohort(data[0].id);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load cohorts',
        variant: 'destructive',
      });
    }
  };

  const loadStages = async () => {
    if (!selectedCohort) return;

    setIsLoading(true);
    try {
      const [stagesData, progressData, templatesData] = await Promise.all([
        getCohortStages(selectedCohort),
        getRunbookProgress(selectedCohort),
        getMessageTemplates(selectedCohort),
      ]);
      setStages(stagesData);
      setProgress(progressData);
      setStageTemplates(templatesData);

      // Load message log summaries for stages that have templates
      const summaryPromises: Record<string, Promise<MessageLogSummary>> = {};
      for (const [stageType, config] of Object.entries(STAGE_TEMPLATE_MAP)) {
        summaryPromises[stageType] = getMessageLogSummary(selectedCohort, config.types);
      }
      const summaryKeys = Object.keys(summaryPromises);
      const summaryResults = await Promise.all(Object.values(summaryPromises));
      const summaryMap: Record<string, MessageLogSummary> = {};
      summaryKeys.forEach((key, i) => { summaryMap[key] = summaryResults[i]; });
      setStageMsgSummary(summaryMap);

      // Start with all stages collapsed
      setExpandedStages([]);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load runbook stages',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInitializeRunbook = async () => {
    if (!selectedCohort) return;

    try {
      await initializeCohortStages(selectedCohort);
      toast({
        title: 'Success',
        description: 'Runbook initialized with default stages',
      });
      loadStages();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to initialize runbook',
        variant: 'destructive',
      });
    }
  };

  const handleStartStage = async (stageId: string) => {
    try {
      await startStage(stageId);
      toast({ title: 'Stage started' });
      loadStages();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to start stage',
        variant: 'destructive',
      });
    }
  };

  const handleCompleteStage = async (stageId: string) => {
    try {
      await completeStage(stageId);
      toast({ title: 'Stage completed' });
      loadStages();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to complete stage',
        variant: 'destructive',
      });
    }
  };

  const handleBlockStage = async (stageId: string) => {
    try {
      await blockStage(stageId);
      toast({ title: 'Stage marked as blocked' });
      loadStages();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to block stage',
        variant: 'destructive',
      });
    }
  };

  const handleResetStage = async (stageId: string) => {
    try {
      await resetStage(stageId);
      toast({ title: 'Stage reset to pending' });
      loadStages();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reset stage',
        variant: 'destructive',
      });
    }
  };

  const handleToggleChecklistItem = async (stageId: string, itemId: string) => {
    try {
      await toggleChecklistItem(stageId, itemId);
      loadStages();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update checklist',
        variant: 'destructive',
      });
    }
  };

  const handleAddChecklistItem = async () => {
    if (!selectedStageForChecklist || !newChecklistText.trim()) return;

    try {
      await addChecklistItem(selectedStageForChecklist, newChecklistText.trim());
      toast({ title: 'Checklist item added' });
      setIsAddChecklistDialogOpen(false);
      setNewChecklistText('');
      setSelectedStageForChecklist(null);
      loadStages();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add checklist item',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveChecklistItem = async (stageId: string, itemId: string) => {
    try {
      await removeChecklistItem(stageId, itemId);
      loadStages();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove checklist item',
        variant: 'destructive',
      });
    }
  };

  const handleAddDocument = async () => {
    if (!selectedStageForDoc || !newDocName.trim() || !newDocUrl.trim()) return;

    try {
      await addDocument(selectedStageForDoc, {
        name: newDocName.trim(),
        url: newDocUrl.trim(),
        type: newDocType,
      });
      toast({ title: 'Document added' });
      setIsAddDocDialogOpen(false);
      setNewDocName('');
      setNewDocUrl('');
      setSelectedStageForDoc(null);
      loadStages();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add document',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveDocument = async (stageId: string, docId: string) => {
    try {
      await removeDocument(stageId, docId);
      loadStages();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove document',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateNotes = async (stageId: string, notes: string) => {
    try {
      await updateCohortStage(stageId, { notes });
    } catch (error) {
      console.error('Failed to update notes:', error);
    }
  };

  const handleUpdateOwner = async (stageId: string, owner: string) => {
    try {
      await updateCohortStage(stageId, { owner });
      loadStages();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update owner',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateDueDate = async (stageId: string, dueDate: string) => {
    try {
      await updateCohortStage(stageId, { due_date: dueDate || undefined });
      loadStages();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update due date',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteStage = async () => {
    if (!stageToDelete) return;

    try {
      await deleteCohortStage(stageToDelete);
      toast({ title: 'Stage deleted' });
      setIsDeleteStageDialogOpen(false);
      setStageToDelete(null);
      loadStages();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete stage',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteRunbook = async () => {
    if (!selectedCohort) return;

    try {
      await deleteAllCohortStages(selectedCohort);
      toast({ title: 'Runbook deleted' });
      setIsDeleteRunbookDialogOpen(false);
      loadStages();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete runbook',
        variant: 'destructive',
      });
    }
  };

  const handleCompleteAll = async () => {
    if (!selectedCohort) return;

    try {
      await completeAllStages(selectedCohort);
      toast({ title: 'All stages marked as complete' });
      setIsCompleteAllDialogOpen(false);
      loadStages();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to complete all stages',
        variant: 'destructive',
      });
    }
  };

  // Get templates relevant to a specific runbook stage
  function getTemplatesForStage(stageType: StageType): MessageTemplate[] {
    const config = STAGE_TEMPLATE_MAP[stageType];
    if (!config) return [];

    return stageTemplates.filter(t => {
      if (!config.types.includes(t.template_type)) return false;
      if (config.phase && t.template_type === 'next_steps' && t.journey_phase !== config.phase) return false;
      return true;
    });
  }

  function getTypeLabel(value: string): string {
    return TEMPLATE_TYPES.find(t => t.value === value)?.label || value;
  }

  // Sample preview renderer
  const SAMPLE_CONTEXT: Record<string, string> = {
    FIRST_NAME: 'Alice', FULL_NAME: 'Alice Johnson', COHORT_NAME: cohorts.find(c => c.id === selectedCohort)?.name || 'Cohort',
    MENTOR_FIRST_NAME: 'Bob', MENTEE_FIRST_NAME: 'Alice', PRIMARY_CAPABILITY: 'Strategic Thinking',
    SHARED_CAPABILITY: 'Strategic Thinking', MENTOR_EMAIL: 'bob@mews.com', MENTEE_EMAIL: 'alice@mews.com',
  };

  function renderPreview(template: string): string {
    return template.replace(/\{(\w+)\}/g, (match, key) => SAMPLE_CONTEXT[key] || match);
  }

  const handleSendWelcomeMessages = async () => {
    if (!selectedCohort) return;
    setIsSendConfirmOpen(false);
    setIsSendingMessages(true);
    try {
      const result = await sendWelcomeMessages(selectedCohort);
      toast({
        title: 'Welcome messages sent',
        description: `${result.sent} sent, ${result.failed} failed out of ${result.pairs} pairs`,
      });
      // Auto-check "Send match notifications" checklist item in the launch stage
      const launchStage = stages.find(s => s.stage_type === 'launch');
      if (launchStage) {
        const sendItem = launchStage.checklist.find(
          i => i.text.toLowerCase().includes('send match notification') && !i.completed
        );
        if (sendItem) {
          await toggleChecklistItem(launchStage.id, sendItem.id);
        }
      }
      loadStages();
    } catch (err: any) {
      toast({
        title: 'Failed to send messages',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsSendingMessages(false);
    }
  };

  const handleSendStageMessages = async () => {
    if (!selectedCohort || !sendStagePhase) return;
    setIsSendStageConfirmOpen(false);
    setIsSendingStageMessages(true);
    try {
      const result = await sendStageMessages(selectedCohort, sendStagePhase);
      toast({
        title: 'Stage messages sent',
        description: `${result.sent} sent, ${result.skipped} skipped (already received), ${result.failed} failed`,
      });
      loadStages();
    } catch (err: any) {
      toast({
        title: 'Failed to send stage messages',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsSendingStageMessages(false);
    }
  };

  const handleSaveThresholds = async () => {
    if (!selectedCohort || !editingThresholds) return;
    setIsSavingThresholds(true);
    try {
      await updateCohort(selectedCohort, { session_thresholds: editingThresholds });
      setCohorts(prev => prev.map(c =>
        c.id === selectedCohort ? { ...c, session_thresholds: editingThresholds } : c
      ));
      toast({ title: 'Session thresholds saved' });
    } catch (err: any) {
      toast({
        title: 'Failed to save thresholds',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsSavingThresholds(false);
    }
  };

  const getStatusBadge = (status: StageStatus) => {
    const config = statusConfig[status];
    const Icon = config.icon;
    return (
      <Badge className={cn(config.color, 'text-white')}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
      </Badge>
    );
  };

  if (isLoading && cohorts.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Cohort Runbook</h1>
          <p className="text-muted-foreground">
            Track program stages and manage checklists
          </p>
        </div>
      </div>

      {/* Cohort Selector and Progress */}
      <div className="flex gap-4 items-start">
        <div className="w-64">
          <Label>Select Cohort</Label>
          <Select value={selectedCohort} onValueChange={setSelectedCohort}>
            <SelectTrigger>
              <SelectValue placeholder="Select cohort" />
            </SelectTrigger>
            <SelectContent>
              {cohorts.map(cohort => (
                <SelectItem key={cohort.id} value={cohort.id}>
                  {cohort.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {stages.length > 0 && (
          <Card className="flex-1">
            <CardContent className="pt-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Overall Progress</span>
                    <span className="text-sm text-muted-foreground">
                      {progress.completed} of {progress.total} stages
                    </span>
                  </div>
                  <Progress value={progress.percentComplete} className="h-2" />
                </div>
                <div className="text-2xl font-bold">{progress.percentComplete}%</div>
                <div className="flex gap-2 ml-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsCompleteAllDialogOpen(true)}
                    disabled={progress.completed === progress.total}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Mark All Complete
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setIsDeleteRunbookDialogOpen(true)}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete Runbook
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Runbook Content */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : stages.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Flag className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">No Runbook Stages</h3>
            <p className="text-muted-foreground mb-4">
              Initialize the runbook with default stages to get started
            </p>
            <Button onClick={handleInitializeRunbook}>
              <Plus className="w-4 h-4 mr-2" />
              Initialize Runbook
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Timeline visualization */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Stage Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                {(() => {
                  // Find the "current" stage: first in_progress, or first pending if none in_progress
                  const currentStageId =
                    stages.find(s => s.status === 'in_progress')?.id
                    || stages.find(s => s.status === 'pending')?.id;
                  return stages.map((stage, index) => {
                  const Icon = stageIcons[stage.stage_type];
                  const statusCfg = statusConfig[stage.status];
                  const isCurrent = stage.id === currentStageId;
                  return (
                    <div key={stage.id} className="flex items-center">
                      <button
                        className="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => {
                          setExpandedStages(prev =>
                            prev.includes(stage.id) ? prev : [...prev, stage.id]
                          );
                          setTimeout(() => {
                            document.getElementById(`stage-${stage.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }, 100);
                        }}
                      >
                        <div className={cn('rounded-full p-0.5', isCurrent ? 'ring-2 ring-offset-2 ring-blue-500 animate-pulse' : '')}>
                          <div
                            className={cn(
                              'w-10 h-10 rounded-full flex items-center justify-center',
                              statusCfg.color,
                              'text-white'
                            )}
                          >
                            <Icon className="w-5 h-5" />
                          </div>
                        </div>
                        <span className={cn('text-xs mt-1 text-center max-w-[80px] truncate', isCurrent && 'font-semibold')}>
                          {stage.stage_name.split(' ')[0]}
                        </span>
                      </button>
                      {index < stages.length - 1 && (
                        <div
                          className={cn(
                            'h-1 w-12 mx-1',
                            stage.status === 'completed' ? 'bg-green-500' : 'bg-gray-200'
                          )}
                        />
                      )}
                    </div>
                  );
                });
                })()}
              </div>
            </CardContent>
          </Card>

          {/* Stage Cards */}
          <Accordion
            type="multiple"
            value={expandedStages}
            onValueChange={setExpandedStages}
            className="space-y-2"
          >
            {stages.map(stage => {
              const Icon = stageIcons[stage.stage_type];
              const metadata = STAGE_METADATA[stage.stage_type];
              const completedItems = stage.checklist.filter(i => i.completed).length;
              const totalItems = stage.checklist.length;

              return (
                <AccordionItem
                  key={stage.id}
                  value={stage.id}
                  id={`stage-${stage.id}`}
                  className="border rounded-lg px-4"
                >
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-4 flex-1">
                      <div className={cn('w-8 h-8 rounded-full flex items-center justify-center', metadata.color, 'text-white')}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{stage.stage_name}</span>
                          {getStatusBadge(stage.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">{metadata.description}</p>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        {totalItems > 0 && (
                          <span>{completedItems}/{totalItems} tasks</span>
                        )}
                        {stage.due_date && (
                          <div className={cn(
                            stage.due_date < new Date().toISOString().split('T')[0] && stage.status !== 'completed'
                              ? 'text-red-500'
                              : ''
                          )}>
                            Due: {new Date(stage.due_date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-4">
                      {/* Status Actions */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Actions:</span>
                        {stage.status === 'pending' && (
                          <Button size="sm" onClick={() => handleStartStage(stage.id)}>
                            <Play className="w-3 h-3 mr-1" /> Start
                          </Button>
                        )}
                        {stage.status === 'in_progress' && (
                          <>
                            <Button size="sm" onClick={() => handleCompleteStage(stage.id)}>
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Complete
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleBlockStage(stage.id)}>
                              <Pause className="w-3 h-3 mr-1" /> Block
                            </Button>
                          </>
                        )}
                        {(stage.status === 'completed' || stage.status === 'blocked') && (
                          <Button size="sm" variant="outline" onClick={() => handleResetStage(stage.id)}>
                            <RotateCcw className="w-3 h-3 mr-1" /> Reset
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive ml-auto"
                          onClick={() => {
                            setStageToDelete(stage.id);
                            setIsDeleteStageDialogOpen(true);
                          }}
                        >
                          <Trash2 className="w-3 h-3 mr-1" /> Delete Stage
                        </Button>
                      </div>

                      {/* Owner and Due Date */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs">Owner</Label>
                          <Input
                            placeholder="Assign owner..."
                            value={stage.owner || ''}
                            onChange={(e) => handleUpdateOwner(stage.id, e.target.value)}
                            className="h-8"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Due Date</Label>
                          <Input
                            type="date"
                            value={stage.due_date || ''}
                            onChange={(e) => handleUpdateDueDate(stage.id, e.target.value)}
                            className="h-8"
                          />
                        </div>
                      </div>

                      {/* Checklist */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <Label className="text-xs">Checklist</Label>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedStageForChecklist(stage.id);
                              setIsAddChecklistDialogOpen(true);
                            }}
                          >
                            <Plus className="w-3 h-3 mr-1" /> Add Item
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {stage.checklist.map(item => (
                            <div key={item.id} className="flex items-center gap-2 group">
                              <Checkbox
                                checked={item.completed}
                                onCheckedChange={() => handleToggleChecklistItem(stage.id, item.id)}
                              />
                              <span className={cn('flex-1 text-sm', item.completed && 'line-through text-muted-foreground')}>
                                {item.text}
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                                onClick={() => handleRemoveChecklistItem(stage.id, item.id)}
                              >
                                <Trash2 className="w-3 h-3 text-destructive" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Documents */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <Label className="text-xs">Documents</Label>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedStageForDoc(stage.id);
                              setIsAddDocDialogOpen(true);
                            }}
                          >
                            <Plus className="w-3 h-3 mr-1" /> Add Link
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {stage.documents.map(doc => (
                            <div
                              key={doc.id}
                              className="flex items-center gap-1 bg-muted px-2 py-1 rounded text-sm group"
                            >
                              <FileText className="w-3 h-3" />
                              <a
                                href={doc.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline"
                              >
                                {doc.name}
                              </a>
                              <ExternalLink className="w-3 h-3 text-muted-foreground" />
                              <Button
                                size="sm"
                                variant="ghost"
                                className="opacity-0 group-hover:opacity-100 h-5 w-5 p-0 ml-1"
                                onClick={() => handleRemoveDocument(stage.id, doc.id)}
                              >
                                <Trash2 className="w-3 h-3 text-destructive" />
                              </Button>
                            </div>
                          ))}
                          {stage.documents.length === 0 && (
                            <span className="text-sm text-muted-foreground">No documents linked</span>
                          )}
                        </div>
                      </div>

                      {/* Notes */}
                      <div>
                        <Label className="text-xs">Notes</Label>
                        <Textarea
                          placeholder="Add notes..."
                          value={stage.notes || ''}
                          onChange={(e) => handleUpdateNotes(stage.id, e.target.value)}
                          onBlur={(e) => handleUpdateNotes(stage.id, e.target.value)}
                          rows={2}
                        />
                      </div>

                      {/* Messages section — only for launch, midpoint, closure */}
                      {STAGE_TEMPLATE_MAP[stage.stage_type] && (() => {
                        const config = STAGE_TEMPLATE_MAP[stage.stage_type];
                        const relevantTemplates = getTemplatesForStage(stage.stage_type);
                        const summary = stageMsgSummary[stage.stage_type];
                        const isLaunch = stage.stage_type === 'launch';
                        const isStageWithPhase = !!config.phase;

                        return (
                          <div className="border-t pt-4">
                            <div className="flex items-center gap-2 mb-3">
                              <MessageSquare className="w-4 h-4 text-muted-foreground" />
                              <Label className="text-xs">Messages</Label>
                            </div>

                            {isStageWithPhase && (
                              <p className="text-xs text-muted-foreground mb-3">
                                Next-steps messages are auto-sent when a participant logs a session in this phase.
                                Use the button below to send to remaining participants who haven't received it yet.
                              </p>
                            )}

                            {relevantTemplates.length === 0 ? (
                              <p className="text-sm text-muted-foreground">
                                No templates configured.{' '}
                                <button
                                  className="text-primary underline"
                                  onClick={() => navigate('/admin/settings?tab=messages')}
                                >
                                  Create one
                                </button>
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {relevantTemplates.map(tpl => (
                                  <div
                                    key={tpl.id}
                                    className="flex items-start gap-3 p-2 bg-muted/50 rounded-md"
                                  >
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium">{getTypeLabel(tpl.template_type)}</span>
                                        {!tpl.is_active && (
                                          <Badge variant="outline" className="text-[10px] h-4">Inactive</Badge>
                                        )}
                                      </div>
                                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                                        {tpl.body.substring(0, 100)}{tpl.body.length > 100 ? '...' : ''}
                                      </p>
                                    </div>
                                    <div className="flex gap-1 shrink-0">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 text-xs"
                                        onClick={() => { setPreviewBody(tpl.body); setIsPreviewOpen(true); }}
                                      >
                                        <Eye className="w-3 h-3 mr-1" />Preview
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 text-xs"
                                        onClick={() => navigate('/admin/settings?tab=messages')}
                                      >
                                        Edit
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Send button for launch stage */}
                            {isLaunch && relevantTemplates.length > 0 && (
                              <Button
                                size="sm"
                                className="mt-3"
                                onClick={() => setIsSendConfirmOpen(true)}
                                disabled={isSendingMessages}
                              >
                                {isSendingMessages ? (
                                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                ) : (
                                  <Send className="w-3 h-3 mr-1" />
                                )}
                                Send Welcome Messages
                              </Button>
                            )}

                            {/* Send button for midpoint/closure stages */}
                            {isStageWithPhase && relevantTemplates.length > 0 && (
                              <Button
                                size="sm"
                                className="mt-3"
                                onClick={() => {
                                  setSendStagePhase(config.phase!);
                                  setSendStageLabel(
                                    stage.stage_type === 'midpoint' ? 'Midpoint' : 'Wrapping Up'
                                  );
                                  setIsSendStageConfirmOpen(true);
                                }}
                                disabled={isSendingStageMessages}
                              >
                                {isSendingStageMessages ? (
                                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                ) : (
                                  <Send className="w-3 h-3 mr-1" />
                                )}
                                Send {stage.stage_type === 'midpoint' ? 'Midpoint' : 'Wrapping Up'} Messages
                              </Button>
                            )}

                            {/* Delivery summary */}
                            {summary && summary.total > 0 && (
                              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                <span>
                                  {summary.sent} sent{summary.failed > 0 ? `, ${summary.failed} failed` : ''}
                                </span>
                                {summary.lastSentAt && (
                                  <span>
                                    &middot; Last: {new Date(summary.lastSentAt).toLocaleDateString()}
                                  </span>
                                )}
                                <button
                                  className="text-primary underline ml-1"
                                  onClick={() => navigate(`/admin/settings?tab=messages&subtab=log&logCohort=${selectedCohort}`)}
                                >
                                  View full log
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Session Threshold Config — only for setup stage */}
                      {stage.stage_type === 'setup' && (() => {
                        const currentCohort = cohorts.find(c => c.id === selectedCohort);
                        const thresholds = editingThresholds
                          || currentCohort?.session_thresholds
                          || DEFAULT_SESSION_THRESHOLDS;
                        const phases: { key: JourneyPhase; label: string }[] = [
                          { key: 'getting_started', label: 'Getting Started' },
                          { key: 'building', label: 'Building' },
                          { key: 'midpoint', label: 'Midpoint' },
                          { key: 'wrapping_up', label: 'Wrapping Up' },
                        ];

                        return (
                          <div className="border-t pt-4">
                            <div className="flex items-center gap-2 mb-3">
                              <Settings className="w-4 h-4 text-muted-foreground" />
                              <Label className="text-xs">Journey Phase Thresholds</Label>
                            </div>
                            <p className="text-xs text-muted-foreground mb-3">
                              Configure how many completed sessions map to each journey phase. Used to auto-detect phase and send relevant messages.
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                              {phases.map(phase => {
                                const range = thresholds[phase.key] || { min: 0, max: null };
                                return (
                                  <div key={phase.key} className="flex items-center gap-2">
                                    <span className="text-xs w-28 truncate">{phase.label}</span>
                                    <Input
                                      type="number"
                                      min={1}
                                      className="h-7 w-16 text-xs"
                                      value={range.min}
                                      onChange={(e) => {
                                        const updated = { ...thresholds, [phase.key]: { ...range, min: Number(e.target.value) } };
                                        setEditingThresholds(updated);
                                      }}
                                    />
                                    <span className="text-xs text-muted-foreground">to</span>
                                    <Input
                                      type="number"
                                      min={1}
                                      className="h-7 w-16 text-xs"
                                      placeholder="∞"
                                      value={range.max ?? ''}
                                      onChange={(e) => {
                                        const val = e.target.value ? Number(e.target.value) : null;
                                        const updated = { ...thresholds, [phase.key]: { ...range, max: val } };
                                        setEditingThresholds(updated);
                                      }}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                            {editingThresholds && (
                              <Button
                                size="sm"
                                className="mt-3"
                                onClick={handleSaveThresholds}
                                disabled={isSavingThresholds}
                              >
                                {isSavingThresholds ? (
                                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                )}
                                Save Thresholds
                              </Button>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>
      )}

      {/* Add Checklist Item Dialog */}
      <Dialog open={isAddChecklistDialogOpen} onOpenChange={setIsAddChecklistDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Checklist Item</DialogTitle>
            <DialogDescription>Add a new task to the checklist</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Task Description</Label>
              <Input
                value={newChecklistText}
                onChange={(e) => setNewChecklistText(e.target.value)}
                placeholder="Enter task description..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddChecklistDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddChecklistItem}>Add Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Document Dialog */}
      <Dialog open={isAddDocDialogOpen} onOpenChange={setIsAddDocDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Document Link</DialogTitle>
            <DialogDescription>Link a document or resource to this stage</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Document Name</Label>
              <Input
                value={newDocName}
                onChange={(e) => setNewDocName(e.target.value)}
                placeholder="e.g., Program Guidelines"
              />
            </div>
            <div className="space-y-2">
              <Label>URL</Label>
              <Input
                value={newDocUrl}
                onChange={(e) => setNewDocUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={newDocType} onValueChange={(v) => setNewDocType(v as typeof newDocType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="doc">Document</SelectItem>
                  <SelectItem value="sheet">Spreadsheet</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="link">External Link</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDocDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddDocument}>Add Document</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Stage Confirmation Dialog */}
      <Dialog open={isDeleteStageDialogOpen} onOpenChange={setIsDeleteStageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Stage</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this stage? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteStageDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteStage}>
              Delete Stage
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Runbook Confirmation Dialog */}
      <Dialog open={isDeleteRunbookDialogOpen} onOpenChange={setIsDeleteRunbookDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Entire Runbook</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete all stages for this cohort? This will remove all
              progress, checklists, and documents. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteRunbookDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteRunbook}>
              Delete Runbook
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete All Stages Confirmation Dialog */}
      <Dialog open={isCompleteAllDialogOpen} onOpenChange={setIsCompleteAllDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark All Stages Complete</DialogTitle>
            <DialogDescription>
              This will mark all stages as completed. You can reset individual stages later if needed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCompleteAllDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCompleteAll}>
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Complete All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Welcome Messages Confirmation Dialog */}
      <Dialog open={isSendConfirmOpen} onOpenChange={setIsSendConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Welcome Messages</DialogTitle>
            <DialogDescription>
              This will send welcome DMs to all matched mentee-mentor pairs and post a channel
              announcement via Slack. Make sure your Zapier webhook is configured.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSendConfirmOpen(false)}>Cancel</Button>
            <Button onClick={handleSendWelcomeMessages}>
              <Send className="w-4 h-4 mr-1" />
              Send Messages
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Stage Messages Confirmation Dialog */}
      <Dialog open={isSendStageConfirmOpen} onOpenChange={setIsSendStageConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send {sendStageLabel} Messages</DialogTitle>
            <DialogDescription>
              This will send next-steps messages to all participants in matched pairs who
              haven't already received a message for this phase. Participants who were auto-sent
              a message when they logged a session will be skipped.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSendStageConfirmOpen(false)}>Cancel</Button>
            <Button onClick={handleSendStageMessages}>
              <Send className="w-4 h-4 mr-1" />
              Send Messages
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Message Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Message Preview</DialogTitle>
            <DialogDescription>
              Rendered with sample data. Unresolved placeholders stay as-is.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted p-4 rounded-md whitespace-pre-wrap text-sm max-h-[50vh] overflow-y-auto">
            {renderPreview(previewBody)}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
