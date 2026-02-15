import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Plus, MoreVertical, Loader2, Copy, Trash2, Edit, Eye, ChevronDown, ChevronRight, PackagePlus } from 'lucide-react';
import { PageHeader } from "@/components/admin/PageHeader";
import {
  getMessageTemplates, upsertMessageTemplate, deleteMessageTemplate, getMessageLog,
  TEMPLATE_TYPES, JOURNEY_PHASES, AVAILABLE_PLACEHOLDERS,
  type MessageTemplate, type MessageLogEntry,
} from '@/lib/messageService';
import { getAllCohorts } from '@/lib/supabaseService';
import type { Cohort } from '@/types/mentoring';

// ============================================================================
// DEFAULT STARTER TEMPLATES
// ============================================================================

const DEFAULT_TEMPLATES: Array<{ template_type: string; journey_phase: string | null; body: string }> = [
  {
    template_type: 'welcome_mentee',
    journey_phase: null,
    body: `Hi {FIRST_NAME}! 👋

Welcome to the {COHORT_NAME} mentoring program! You've been matched with {MENTOR_FIRST_NAME} as your mentor.

Here's what we know about your match:
• Your focus area: {PRIMARY_CAPABILITY}
• Shared capability: {SHARED_CAPABILITY}

**Next steps:**
1. Reach out to {MENTOR_FIRST_NAME} to introduce yourself and schedule your first session
2. Before your first meeting, think about what you'd like to get out of this mentoring relationship
3. Your mentoring goal: {MENTORING_GOAL} — share this with your mentor so they can tailor their support

We recommend meeting every 2-3 weeks for 30-60 minutes. You'll receive a session log form after each meeting to help us track how things are going.

If you have any questions, reach out to {ADMIN_EMAIL}.

Happy mentoring! 🚀`,
  },
  {
    template_type: 'welcome_mentor',
    journey_phase: null,
    body: `Hi {FIRST_NAME}! 👋

Thank you for volunteering as a mentor in the {COHORT_NAME} program! You've been matched with {MENTEE_FIRST_NAME}.

Here's your match overview:
• Shared capability: {SHARED_CAPABILITY}
• Your mentee's focus: {PRIMARY_CAPABILITY}

**About your mentee:**
They want to develop: {PRIMARY_CAPABILITY}
Their goal: Your mentee will share more details in your first session.

**Getting started:**
1. Your mentee will reach out to schedule your first meeting — feel free to initiate if you haven't heard from them within a few days
2. In your first session, focus on getting to know each other and setting expectations
3. We recommend meeting every 2-3 weeks for 30-60 minutes

After each session, you'll receive a short log form. This helps us understand engagement across the program.

Your motivation for mentoring: {MENTOR_MOTIVATION} — hold onto that, it matters!

Questions? Reach out to {ADMIN_EMAIL}.

Thank you for investing in someone's growth! 🙏`,
  },
  {
    template_type: 'channel_announcement',
    journey_phase: null,
    body: `🎉 **{COHORT_NAME} Mentoring Program has launched!**

All mentee-mentor pairs have been matched and notified. Mentees and mentors — check your DMs for your match details and next steps.

📋 **Quick reminders:**
• Mentees: reach out to your mentor to schedule your first session
• Mentors: expect to hear from your mentee soon
• Both: log your sessions using the form we'll share — it helps us support you better

Let's make this cohort a great one! 🚀`,
  },
  {
    template_type: 'next_steps',
    journey_phase: 'getting_started',
    body: `Great job on completing a session, {FIRST_NAME}! 🎯

Since you're in the **Getting Started** phase, here are some tips for your next meeting:

• Reflect on what went well and what you'd like to explore more deeply
• Start thinking about 1-2 specific skills or challenges you want to work on together
• Consider sharing relevant resources or context before your next session

Keep the momentum going — regular sessions make the biggest difference.

Questions or need support? Contact {ADMIN_EMAIL}.`,
  },
  {
    template_type: 'next_steps',
    journey_phase: 'building',
    body: `Another session in the books, {FIRST_NAME}! 💪

You're in the **Building** phase — this is where the real growth happens. For your next session:

• Review any action items from today's meeting
• Think about what's challenging you at work right now — bring a real problem to discuss
• Consider if there's anyone in your mentor's/mentee's network who could help with your goals

Remember: the best mentoring conversations are the honest ones.

Need anything? Reach out to {ADMIN_EMAIL}.`,
  },
  {
    template_type: 'next_steps',
    journey_phase: 'midpoint',
    body: `You've reached the midpoint of {COHORT_NAME}, {FIRST_NAME}! 🏁

Time for a quick check-in:

• How is the mentoring relationship going? Are you getting what you need?
• Revisit your original goal: {MENTORING_GOAL} — are you on track?
• Is there anything you'd like to adjust about how you work together?

This is a great time to have an honest conversation with your mentor/mentee about what's working and what could be better.

You'll receive a brief midpoint survey soon — your feedback helps us improve the program.

Questions? {ADMIN_EMAIL} is here to help.`,
  },
  {
    template_type: 'next_steps',
    journey_phase: 'wrapping_up',
    body: `You're approaching the end of {COHORT_NAME}, {FIRST_NAME}! 🎓

As you wrap up your mentoring journey:

• Reflect on what you've learned and how you've grown
• Discuss with your mentor/mentee whether you'd like to stay in touch informally
• Think about what advice you'd give to future participants

You'll receive a final survey soon — we'd love to hear about your experience.

Thank you for being part of this program. Whether you were a mentor or mentee, you've contributed to someone else's growth, and that matters.

Reach out to {ADMIN_EMAIL} if there's anything you need. 🙏`,
  },
];

