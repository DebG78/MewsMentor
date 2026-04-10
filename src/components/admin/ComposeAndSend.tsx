import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, Eye, Users, AlertTriangle } from 'lucide-react';
import {
  getCohortParticipants, getUnmatchedInCohort, getHoldingAreaParticipants,
  getMatchedPairsWithPhase, sendBulkMessages, buildParticipantContext,
  type Participant, type MessageTemplate, type MatchedPairWithPhase,
} from '@/lib/messageService';
import { getAllCohorts } from '@/lib/supabaseService';
import type { Cohort } from '@/types/mentoring';

type AudienceSource = 'cohort_all' | 'cohort_unmatched' | 'cohort_pairs' | 'holding_area';

const AUDIENCE_SOURCES: { value: AudienceSource; label: string; description: string }[] = [
  { value: 'cohort_all', label: 'All in cohort', description: 'Every mentee and mentor in a cohort' },
  { value: 'cohort_unmatched', label: 'Unmatched in cohort', description: 'Mentees who were not matched with a mentor' },
  { value: 'cohort_pairs', label: 'Matched pairs in cohort', description: 'Send to both people in selected pairs' },
  { value: 'holding_area', label: 'Holding area', description: 'People waiting for cohort assignment' },
];

function renderPreview(template: string, context: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    const val = context[key] ?? context[key.toUpperCase()];
    return val !== undefined && val !== null ? val : match;
  });
}

interface ComposeAndSendProps {
  cohorts: Cohort[];
  templates: MessageTemplate[];
  onMessagesSent?: () => void;
}

