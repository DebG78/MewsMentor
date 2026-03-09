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
import { PageHeader } from "@/components/admin/PageHeader";
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
  Bell,
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  Plus,
  Trash2,
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  MessageSquare,
  Send,
  X,
  Edit,
} from 'lucide-react';
import type { CohortStage, StageStatus, StageType, ChecklistItem } from '@/types/runbook';
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
  getRunbookProgress,
  deleteCohortStage,
  deleteAllCohortStages,
  completeAllStages,
} from '@/lib/runbookService';
import { getAllCohorts, updateCohort } from '@/lib/supabaseService';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import {
  getMessageTemplates, getMessageLogSummary, sendWelcomeMessages, sendStageMessages,
  sendBulkMessages, getMatchedPairsWithPhase, buildParticipantContext,
  seedDefaultTemplatesForStage, STAGE_DEFAULT_TEMPLATE_TYPES,
  TEMPLATE_TYPES,
  type MessageTemplate, type MessageLogSummary,
} from '@/lib/messageService';

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

  const [cohorts, setCohorts] = useState<Array<{ id: string; name: string; start_date?: string; session_reminders_enabled?: boolean }>>([]);
  const [selectedCohort, setSelectedCohort] = useState<string>(cohortId || '');
  const [stages, setStages] = useState<CohortStage[]>([]);
  const [progress, setProgress] = useState({ total: 0, completed: 0, percentComplete: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [expandedStages, setExpandedStages] = useState<string[]>([]);

  // Dialog states
  const [isAddChecklistDialogOpen, setIsAddChecklistDialogOpen] = useState(false);
  const [selectedStageForChecklist, setSelectedStageForChecklist] = useState<string | null>(null);
  const [newChecklistText, setNewChecklistText] = useState('');

  // Confirmation dialog states
  const [isDeleteStageDialogOpen, setIsDeleteStageDialogOpen] = useState(false);
  const [stageToDelete, setStageToDelete] = useState<string | null>(null);
  const [isDeleteRunbookDialogOpen, setIsDeleteRunbookDialogOpen] = useState(false);
  const [isCompleteAllDialogOpen, setIsCompleteAllDialogOpen] = useState(false);

  // Message template state
  const [allTemplates, setAllTemplates] = useState<MessageTemplate[]>([]);
  const [stageMsgSummary, setStageMsgSummary] = useState<Record<string, MessageLogSummary>>({});
  const [isSendingMessages, setIsSendingMessages] = useState(false);
  const [isSendConfirmOpen, setIsSendConfirmOpen] = useState(false);
  const [previewBody, setPreviewBody] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Session reminder toggle state
  const [isTogglingReminders, setIsTogglingReminders] = useState(false);

  // Stage message sending state
  const [isSendingStageMessages, setIsSendingStageMessages] = useState(false);
  const [isSendStageConfirmOpen, setIsSendStageConfirmOpen] = useState(false);
  const [sendStagePhase, setSendStagePhase] = useState<string>('');
  const [sendStageLabel, setSendStageLabel] = useState<string>('');

  // Flexible template assignment per stage (local state — not persisted)
  const [stageAssignedTemplates, setStageAssignedTemplates] = useState<Record<string, MessageTemplate[]>>({});
  // One-time message body overrides per template ID
  const [stageMessageOverrides, setStageMessageOverrides] = useState<Record<string, string>>({});
  // Currently editing template inline
  const [editingInlineTemplate, setEditingInlineTemplate] = useState<string | null>(null);
  // Template picker dialog
  const [addTemplateForStage, setAddTemplateForStage] = useState<string | null>(null);
  // Seeding default templates
  const [seedingStage, setSeedingStage] = useState<string | null>(null);
  // Selected template IDs per stage for selective sending
  const [selectedTemplatesForSend, setSelectedTemplatesForSend] = useState<Record<string, Set<string>>>({});

  const toggleTemplateSelection = (stageId: string, templateId: string) => {
    setSelectedTemplatesForSend(prev => {
      const current = new Set(prev[stageId] || []);
      if (current.has(templateId)) {
        current.delete(templateId);
      } else {
        current.add(templateId);
      }
      return { ...prev, [stageId]: current };
    });
  };

  const toggleAllTemplatesForStage = (stageId: string, templates: MessageTemplate[]) => {
    setSelectedTemplatesForSend(prev => {
      const current = prev[stageId] || new Set<string>();
      const allSelected = templates.every(t => current.has(t.id));
      return {
        ...prev,
        [stageId]: allSelected ? new Set<string>() : new Set(templates.map(t => t.id)),
      };
    });
  };

  const getSelectedCount = (stageId: string) => (selectedTemplatesForSend[stageId] || new Set()).size;

  // Default template types for auto-populating each stage
  // Use shared stage-to-template-type mapping from messageService
  const STAGE_DEFAULT_TYPES = STAGE_DEFAULT_TEMPLATE_TYPES;

  useEffect(() => {
    loadCohorts();
  }, []);

  useEffect(() => {
    if (selectedCohort) {
      setExpandedStages([]);
      loadStages();
    }
  }, [selectedCohort]);

  const loadCohorts = async () => {
    try {
      const data = await getAllCohorts();
      setCohorts(data.map(c => ({ id: c.id, name: c.name, start_date: c.start_date, session_reminders_enabled: c.session_reminders_enabled })));
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
      setAllTemplates(templatesData);

      // Populate stage template assignments — only show explicitly tagged templates
      const assignments: Record<string, MessageTemplate[]> = {};
      for (const stage of stagesData) {
        // Only show templates that have been explicitly tagged with this stage_type
        const taggedTemplates = templatesData.filter(t => t.stage_type === stage.stage_type);
        if (taggedTemplates.length > 0) {
          assignments[stage.id] = taggedTemplates;
        }
      }
      setStageAssignedTemplates(assignments);
      // Auto-select all assigned templates for each stage
      const newSelections: Record<string, Set<string>> = {};
      for (const [stageId, templates] of Object.entries(assignments)) {
        newSelections[stageId] = new Set(templates.map(t => t.id));
      }
      setSelectedTemplatesForSend(newSelections);
      setStageMessageOverrides({});
      setEditingInlineTemplate(null);

      // Load message log summaries for stages that have templates
      const summaryPromises: Record<string, Promise<MessageLogSummary>> = {};
      for (const [stageType, config] of Object.entries(STAGE_DEFAULT_TYPES)) {
        summaryPromises[stageType] = getMessageLogSummary(selectedCohort, config.types);
      }
      const summaryKeys = Object.keys(summaryPromises);
      const summaryResults = await Promise.all(Object.values(summaryPromises));
      const summaryMap: Record<string, MessageLogSummary> = {};
      summaryKeys.forEach((key, i) => { summaryMap[key] = summaryResults[i]; });
      setStageMsgSummary(summaryMap);

      // Don't reset expandedStages here — handled by cohort change effect
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

  const handleUpdateNotes = async (stageId: string, notes: string) => {
    try {
      await updateCohortStage(stageId, { notes });
    } catch (error) {
      console.error('Failed to update notes:', error);
    }
  };

  const handleUpdateOwner = async (stageId: string, owner: string) => {
    // Update local state immediately for responsive typing
    setStages(prev => prev.map(s => s.id === stageId ? { ...s, owner } : s));
    try {
      await updateCohortStage(stageId, { owner });
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

  function getTypeLabel(value: string): string {
    const builtIn = TEMPLATE_TYPES.find(t => t.value === value && t.value !== '_custom');
    if (builtIn) return builtIn.label;
    return value.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  function getEffectiveBody(templateId: string): string {
    return stageMessageOverrides[templateId] ?? allTemplates.find(t => t.id === templateId)?.body ?? '';
  }

  function handleAssignTemplate(stageId: string, template: MessageTemplate) {
    setStageAssignedTemplates(prev => {
      const current = prev[stageId] || [];
      if (current.some(t => t.id === template.id)) return prev;
      return { ...prev, [stageId]: [...current, template] };
    });
    setAddTemplateForStage(null);
  }

  function handleUnassignTemplate(stageId: string, templateId: string) {
    setStageAssignedTemplates(prev => ({
      ...prev,
      [stageId]: (prev[stageId] || []).filter(t => t.id !== templateId),
    }));
    // Clean up any override
    setStageMessageOverrides(prev => {
      const next = { ...prev };
      delete next[templateId];
      return next;
    });
  }

  function hasAnyOverrides(stageId: string): boolean {
    const templates = stageAssignedTemplates[stageId] || [];
    return templates.some(t => stageMessageOverrides[t.id] !== undefined);
  }

  // Sample preview renderer
  const SAMPLE_CONTEXT: Record<string, string> = {
    FIRST_NAME: 'Alice', FULL_NAME: 'Alice Johnson', COHORT_NAME: cohorts.find(c => c.id === selectedCohort)?.name || 'Cohort',
    MENTOR_FIRST_NAME: 'Bob', MENTEE_FIRST_NAME: 'Alice', PRIMARY_CAPABILITY: 'Strategic Thinking',
    SHARED_CAPABILITY: 'Strategic Thinking',
  };

  function renderPreview(template: string): string {
    return template.replace(/\{(\w+)\}/g, (match, key) => SAMPLE_CONTEXT[key] || match);
  }

  const handleSendWelcomeMessages = async () => {
    if (!selectedCohort) return;
    setIsSendConfirmOpen(false);
    setIsSendingMessages(true);
    try {
      const launchStage = stages.find(s => s.stage_type === 'launch');
      const hasOverrides = launchStage && hasAnyOverrides(launchStage.id);

      // Filter to only selected templates
      const selectedIds = launchStage ? (selectedTemplatesForSend[launchStage.id] || new Set<string>()) : new Set<string>();

      if (hasOverrides && launchStage) {
        // Use bulk send with overridden bodies — only send to approved match pairs
        const matchedPairs = await getMatchedPairsWithPhase(selectedCohort);
        const cohortName = cohorts.find(c => c.id === selectedCohort)?.name || '';
        const assigned = (stageAssignedTemplates[launchStage.id] || []).filter(t => selectedIds.has(t.id));
        let totalSent = 0, totalFailed = 0;

        console.log('[sendWelcome] bulk path: matchedPairs=', matchedPairs.length, 'templates=', assigned.length);

        if (assigned.length === 0) {
          toast({ title: 'No templates assigned', description: 'Assign welcome templates to the launch stage first.', variant: 'destructive' });
          return;
        }
        if (matchedPairs.length === 0) {
          toast({ title: 'No matched pairs found', description: 'Run matching first and approve matches before sending.', variant: 'destructive' });
          return;
        }

        for (const tpl of assigned) {
          const body = getEffectiveBody(tpl.id);
          if (!body) continue;

          const isMenteeTemplate = tpl.template_type.toLowerCase().includes('mentee');
          const isMentorTemplate = tpl.template_type.toLowerCase().includes('mentor') && !isMenteeTemplate;

          const recipients: Array<{ slack_user_id: string; context: Record<string, string> }> = [];
          for (const pair of matchedPairs) {
            const pairContext = {
              MENTEE_FIRST_NAME: pair.mentee.first_name,
              MENTEE_FULL_NAME: pair.mentee.full_name,
              MENTOR_FIRST_NAME: pair.mentor.first_name,
              MENTOR_FULL_NAME: pair.mentor.full_name,
            };

            if (!isMentorTemplate && pair.mentee.slack_user_id) {
              recipients.push({
                slack_user_id: pair.mentee.slack_user_id,
                context: { ...buildParticipantContext(pair.mentee, cohortName), ...pairContext },
              });
            }
            if (!isMenteeTemplate && pair.mentor.slack_user_id) {
              recipients.push({
                slack_user_id: pair.mentor.slack_user_id,
                context: { ...buildParticipantContext(pair.mentor, cohortName), ...pairContext },
              });
            }
          }

          if (recipients.length === 0) continue;
          const result = await sendBulkMessages({
            cohortId: selectedCohort,
            templateType: tpl.template_type,
            templateBody: body,
            recipients,
          });
          totalSent += result.sent;
          totalFailed += result.failed;
        }
        toast({
          title: 'Messages sent',
          description: `${totalSent} sent, ${totalFailed} failed`,
        });
      } else {
        // No overrides — use the standard edge function, but pass template bodies as fallback
        // Map templates to standard role keys so the edge function can find them
        // regardless of the actual template_type name (e.g. "Mentee - Intro Message" → "welcome_mentee")
        const launchTemplates: Record<string, string> = {};
        const assigned = launchStage ? (stageAssignedTemplates[launchStage.id] || []).filter(t => selectedIds.has(t.id)) : [];
        for (const tpl of assigned) {
          const typeLower = tpl.template_type.toLowerCase();
          if (typeLower.includes('mentee') && !launchTemplates.welcome_mentee) {
            launchTemplates.welcome_mentee = tpl.body;
          } else if (typeLower.includes('mentor') && !launchTemplates.welcome_mentor) {
            launchTemplates.welcome_mentor = tpl.body;
          } else if ((typeLower.includes('channel') || typeLower.includes('announcement')) && !launchTemplates.channel_announcement) {
            launchTemplates.channel_announcement = tpl.body;
          }
        }
        console.log('[sendWelcome] standard path: mapped template keys:', Object.keys(launchTemplates));
        const result = await sendWelcomeMessages(selectedCohort, Object.keys(launchTemplates).length > 0 ? launchTemplates : undefined);
        console.log('[sendWelcome] edge function result:', result);

        if (result.sent === 0 && result.failed === 0) {
          // Provide a helpful diagnostic message
          const hints: string[] = result.diagnostics || [];
          if (hints.length === 0) {
            if (result.pairs === 0) hints.push('No matched pairs found — run matching first.');
            else {
              hints.push(`${result.pairs} pair(s) found but no messages sent.`);
              hints.push('Check that mentees/mentors have Slack IDs and welcome templates exist.');
            }
          }
          toast({
            title: 'No messages sent',
            description: hints.join(' '),
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Welcome messages sent',
            description: `${result.sent} sent, ${result.failed} failed out of ${result.pairs} pairs`,
          });
        }
      }
      // Auto-check "Send match notifications" checklist item in the launch stage
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
      console.error('[sendWelcome] error:', err);
      toast({
        title: 'Failed to send messages',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsSendingMessages(false);
    }
  };

  // Send messages for any stage using bulk send (for overrides or custom templates)
  const handleSendStageWithBulk = async (stageId: string, templateType: string) => {
    if (!selectedCohort) return;
    setIsSendingStageMessages(true);
    try {
      const matchedPairs = await getMatchedPairsWithPhase(selectedCohort);
      const cohortName = cohorts.find(c => c.id === selectedCohort)?.name || '';
      const selectedIds = selectedTemplatesForSend[stageId] || new Set<string>();
      const assigned = (stageAssignedTemplates[stageId] || []).filter(t => selectedIds.has(t.id));
      let totalSent = 0, totalFailed = 0;

      for (const tpl of assigned) {
        const body = getEffectiveBody(tpl.id);
        if (!body) continue;

        // Filter pairs to those whose journey phase matches this template's phase
        const applicablePairs = tpl.journey_phase
          ? matchedPairs.filter(p => p.journeyPhase === tpl.journey_phase)
          : matchedPairs;

        // Determine which role(s) this template targets
        const isMenteeTemplate = tpl.template_type.includes('_mentee');
        const isMentorTemplate = tpl.template_type.includes('_mentor');

        // Build recipients — one per applicable participant in each pair
        const recipients: Array<{ slack_user_id: string; context: Record<string, string> }> = [];
        for (const pair of applicablePairs) {
          const pairContext = {
            MENTEE_FIRST_NAME: pair.mentee.first_name,
            MENTEE_FULL_NAME: pair.mentee.full_name,
            MENTOR_FIRST_NAME: pair.mentor.first_name,
            MENTOR_FULL_NAME: pair.mentor.full_name,
          };

          // Send to mentee (unless template is mentor-only)
          if (!isMentorTemplate && pair.mentee.slack_user_id) {
            recipients.push({
              slack_user_id: pair.mentee.slack_user_id,
              context: { ...buildParticipantContext(pair.mentee, cohortName), ...pairContext },
            });
          }

          // Send to mentor (unless template is mentee-only)
          if (!isMenteeTemplate && pair.mentor.slack_user_id) {
            recipients.push({
              slack_user_id: pair.mentor.slack_user_id,
              context: { ...buildParticipantContext(pair.mentor, cohortName), ...pairContext },
            });
          }
        }

        if (recipients.length === 0) continue;
        const result = await sendBulkMessages({
          cohortId: selectedCohort,
          templateType: tpl.template_type,
          templateBody: body,
          recipients,
        });
        totalSent += result.sent;
        totalFailed += result.failed;
      }
      toast({
        title: 'Messages sent',
        description: `${totalSent} sent, ${totalFailed} failed`,
      });
      loadStages();
    } catch (err: any) {
      toast({
        title: 'Failed to send messages',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsSendingStageMessages(false);
    }
  };

  const handleSendStageMessages = async () => {
    if (!selectedCohort || !sendStagePhase) return;
    setIsSendStageConfirmOpen(false);

    // Check if the stage has overrides or partial selection — if so, use bulk send for precise control
    const stageType = sendStagePhase === 'midpoint' ? 'midpoint' : 'closure';
    const stage = stages.find(s => s.stage_type === stageType);
    if (stage) {
      const allAssigned = stageAssignedTemplates[stage.id] || [];
      const selectedIds = selectedTemplatesForSend[stage.id] || new Set<string>();
      const isPartialSelection = selectedIds.size < allAssigned.length;
      if (isPartialSelection || hasAnyOverrides(stage.id)) {
        return handleSendStageWithBulk(stage.id, stageType);
      }
    }

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

  const handleToggleSessionReminders = async (enabled: boolean) => {
    if (!selectedCohort) return;
    setIsTogglingReminders(true);
    try {
      await updateCohort(selectedCohort, { session_reminders_enabled: enabled });
      setCohorts(prev => prev.map(c =>
        c.id === selectedCohort ? { ...c, session_reminders_enabled: enabled } : c
      ));
      toast({
        title: enabled ? 'Monthly reminders enabled' : 'Monthly reminders disabled',
        description: enabled
          ? 'Session-logging reminders will be sent automatically each month based on the cohort start date.'
          : 'Monthly session-logging reminders have been turned off for this cohort.',
      });
    } catch (err: any) {
      toast({
        title: 'Failed to update reminder setting',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsTogglingReminders(false);
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
      <PageHeader
        title="Cohort Runbook"
        description="Track program stages and manage checklists"
      />

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

                      {/* Messages section — for launch, midpoint, closure (or any stage with assigned templates) */}
                      {(STAGE_DEFAULT_TYPES[stage.stage_type] || (stageAssignedTemplates[stage.id] && stageAssignedTemplates[stage.id].length > 0)) && (() => {
                        const defaults = STAGE_DEFAULT_TYPES[stage.stage_type];
                        const assignedTemplates = stageAssignedTemplates[stage.id] || [];
                        const summary = stageMsgSummary[stage.stage_type];
                        const isLaunch = stage.stage_type === 'launch';
                        const isStageWithPhase = !!defaults?.phase;

                        return (
                          <div className="border-t pt-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                                <Label className="text-xs">Messages</Label>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => setAddTemplateForStage(stage.id)}
                              >
                                <Plus className="w-3 h-3 mr-1" /> Add Template
                              </Button>
                            </div>

                            {isStageWithPhase && (
                              <p className="text-xs text-muted-foreground mb-3">
                                Next-steps messages are auto-sent when a participant logs a session in this phase.
                                Use the button below to send to remaining participants who haven't received it yet.
                              </p>
                            )}

                            {assignedTemplates.length === 0 ? (
                              <div className="rounded-md border border-dashed p-4 text-center space-y-3">
                                <p className="text-sm text-muted-foreground">
                                  No message templates set up for this stage yet.
                                </p>
                                {defaults && (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={async () => {
                                        setSeedingStage(stage.id);
                                        try {
                                          const created = await seedDefaultTemplatesForStage(stage.stage_type);
                                          toast({
                                            title: 'Templates added',
                                            description: created > 0
                                              ? `${created} default template${created > 1 ? 's' : ''} added to this stage.`
                                              : 'Default templates already existed — they have been assigned to this stage.',
                                          });
                                          await loadStages();
                                        } catch (err: any) {
                                          toast({ title: 'Error', description: err.message, variant: 'destructive' });
                                        } finally {
                                          setSeedingStage(null);
                                        }
                                      }}
                                      disabled={seedingStage === stage.id}
                                    >
                                      {seedingStage === stage.id ? (
                                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                      ) : (
                                        <Plus className="w-3 h-3 mr-1" />
                                      )}
                                      Add Default Templates
                                    </Button>
                                    <p className="text-xs text-muted-foreground">
                                      {isLaunch
                                        ? 'Adds Welcome (Mentee), Welcome (Mentor), and Channel Announcement templates.'
                                        : `Adds Next Steps templates for the ${defaults.phase === 'midpoint' ? 'Midpoint' : 'Wrapping Up'} phase.`}
                                    </p>
                                  </>
                                )}
                                <div>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setAddTemplateForStage(stage.id)}
                                  >
                                    <Plus className="w-3 h-3 mr-1" /> Pick Existing Template
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {assignedTemplates.length > 1 && (
                                  <div className="flex items-center gap-2 pb-1">
                                    <Checkbox
                                      checked={assignedTemplates.every(t => (selectedTemplatesForSend[stage.id] || new Set()).has(t.id))}
                                      onCheckedChange={() => toggleAllTemplatesForStage(stage.id, assignedTemplates)}
                                    />
                                    <span className="text-xs text-muted-foreground">
                                      Select all ({getSelectedCount(stage.id)} of {assignedTemplates.length} selected)
                                    </span>
                                  </div>
                                )}
                                {assignedTemplates.map(tpl => {
                                  const isOverridden = stageMessageOverrides[tpl.id] !== undefined;
                                  const isEditing = editingInlineTemplate === tpl.id;
                                  const effectiveBody = getEffectiveBody(tpl.id);

                                  return (
                                    <div key={tpl.id} className="border rounded-md">
                                      <div className="flex items-start gap-3 p-2">
                                        <Checkbox
                                          checked={(selectedTemplatesForSend[stage.id] || new Set()).has(tpl.id)}
                                          onCheckedChange={() => toggleTemplateSelection(stage.id, tpl.id)}
                                          className="mt-1"
                                        />
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium">{getTypeLabel(tpl.template_type)}</span>
                                            {!tpl.is_active && (
                                              <Badge variant="outline" className="text-[10px] h-4">Inactive</Badge>
                                            )}
                                            {isOverridden && (
                                              <Badge variant="secondary" className="text-[10px] h-4 bg-amber-100 text-amber-800">Modified</Badge>
                                            )}
                                          </div>
                                          {!isEditing && (
                                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                                              {effectiveBody.substring(0, 100)}{effectiveBody.length > 100 ? '...' : ''}
                                            </p>
                                          )}
                                        </div>
                                        <div className="flex gap-1 shrink-0">
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-7 text-xs"
                                            onClick={() => { setPreviewBody(renderPreview(effectiveBody)); setIsPreviewOpen(true); }}
                                          >
                                            <Eye className="w-3 h-3 mr-1" />Preview
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-7 text-xs"
                                            onClick={() => {
                                              if (isEditing) {
                                                setEditingInlineTemplate(null);
                                              } else {
                                                setEditingInlineTemplate(tpl.id);
                                                // Pre-populate override from current effective body if not already overridden
                                                if (!isOverridden) {
                                                  setStageMessageOverrides(prev => ({ ...prev, [tpl.id]: tpl.body }));
                                                }
                                              }
                                            }}
                                          >
                                            <Edit className="w-3 h-3 mr-1" />
                                            {isEditing ? 'Done' : 'Edit for this send'}
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                            onClick={() => handleUnassignTemplate(stage.id, tpl.id)}
                                          >
                                            <X className="w-3 h-3" />
                                          </Button>
                                        </div>
                                      </div>

                                      {/* Inline editor */}
                                      {isEditing && (
                                        <div className="px-2 pb-2 space-y-2">
                                          <Textarea
                                            value={stageMessageOverrides[tpl.id] ?? tpl.body}
                                            onChange={(e) => setStageMessageOverrides(prev => ({ ...prev, [tpl.id]: e.target.value }))}
                                            rows={6}
                                            className="text-xs font-mono"
                                            placeholder="Edit the message body for this send..."
                                          />
                                          <div className="flex items-center gap-2">
                                            <p className="text-[10px] text-muted-foreground flex-1">
                                              Use {'{FIRST_NAME}'}, {'{MENTOR_FIRST_NAME}'}, {'{COHORT_NAME}'}, etc. for placeholders.
                                              This edit is a one-time override — the saved template is not changed.
                                            </p>
                                            {isOverridden && (
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-6 text-[10px]"
                                                onClick={() => {
                                                  setStageMessageOverrides(prev => {
                                                    const next = { ...prev };
                                                    delete next[tpl.id];
                                                    return next;
                                                  });
                                                  setEditingInlineTemplate(null);
                                                }}
                                              >
                                                Reset to original
                                              </Button>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Send button for launch stage */}
                            {isLaunch && assignedTemplates.length > 0 && (
                              <Button
                                size="sm"
                                className="mt-3"
                                onClick={() => setIsSendConfirmOpen(true)}
                                disabled={isSendingMessages || getSelectedCount(stage.id) === 0}
                              >
                                {isSendingMessages ? (
                                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                ) : (
                                  <Send className="w-3 h-3 mr-1" />
                                )}
                                Send Welcome Messages ({getSelectedCount(stage.id)}/{assignedTemplates.length})
                              </Button>
                            )}

                            {/* Send button for midpoint/closure stages */}
                            {isStageWithPhase && assignedTemplates.length > 0 && (
                              <Button
                                size="sm"
                                className="mt-3"
                                onClick={() => {
                                  setSendStagePhase(defaults!.phase!);
                                  setSendStageLabel(
                                    stage.stage_type === 'midpoint' ? 'Midpoint' : 'Wrapping Up'
                                  );
                                  setIsSendStageConfirmOpen(true);
                                }}
                                disabled={isSendingStageMessages || getSelectedCount(stage.id) === 0}
                              >
                                {isSendingStageMessages ? (
                                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                ) : (
                                  <Send className="w-3 h-3 mr-1" />
                                )}
                                Send {stage.stage_type === 'midpoint' ? 'Midpoint' : 'Wrapping Up'} Messages ({getSelectedCount(stage.id)}/{assignedTemplates.length})
                              </Button>
                            )}

                            {/* Monthly session reminders toggle — midpoint stage only */}
                            {stage.stage_type === 'midpoint' && (() => {
                              const currentCohort = cohorts.find(c => c.id === selectedCohort);
                              const remindersEnabled = currentCohort?.session_reminders_enabled !== false;
                              const startDate = currentCohort?.start_date;
                              const monthsElapsed = startDate
                                ? Math.floor((Date.now() - new Date(startDate).getTime()) / (30.44 * 24 * 60 * 60 * 1000))
                                : 0;

                              return (
                                <div className="mt-4 border rounded-md p-3 space-y-2 bg-muted/30">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Bell className="w-4 h-4 text-muted-foreground" />
                                      <Label className="text-xs font-medium">Monthly Session Reminders</Label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {isTogglingReminders && <Loader2 className="w-3 h-3 animate-spin" />}
                                      <Switch
                                        checked={remindersEnabled}
                                        onCheckedChange={handleToggleSessionReminders}
                                        disabled={isTogglingReminders}
                                      />
                                    </div>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {remindersEnabled
                                      ? startDate
                                        ? `Reminders are sent automatically each month from the cohort start date (${new Date(startDate).toLocaleDateString()}). ${monthsElapsed >= 1 ? `Month ${monthsElapsed} is current.` : 'First reminder will be sent after 1 month.'}`
                                        : 'Enabled, but no start date is set on this cohort. Set a start date in Cohort Details for reminders to begin.'
                                      : 'Reminders are off. Toggle on to automatically remind all matched participants to log their sessions each month.'}
                                  </p>
                                </div>
                              );
                            })()}

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

                            {/* Tip about messaging unmatched */}
                            {isLaunch && (
                              <p className="text-xs text-muted-foreground mt-3 bg-muted/50 rounded px-3 py-2">
                                <strong>Tip:</strong> To message unmatched mentees (e.g. waitlist updates), use the{' '}
                                <button
                                  className="text-primary underline"
                                  onClick={() => navigate(`/admin/settings?tab=messages`)}
                                >
                                  Compose &amp; Send
                                </button>{' '}
                                tab in Messages, or the "Message Unmatched" action in the Cohort Detail page.
                              </p>
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
              {(() => {
                const launchStage = stages.find(s => s.stage_type === 'launch');
                const total = launchStage ? (stageAssignedTemplates[launchStage.id] || []).length : 0;
                const selected = launchStage ? getSelectedCount(launchStage.id) : 0;
                return `This will send ${selected} of ${total} welcome template(s) to all matched mentee-mentor pairs via Slack. Make sure your Zapier webhook is configured.`;
              })()}
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
              {(() => {
                const stageType = sendStagePhase === 'midpoint' ? 'midpoint' : 'closure';
                const stage = stages.find(s => s.stage_type === stageType);
                const total = stage ? (stageAssignedTemplates[stage.id] || []).length : 0;
                const selected = stage ? getSelectedCount(stage.id) : 0;
                return `This will send ${selected} of ${total} template(s) to participants in matched pairs. Participants who were auto-sent a message when they logged a session will be skipped.`;
              })()}
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

      {/* Add Template Picker Dialog */}
      <Dialog open={!!addTemplateForStage} onOpenChange={(open) => { if (!open) setAddTemplateForStage(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Template to Stage</DialogTitle>
            <DialogDescription>
              Choose from your saved message templates. You can edit any template inline after adding it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1 max-h-[50vh] overflow-y-auto">
            {allTemplates
              .filter(t => t.is_active)
              .filter(t => {
                // Don't show templates already assigned to this stage
                const assigned = addTemplateForStage ? (stageAssignedTemplates[addTemplateForStage] || []) : [];
                return !assigned.some(a => a.id === t.id);
              })
              .map(t => (
                <button
                  key={t.id}
                  className="w-full text-left p-3 rounded-md hover:bg-muted transition-colors border"
                  onClick={() => { if (addTemplateForStage) handleAssignTemplate(addTemplateForStage, t); }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{getTypeLabel(t.template_type)}</span>
                    {t.stage_type && (
                      <Badge variant="secondary" className="text-[10px] h-4">{t.stage_type}</Badge>
                    )}
                    {t.journey_phase && (
                      <Badge variant="outline" className="text-[10px] h-4">{t.journey_phase}</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {t.body.substring(0, 120)}{t.body.length > 120 ? '...' : ''}
                  </p>
                </button>
              ))}
            {allTemplates.filter(t => t.is_active).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No active templates found.{' '}
                <button
                  className="text-primary underline"
                  onClick={() => { setAddTemplateForStage(null); navigate('/admin/settings?tab=messages'); }}
                >
                  Create one in Settings
                </button>
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddTemplateForStage(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