// Sample data for preview
const SAMPLE_CONTEXT: Record<string, string> = {
  FIRST_NAME: 'Alice',
  FULL_NAME: 'Alice Johnson',
  ROLE_TITLE: 'Senior Product Manager',
  FUNCTION: 'Product',
  PRIMARY_CAPABILITY: 'Strategic Thinking & Execution',
  SECONDARY_CAPABILITY: 'Stakeholder Management',
  MENTORING_GOAL: 'Develop my strategic thinking skills to lead cross-functional initiatives',
  BIO: 'PM focused on growth products at Mews',
  SESSION_STYLE: 'Structured with agenda',
  FEEDBACK_STYLE: 'Direct and specific',
  NATURAL_STRENGTHS: 'Active Listening, Asking powerful questions',
  HARD_EARNED_LESSON: 'The best mentoring happens when you listen more than you talk',
  MENTOR_MOTIVATION: 'I want to give back and help others navigate career growth',
  MENTORING_EXPERIENCE: 'Mentored informally for 2 years',
  MENTEE_FIRST_NAME: 'Alice',
  MENTOR_FIRST_NAME: 'Bob',
  SHARED_CAPABILITY: 'Strategic Thinking & Execution',
  COHORT_NAME: 'Q2 2026',
  RESOURCE_LINK: 'https://example.com/guide',
  SURVEY_LINK: 'https://example.com/survey',
  ADMIN_EMAIL: 'mentoring@mews.com',
};

function renderPreview(template: string): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return SAMPLE_CONTEXT[key] || match;
  });
}

function getTypeLabel(value: string): string {
  return TEMPLATE_TYPES.find(t => t.value === value)?.label || value;
}

function getPhaseLabel(value: string | null): string {
  if (!value) return '';
  return JOURNEY_PHASES.find(p => p.value === value)?.label || value;
}

interface MessageBatch {
  id: string;
  template_type: string;
  sent_at: string;
  entries: MessageLogEntry[];
  sentCount: number;
  failedCount: number;
  pendingCount: number;
}

