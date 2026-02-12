import { useState, useEffect, useRef } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { Plus, MoreVertical, Loader2, Copy, Trash2, Edit, Eye, ChevronDown, ChevronRight } from 'lucide-react';
import {
  getMessageTemplates, upsertMessageTemplate, deleteMessageTemplate, getMessageLog,
  TEMPLATE_TYPES, JOURNEY_PHASES, AVAILABLE_PLACEHOLDERS,
  type MessageTemplate, type MessageLogEntry,
} from '@/lib/messageService';
import { getAllCohorts } from '@/lib/supabaseService';
import type { Cohort } from '@/types/mentoring';

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
  MENTEE_EMAIL: 'alice@mews.com',
  MENTOR_EMAIL: 'bob@mews.com',
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

export default function MessageTemplates() {
  const { toast } = useToast();

  // Data
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [messageLog, setMessageLog] = useState<MessageLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [logLoading, setLogLoading] = useState(false);

  // Filters
  const [activeTab, setActiveTab] = useState('templates');
  const [logCohortId, setLogCohortId] = useState<string>('');

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Message Templates</h1>
          <p className="text-muted-foreground mt-1">
            Manage templates for welcome messages, announcements, and session next-steps.
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="w-4 h-4 mr-2" />
          New Template
        </Button>
      </div>

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
                <div className="text-center py-12 text-muted-foreground">
                  <p>No templates yet.</p>
                  <p className="text-sm mt-1">Click "New Template" to create your first message template.</p>
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
                <Select value={logCohortId} onValueChange={(v) => { setLogCohortId(v); loadMessageLog(v); }}>
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sent</TableHead>
                      <TableHead className="w-[50px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {messageLog.map(entry => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <Badge variant="outline">{getTypeLabel(entry.template_type)}</Badge>
                        </TableCell>
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
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(entry.created_at).toLocaleString()}
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