export default function ComposeAndSend({ cohorts, templates, onMessagesSent }: ComposeAndSendProps) {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL param pre-selection (from MatchBoard "Message Pair" button)
  const preSelectMenteeId = searchParams.get('pairMenteeId');
  const preSelectMentorId = searchParams.get('pairMentorId');
  const preSelectCohortId = searchParams.get('cohortId');

  // Step state
  const [audienceSource, setAudienceSource] = useState<AudienceSource>(
    preSelectMenteeId ? 'cohort_pairs' : 'cohort_unmatched'
  );
  const [selectedCohortId, setSelectedCohortId] = useState<string>(preSelectCohortId || '');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  // Pairs state (for cohort_pairs audience)
  const [matchedPairs, setMatchedPairs] = useState<MatchedPairWithPhase[]>([]);
  const [selectedPairKeys, setSelectedPairKeys] = useState<Set<string>>(new Set());
  const [preSelectApplied, setPreSelectApplied] = useState(false);

  // Template / message
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('_adhoc');
  const [messageBody, setMessageBody] = useState('');

  // Preview & send
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const activeTemplates = templates.filter(t => t.is_active);

  // Load participants when audience source or cohort changes
  useEffect(() => {
    if (audienceSource === 'cohort_pairs') {
      if (selectedCohortId) loadPairs();
      else { setMatchedPairs([]); setSelectedPairKeys(new Set()); }
      return;
    }
    if (audienceSource === 'holding_area') {
      loadParticipants();
    } else if (selectedCohortId) {
      loadParticipants();
    } else {
      setParticipants([]);
      setSelectedIds(new Set());
    }
  }, [audienceSource, selectedCohortId]);

  // When template is selected, populate message body
  useEffect(() => {
    if (selectedTemplateId === '_adhoc') return;
    const tpl = templates.find(t => t.id === selectedTemplateId);
    if (tpl) setMessageBody(tpl.body);
  }, [selectedTemplateId]);

  async function loadParticipants() {
    setLoadingParticipants(true);
    try {
      let people: Participant[] = [];
      if (audienceSource === 'holding_area') {
        people = await getHoldingAreaParticipants();
      } else if (audienceSource === 'cohort_unmatched') {
        people = await getUnmatchedInCohort(selectedCohortId);
      } else {
        people = await getCohortParticipants(selectedCohortId);
      }
      setParticipants(people);
      // Auto-select all with slack_user_id
      setSelectedIds(new Set(people.filter(p => p.slack_user_id).map(p => p.id)));
    } catch (err: any) {
      toast({ title: 'Error loading participants', description: err.message, variant: 'destructive' });
    } finally {
      setLoadingParticipants(false);
    }
  }

  async function loadPairs() {
    setLoadingParticipants(true);
    try {
      const pairs = await getMatchedPairsWithPhase(selectedCohortId);
      setMatchedPairs(pairs);
      // Auto-select all pairs where both people have Slack IDs
      const keys = new Set(
        pairs
          .filter(p => p.mentee.slack_user_id && p.mentor.slack_user_id)
          .map(p => pairKey(p))
      );
      // Apply URL pre-selection if present
      if (preSelectMenteeId && preSelectMentorId && !preSelectApplied) {
        const targetKey = `${preSelectMenteeId}:${preSelectMentorId}`;
        if (pairs.some(p => pairKey(p) === targetKey)) {
          keys.clear();
          keys.add(targetKey);
        }
        setPreSelectApplied(true);
        // Clean URL params after applying
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('pairMenteeId');
        newParams.delete('pairMentorId');
        newParams.delete('cohortId');
        setSearchParams(newParams, { replace: true });
      }
      setSelectedPairKeys(keys);
    } catch (err: any) {
      toast({ title: 'Error loading matched pairs', description: err.message, variant: 'destructive' });
    } finally {
      setLoadingParticipants(false);
    }
  }

  function pairKey(pair: MatchedPairWithPhase): string {
    return `${pair.mentee.id}:${pair.mentor.id}`;
  }

  function togglePair(key: string) {
    setSelectedPairKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleAllPairs() {
    const sendable = matchedPairs.filter(p => p.mentee.slack_user_id && p.mentor.slack_user_id);
    if (selectedPairKeys.size === sendable.length) {
      setSelectedPairKeys(new Set());
    } else {
      setSelectedPairKeys(new Set(sendable.map(p => pairKey(p))));
    }
  }

  function toggleParticipant(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    const sendable = participants.filter(p => p.slack_user_id);
    if (selectedIds.size === sendable.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sendable.map(p => p.id)));
    }
  }

  const selectedParticipants = participants.filter(p => selectedIds.has(p.id) && p.slack_user_id);
  const cohortName = cohorts.find(c => c.id === selectedCohortId)?.name || '';
  const noSlackCount = audienceSource === 'cohort_pairs'
    ? matchedPairs.filter(p => !p.mentee.slack_user_id || !p.mentor.slack_user_id).length
    : participants.filter(p => !p.slack_user_id).length;

  // For pairs: flatten selected pairs into recipients
  const selectedPairs = matchedPairs.filter(p => selectedPairKeys.has(pairKey(p)));
  const pairRecipientCount = selectedPairs.length * 2;

  // Preview context from first selected participant/pair
  const previewContext = (() => {
    if (audienceSource === 'cohort_pairs' && selectedPairs.length > 0) {
      return buildParticipantContext(selectedPairs[0].mentee, cohortName);
    }
    if (selectedParticipants.length > 0) {
      return buildParticipantContext(selectedParticipants[0], cohortName);
    }
    return { FIRST_NAME: 'Alice', FULL_NAME: 'Alice Johnson', COHORT_NAME: cohortName || 'Q2 2026' } as Record<string, string>;
  })();

  const resolvedTemplateType = (() => {
    if (selectedTemplateId === '_adhoc') return 'bulk_message';
    const tpl = templates.find(t => t.id === selectedTemplateId);
    return tpl?.template_type || 'bulk_message';
  })();

  const canSend = messageBody.trim() && (
    audienceSource === 'cohort_pairs'
      ? selectedPairs.length > 0 && selectedCohortId
      : selectedParticipants.length > 0 && (audienceSource === 'holding_area' || selectedCohortId)
  );

  async function handleSend() {
    if (!canSend) return;
    setSending(true);
    try {
      let recipients: { slack_user_id: string; context: Record<string, string> }[];

      if (audienceSource === 'cohort_pairs') {
        // Flatten pairs: two recipients per pair
        recipients = selectedPairs.flatMap(pair => [
          { slack_user_id: pair.mentee.slack_user_id!, context: buildParticipantContext(pair.mentee, cohortName) },
          { slack_user_id: pair.mentor.slack_user_id!, context: buildParticipantContext(pair.mentor, cohortName) },
        ]);
      } else {
        recipients = selectedParticipants.map(p => ({
          slack_user_id: p.slack_user_id!,
          context: buildParticipantContext(p, cohortName),
        }));
      }

      const effectiveCohortId = audienceSource === 'holding_area' ? 'unassigned' : selectedCohortId;

      const result = await sendBulkMessages({
        cohortId: effectiveCohortId,
        templateType: resolvedTemplateType,
        templateBody: messageBody,
        recipients,
      });

      toast({
        title: 'Messages sent',
        description: `${result.sent} sent, ${result.failed} failed out of ${recipients.length} recipients.`,
        variant: result.failed > 0 ? 'destructive' : 'default',
      });
      onMessagesSent?.();
    } catch (err: any) {
      toast({ title: 'Error sending messages', description: err.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Left column: Audience */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5" />
            Select Audience
          </CardTitle>
          <CardDescription>Choose who to send the message to</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Source</Label>
            <Select value={audienceSource} onValueChange={(v) => { setAudienceSource(v as AudienceSource); setSelectedCohortId(''); setMatchedPairs([]); setSelectedPairKeys(new Set()); }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AUDIENCE_SOURCES.map(s => (
                  <SelectItem key={s.value} value={s.value}>
                    <div>
                      <span>{s.label}</span>
                      <span className="text-muted-foreground ml-2 text-xs">{s.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {audienceSource !== 'holding_area' && (
            <div className="space-y-2">
              <Label>Cohort</Label>
              <Select value={selectedCohortId} onValueChange={setSelectedCohortId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a cohort..." />
                </SelectTrigger>
                <SelectContent>
                  {cohorts.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {loadingParticipants ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : audienceSource === 'cohort_pairs' ? (
            // Matched pairs list
            matchedPairs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {selectedCohortId
                  ? 'No matched pairs found in this cohort.'
                  : 'Select a cohort to see matched pairs.'}
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <Button variant="ghost" size="sm" onClick={toggleAllPairs} className="h-7 text-xs">
                    {selectedPairKeys.size === matchedPairs.filter(p => p.mentee.slack_user_id && p.mentor.slack_user_id).length ? 'Deselect all' : 'Select all'}
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {selectedPairs.length} pair{selectedPairs.length !== 1 ? 's' : ''} ({pairRecipientCount} recipients)
                  </span>
                </div>

                {noSlackCount > 0 && (
                  <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded px-3 py-2">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    {noSlackCount} pair{noSlackCount !== 1 ? 's' : ''} with missing Slack ID (cannot receive DMs)
                  </div>
                )}

                <ScrollArea className="h-[350px] border rounded-md">
                  <div className="divide-y">
                    {matchedPairs.map(pair => {
                      const key = pairKey(pair);
                      const hasBothSlack = !!pair.mentee.slack_user_id && !!pair.mentor.slack_user_id;
                      return (
                        <label
                          key={key}
                          className={`flex items-center gap-3 px-3 py-2.5 hover:bg-accent/50 cursor-pointer ${
                            !hasBothSlack ? 'opacity-50' : ''
                          }`}
                        >
                          <Checkbox
                            checked={selectedPairKeys.has(key)}
                            onCheckedChange={() => togglePair(key)}
                            disabled={!hasBothSlack}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-medium truncate">{pair.mentee.full_name}</span>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">mentee</Badge>
                              <span className="text-muted-foreground">+</span>
                              <span className="font-medium truncate">{pair.mentor.full_name}</span>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">mentor</Badge>
                            </div>
                            <div className="text-xs text-muted-foreground truncate mt-0.5">
                              {pair.journeyPhase.replace(/_/g, ' ')} · {pair.sessionCount} session{pair.sessionCount !== 1 ? 's' : ''}
                            </div>
                          </div>
                          {!hasBothSlack && (
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">Missing Slack</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </ScrollArea>
              </>
            )
          ) : participants.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {audienceSource === 'holding_area' || selectedCohortId
                ? 'No participants found for this selection.'
                : 'Select a cohort to see participants.'}
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={toggleAll} className="h-7 text-xs">
                  {selectedIds.size === participants.filter(p => p.slack_user_id).length ? 'Deselect all' : 'Select all'}
                </Button>
                <span className="text-xs text-muted-foreground">
                  {selectedParticipants.length} of {participants.length} selected
                </span>
              </div>

              {noSlackCount > 0 && (
                <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded px-3 py-2">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  {noSlackCount} participant{noSlackCount !== 1 ? 's' : ''} without Slack ID (cannot receive DMs)
                </div>
              )}

              <ScrollArea className="h-[350px] border rounded-md">
                <div className="divide-y">
                  {participants.map(p => (
                    <label
                      key={p.id}
                      className={`flex items-center gap-3 px-3 py-2 hover:bg-accent/50 cursor-pointer ${
                        !p.slack_user_id ? 'opacity-50' : ''
                      }`}
                    >
                      <Checkbox
                        checked={selectedIds.has(p.id)}
                        onCheckedChange={() => toggleParticipant(p.id)}
                        disabled={!p.slack_user_id}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{p.full_name}</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {p.type}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {[p.role, p.primary_capability].filter(Boolean).join(' · ') || 'No role/capability'}
                        </div>
                      </div>
                      {!p.slack_user_id && (
                        <span className="text-[10px] text-muted-foreground">No Slack</span>
                      )}
                    </label>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}
        </CardContent>
      </Card>

      {/* Right column: Message */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Send className="w-5 h-5" />
            Compose Message
          </CardTitle>
          <CardDescription>Write or select a template to send</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Template</Label>
            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_adhoc">Write ad-hoc message</SelectItem>
                {activeTemplates.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.template_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    {t.journey_phase ? ` (${t.journey_phase})` : ''}
                    {t.cohort_id ? ' [cohort]' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Message Body</Label>
            <Textarea
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              placeholder="Write your message here... Use {FIRST_NAME}, {COHORT_NAME}, etc. for personalization."
              rows={12}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Available: {'{FIRST_NAME}'}, {'{FULL_NAME}'}, {'{ROLE_TITLE}'}, {'{PRIMARY_CAPABILITY}'}, {'{MENTORING_GOAL}'}, {'{COHORT_NAME}'}, {'{ADMIN_EMAIL}'}
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setPreviewOpen(true)}
              disabled={!messageBody.trim()}
            >
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Button>
            <Button
              onClick={handleSend}
              disabled={!canSend || sending}
              className="flex-1"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Send to {audienceSource === 'cohort_pairs' ? pairRecipientCount : selectedParticipants.length} recipient{(audienceSource === 'cohort_pairs' ? pairRecipientCount : selectedParticipants.length) !== 1 ? 's' : ''}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Message Preview</DialogTitle>
            <DialogDescription>
              {audienceSource === 'cohort_pairs' && selectedPairs.length > 0
                ? `Rendered for ${selectedPairs[0].mentee.full_name}. Each recipient gets personalized placeholders.`
                : selectedParticipants.length > 0
                  ? `Rendered for ${selectedParticipants[0].full_name}. Each recipient gets personalized placeholders.`
                  : 'Rendered with sample data.'}
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted p-4 rounded-md whitespace-pre-wrap text-sm max-h-[50vh] overflow-y-auto">
            {renderPreview(messageBody, previewContext)}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