function groupIntoBatches(entries: MessageLogEntry[]): MessageBatch[] {
  const BUCKET_MS = 5 * 60 * 1000; // 5-minute buckets
  const sorted = [...entries].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const batchMap = new Map<string, MessageBatch>();

  for (const entry of sorted) {
    const ts = new Date(entry.created_at).getTime();
    const bucket = Math.floor(ts / BUCKET_MS) * BUCKET_MS;
    const key = `${entry.template_type}::${bucket}`;

    let batch = batchMap.get(key);
    if (!batch) {
      batch = {
        id: key,
        template_type: entry.template_type,
        sent_at: entry.created_at,
        entries: [],
        sentCount: 0,
        failedCount: 0,
        pendingCount: 0,
      };
      batchMap.set(key, batch);
    }

    batch.entries.push(entry);
    if (entry.delivery_status === 'sent') batch.sentCount++;
    else if (entry.delivery_status === 'failed') batch.failedCount++;
    else batch.pendingCount++;
  }

  // Newest first
  return Array.from(batchMap.values()).sort(
    (a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()
  );
}

export default function MessageTemplates() {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  // Data
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [messageLog, setMessageLog] = useState<MessageLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [logLoading, setLogLoading] = useState(false);

  // Filters — initialise from URL params if present
  const subtabParam = searchParams.get('subtab');
  const logCohortParam = searchParams.get('logCohort');
  const [activeTab, setActiveTab] = useState(subtabParam === 'log' ? 'log' : 'templates');
  const [logCohortId, setLogCohortId] = useState<string>(logCohortParam || '');

  const [seeding, setSeeding] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  // Batch grouping
  const batches = useMemo(() => groupIntoBatches(messageLog), [messageLog]);
  const selectedBatch = batches.find(b => b.id === selectedBatchId) || null;

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [previewBody, setPreviewBody] = useState('');
  const [saving, setSaving] = useState(false);

  // Form fields
  const [formType, setFormType] = useState('welcome_mentee');
  const [formPhase, setFormPhase] = useState<string>('');
  const [formCohortId, setFormCohortId] = useState<string>('_global');
  const [formBody, setFormBody] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [showPlaceholders, setShowPlaceholders] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  // Auto-load message log when arriving via "View full log" link
  useEffect(() => {
    if (!loading && logCohortId) {
      loadMessageLog(logCohortId);
    }
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadData() {
    setLoading(true);
    try {
      const [tpl, c] = await Promise.all([
        getMessageTemplates(),
        getAllCohorts(),
      ]);
      setTemplates(tpl);
      setCohorts(c);
    } catch (err: any) {
      toast({ title: 'Error loading data', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  async function loadMessageLog(cohortId: string) {
    if (!cohortId) {
      setMessageLog([]);
      return;
    }
    setLogLoading(true);
    try {
      const log = await getMessageLog(cohortId);
      setMessageLog(log);
    } catch (err: any) {
      toast({ title: 'Error loading message log', description: err.message, variant: 'destructive' });
    } finally {
      setLogLoading(false);
    }
  }

  function openCreateDialog() {
    setEditingTemplate(null);
    setFormType('welcome_mentee');
    setFormPhase('');
    setFormCohortId('_global');
    setFormBody('');
    setFormActive(true);
    setShowPlaceholders(false);
    setIsDialogOpen(true);
  }

  function openEditDialog(template: MessageTemplate) {
    setEditingTemplate(template);
    setFormType(template.template_type);
    setFormPhase(template.journey_phase || '');
    setFormCohortId(template.cohort_id || '_global');
    setFormBody(template.body);
    setFormActive(template.is_active);
    setShowPlaceholders(false);
    setIsDialogOpen(true);
  }

  function openDuplicateDialog(template: MessageTemplate) {
    setEditingTemplate(null);
    setFormType(template.template_type);
    setFormPhase(template.journey_phase || '');
    setFormCohortId(template.cohort_id || '_global');
    setFormBody(template.body);
    setFormActive(true);
    setShowPlaceholders(false);
    setIsDialogOpen(true);
  }

  function openPreview(body: string) {
    setPreviewBody(body);
    setIsPreviewOpen(true);
  }

  async function handleSave() {
    if (!formBody.trim()) {
      toast({ title: 'Body is required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await upsertMessageTemplate({
        ...(editingTemplate ? { id: editingTemplate.id } : {}),
        template_type: formType,
        journey_phase: formType === 'next_steps' ? formPhase || null : null,
        cohort_id: formCohortId === '_global' ? null : formCohortId,
        body: formBody,
        is_active: formActive,
      });
      toast({ title: editingTemplate ? 'Template updated' : 'Template created' });
      setIsDialogOpen(false);
      await loadData();
    } catch (err: any) {
      toast({ title: 'Error saving template', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteMessageTemplate(id);
      toast({ title: 'Template deleted' });
      await loadData();
    } catch (err: any) {
      toast({ title: 'Error deleting template', description: err.message, variant: 'destructive' });
    }
  }

  async function handleToggleActive(template: MessageTemplate) {
    try {
      await upsertMessageTemplate({
        id: template.id,
        template_type: template.template_type,
        body: template.body,
        is_active: !template.is_active,
        journey_phase: template.journey_phase,
        cohort_id: template.cohort_id,
      });
      await loadData();
    } catch (err: any) {
      toast({ title: 'Error updating template', description: err.message, variant: 'destructive' });
    }
  }

  async function handleAddDefaults() {
    setSeeding(true);
    try {
      let created = 0;
      for (const tpl of DEFAULT_TEMPLATES) {
        // Skip if a template with the same type + phase already exists (global scope)
        const exists = templates.some(
          t => t.template_type === tpl.template_type
            && t.journey_phase === tpl.journey_phase
            && !t.cohort_id
        );
        if (exists) continue;

        await upsertMessageTemplate({
          template_type: tpl.template_type,
          journey_phase: tpl.journey_phase,
          cohort_id: null,
          body: tpl.body,
          is_active: true,
        });
        created++;
      }
      toast({
        title: 'Default templates added',
        description: created > 0
          ? `${created} template${created > 1 ? 's' : ''} created. ${DEFAULT_TEMPLATES.length - created} already existed.`
          : 'All default templates already exist — nothing was added.',
      });
      await loadData();
    } catch (err: any) {
      toast({ title: 'Error adding defaults', description: err.message, variant: 'destructive' });
    } finally {
      setSeeding(false);
    }
  }

  function insertPlaceholder(placeholder: string) {
    const textarea = textareaRef.current;
    if (!textarea) {
      setFormBody(prev => prev + placeholder);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newBody = formBody.substring(0, start) + placeholder + formBody.substring(end);
    setFormBody(newBody);
    // Restore cursor position after the inserted placeholder
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
    });
  }

  function getCohortName(cohortId: string | null): string {
    if (!cohortId) return 'Global';
    return cohorts.find(c => c.id === cohortId)?.name || cohortId;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Message Templates"
        description="Manage templates for welcome messages, announcements, and session next-steps."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleAddDefaults} disabled={seeding}>
              {seeding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <PackagePlus className="w-4 h-4 mr-2" />}
              Add Default Templates
            </Button>
            <Button onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />
              New Template
            </Button>
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="log">Message Log</TabsTrigger>
        </TabsList>

        {/* ============ TEMPLATES TAB ============ */}
        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">All Templates</CardTitle>
            </CardHeader>
            <CardContent>
              {templates.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground space-y-3">
                  <p>No templates yet.</p>
                  <p className="text-sm">Click "New Template" to create one manually, or add all 7 starter templates at once:</p>
                  <Button variant="outline" onClick={handleAddDefaults} disabled={seeding}>
                    {seeding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <PackagePlus className="w-4 h-4 mr-2" />}
                    Add Default Templates
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Journey Phase</TableHead>
                      <TableHead>Scope</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead className="w-[50px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.map(template => (
                      <TableRow key={template.id}>
                        <TableCell>
                          <Badge variant="outline">{getTypeLabel(template.template_type)}</Badge>
                        </TableCell>
                        <TableCell>
                          {template.journey_phase ? (
                            <Badge variant="secondary">{getPhaseLabel(template.journey_phase)}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={template.cohort_id ? '' : 'text-muted-foreground'}>
                            {getCohortName(template.cohort_id)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={template.is_active}
                            onCheckedChange={() => handleToggleActive(template)}
                          />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(template.updated_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(template)}>
                                <Edit className="w-4 h-4 mr-2" />Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openPreview(template.body)}>
                                <Eye className="w-4 h-4 mr-2" />Preview
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openDuplicateDialog(template)}>
                                <Copy className="w-4 h-4 mr-2" />Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDelete(template.id)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ MESSAGE LOG TAB ============ */}
        <TabsContent value="log">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Message Delivery Log</CardTitle>
                <Select value={logCohortId} onValueChange={(v) => { setLogCohortId(v); setSelectedBatchId(null); loadMessageLog(v); }}>
                  <SelectTrigger className="w-[240px]">
                    <SelectValue placeholder="Select a cohort..." />
                  </SelectTrigger>
                  <SelectContent>
                    {cohorts.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {!logCohortId ? (
                <p className="text-center py-8 text-muted-foreground">
                  Select a cohort to view its message delivery history.
                </p>
              ) : logLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : messageLog.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No messages sent for this cohort yet.
                </p>
              ) : (
                <div className="flex gap-4">
                  {/* Left panel — Batch list */}
                  <div className="w-2/5 border rounded-md">
                    <ScrollArea className="h-[500px]">
                      <div className="divide-y">
                        {batches.map(batch => (
                          <button
                            key={batch.id}
                            type="button"
                            onClick={() => setSelectedBatchId(batch.id)}
                            className={`w-full text-left px-4 py-3 hover:bg-accent/50 transition-colors ${
                              selectedBatchId === batch.id ? 'bg-accent' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <Badge variant="outline">{getTypeLabel(batch.template_type)}</Badge>
                              <span className="text-xs text-muted-foreground">
                                {batch.entries.length} recipient{batch.entries.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mb-1">
                              {new Date(batch.sent_at).toLocaleString()}
                            </p>
                            <div className="flex gap-3 text-xs">
                              {batch.sentCount > 0 && (
                                <span className="text-green-600">{batch.sentCount} sent</span>
                              )}
                              {batch.failedCount > 0 && (
                                <span className="text-destructive">{batch.failedCount} failed</span>
                              )}
                              {batch.pendingCount > 0 && (
                                <span className="text-muted-foreground">{batch.pendingCount} pending</span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>

                  {/* Right panel — Recipient details */}
                  <div className="w-3/5 border rounded-md">
                    {!selectedBatch ? (
                      <div className="flex items-center justify-center h-[500px] text-muted-foreground text-sm">
                        Select a message batch to view recipients
                      </div>
                    ) : (
                      <div className="flex flex-col h-[500px]">
                        <div className="px-4 py-3 border-b bg-muted/30">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{getTypeLabel(selectedBatch.template_type)}</Badge>
                            <span className="text-sm text-muted-foreground">
                              {new Date(selectedBatch.sent_at).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <ScrollArea className="flex-1">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Recipient</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Time</TableHead>
                                <TableHead className="w-[50px]" />
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {selectedBatch.entries.map(entry => (
                                <TableRow key={entry.id}>
                                  <TableCell className="text-sm">{entry.recipient_email}</TableCell>
                                  <TableCell>
                                    <Badge variant={
                                      entry.delivery_status === 'sent' ? 'default' :
                                      entry.delivery_status === 'failed' ? 'destructive' : 'secondary'
                                    }>
                                      {entry.delivery_status}
                                    </Badge>
                                    {entry.error_detail && (
                                      <p className="text-xs text-destructive mt-1">{entry.error_detail}</p>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-xs text-muted-foreground">
                                    {new Date(entry.created_at).toLocaleTimeString()}
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => openPreview(entry.message_text)}
                                    >
                                      <Eye className="w-4 h-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </ScrollArea>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ============ CREATE / EDIT DIALOG ============ */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edit Template' : 'New Template'}</DialogTitle>
            <DialogDescription>
              Configure the message template. Use {'{PLACEHOLDER}'} syntax for dynamic content.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Template Type</Label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formType === 'next_steps' && (
                <div className="space-y-2">
                  <Label>Journey Phase</Label>
                  <Select value={formPhase} onValueChange={setFormPhase}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select phase..." />
                    </SelectTrigger>
                    <SelectContent>
                      {JOURNEY_PHASES.map(p => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Cohort Scope</Label>
                <Select value={formCohortId} onValueChange={setFormCohortId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_global">Global (all cohorts)</SelectItem>
                    {cohorts.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Message Body</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPlaceholders(!showPlaceholders)}
                  className="h-7 text-xs"
                >
                  {showPlaceholders ? <ChevronDown className="w-3 h-3 mr-1" /> : <ChevronRight className="w-3 h-3 mr-1" />}
                  Placeholders
                </Button>
              </div>

              {showPlaceholders && (
                <div className="flex flex-wrap gap-1 p-3 bg-muted rounded-md">
                  {AVAILABLE_PLACEHOLDERS.map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => insertPlaceholder(p)}
                      className="px-2 py-0.5 text-xs bg-background border rounded hover:bg-accent transition-colors cursor-pointer"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}

              <Textarea
                ref={textareaRef}
                value={formBody}
                onChange={(e) => setFormBody(e.target.value)}
                placeholder="Write your message template here..."
                rows={10}
                className="font-mono text-sm"
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={formActive} onCheckedChange={setFormActive} />
              <Label>Active</Label>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => openPreview(formBody)} disabled={!formBody.trim()}>
              <Eye className="w-4 h-4 mr-2" />Preview
            </Button>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !formBody.trim()}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingTemplate ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============ PREVIEW DIALOG ============ */}
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
