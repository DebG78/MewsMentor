import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
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
  User,
  Users,
  Search,
  ArrowRight,
  Star,
  Trash2,
  Edit,
  Save,
  CheckCircle,
  MapPin,
  BookOpen,
  Briefcase,
  Eye,
  Filter,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Cohort, MenteeData, MentorData, ManualMatch, ManualMatchingOutput } from '@/types/mentoring';
import { useToast } from '@/hooks/use-toast';

interface ManualMatchingBoardProps {
  cohort: Cohort;
  onSave: (matches: ManualMatchingOutput) => Promise<void>;
  onCancel: () => void;
  existingManualMatches?: ManualMatchingOutput;
}

function getTopicOverlap(menteeTopics: string[], mentorTopics: string[]): string[] {
  return menteeTopics.filter(t =>
    mentorTopics.some(mt => mt.toLowerCase() === t.toLowerCase())
  );
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const colors = [
    'bg-red-100 text-red-800 border-red-200',
    'bg-orange-100 text-orange-800 border-orange-200',
    'bg-yellow-100 text-yellow-800 border-yellow-200',
    'bg-green-100 text-green-800 border-green-200',
    'bg-emerald-100 text-emerald-800 border-emerald-200',
  ];
  return (
    <Badge variant="outline" className={colors[confidence - 1]}>
      {Array.from({ length: confidence }, (_, i) => (
        <Star key={i} className="w-3 h-3 fill-current inline" />
      ))}
      <span className="ml-1">{confidence}/5</span>
    </Badge>
  );
}

export function ManualMatchingBoard({
  cohort,
  onSave,
  onCancel,
  existingManualMatches,
}: ManualMatchingBoardProps) {
  const { toast } = useToast();

  // Core state
  const [pairs, setPairs] = useState<ManualMatch[]>(
    existingManualMatches?.matches || []
  );
  const [selectedMenteeId, setSelectedMenteeId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isFinalized, setIsFinalized] = useState(existingManualMatches?.finalized ?? false);

  // Search state
  const [menteeSearch, setMenteeSearch] = useState('');
  const [mentorSearch, setMentorSearch] = useState('');

  // Filter state
  const [menteeFilters, setMenteeFilters] = useState<{ location: string; experience: string; role: string; seniority: string; department: string; job_grade: string }>({ location: '', experience: '', role: '', seniority: '', department: '', job_grade: '' });
  const [mentorFilters, setMentorFilters] = useState<{ location: string; experience: string; role: string; seniority: string; department: string; job_grade: string }>({ location: '', experience: '', role: '', seniority: '', department: '', job_grade: '' });
  const [showMenteeFilters, setShowMenteeFilters] = useState(false);
  const [showMentorFilters, setShowMentorFilters] = useState(false);

  // Pairing popover state
  const [pendingMentorId, setPendingMentorId] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(3);
  const [notes, setNotes] = useState('');

  // Edit state
  const [editingPairIndex, setEditingPairIndex] = useState<number | null>(null);
  const [editConfidence, setEditConfidence] = useState(3);
  const [editNotes, setEditNotes] = useState('');

  // Profile preview state
  const [previewProfile, setPreviewProfile] = useState<{ data: MenteeData | MentorData; type: 'mentee' | 'mentor' } | null>(null);

  // Compute which mentees are already paired
  const pairedMenteeIds = useMemo(
    () => new Set(pairs.map(p => p.mentee_id)),
    [pairs]
  );

  // Compute mentor capacity usage from manual pairs
  const mentorPairCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    pairs.forEach(p => {
      counts[p.mentor_id] = (counts[p.mentor_id] || 0) + 1;
    });
    return counts;
  }, [pairs]);

  // Also count AI-approved matches for capacity
  const mentorAiMatchCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (cohort.matches?.results) {
      cohort.matches.results.forEach(r => {
        if (r.proposed_assignment?.mentor_id) {
          const mid = r.proposed_assignment.mentor_id;
          counts[mid] = (counts[mid] || 0) + 1;
        }
      });
    }
    return counts;
  }, [cohort.matches]);

  // Unmatched mentees (not yet paired in manual matches)
  const unmatchedMentees = useMemo(() => {
    return cohort.mentees.filter(m => !pairedMenteeIds.has(m.id));
  }, [cohort.mentees, pairedMenteeIds]);

  // Unique filter options — computed from all mentees/mentors (not just unmatched)
  const menteeFilterOptions = useMemo(() => {
    const locations = new Set<string>();
    const experiences = new Set<string>();
    const roles = new Set<string>();
    const seniorities = new Set<string>();
    const departments = new Set<string>();
    const jobGrades = new Set<string>();
    cohort.mentees.forEach(m => {
      if (m.location_timezone) locations.add(m.location_timezone);
      if (m.experience_years) experiences.add(m.experience_years);
      if (m.role) roles.add(m.role);
      if (m.seniority_band) seniorities.add(m.seniority_band);
      if (m.department) departments.add(m.department);
      if (m.job_grade) jobGrades.add(m.job_grade);
    });
    return {
      locations: [...locations].sort(),
      experiences: [...experiences].sort((a, b) => {
        const numA = parseFloat(a);
        const numB = parseFloat(b);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.localeCompare(b);
      }),
      roles: [...roles].sort(),
      seniorities: [...seniorities].sort(),
      departments: [...departments].sort(),
      jobGrades: [...jobGrades].sort(),
    };
  }, [cohort.mentees]);

  const mentorFilterOptions = useMemo(() => {
    const locations = new Set<string>();
    const experiences = new Set<string>();
    const roles = new Set<string>();
    const seniorities = new Set<string>();
    const departments = new Set<string>();
    const jobGrades = new Set<string>();
    cohort.mentors.forEach(m => {
      if (m.location_timezone) locations.add(m.location_timezone);
      if (m.experience_years) experiences.add(m.experience_years);
      if (m.role) roles.add(m.role);
      if (m.seniority_band) seniorities.add(m.seniority_band);
      if (m.department) departments.add(m.department);
      if (m.job_grade) jobGrades.add(m.job_grade);
    });
    return {
      locations: [...locations].sort(),
      experiences: [...experiences].sort((a, b) => {
        const numA = parseFloat(a);
        const numB = parseFloat(b);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.localeCompare(b);
      }),
      roles: [...roles].sort(),
      seniorities: [...seniorities].sort(),
      departments: [...departments].sort(),
      jobGrades: [...jobGrades].sort(),
    };
  }, [cohort.mentors]);

  const menteeActiveFilterCount = Object.values(menteeFilters).filter(Boolean).length;
  const mentorActiveFilterCount = Object.values(mentorFilters).filter(Boolean).length;

  // Filtered mentees
  const filteredMentees = useMemo(() => {
    let list = unmatchedMentees;
    if (menteeFilters.location) list = list.filter(m => m.location_timezone === menteeFilters.location);
    if (menteeFilters.experience) list = list.filter(m => m.experience_years === menteeFilters.experience);
    if (menteeFilters.role) list = list.filter(m => m.role === menteeFilters.role);
    if (menteeFilters.seniority) list = list.filter(m => m.seniority_band === menteeFilters.seniority);
    if (menteeFilters.department) list = list.filter(m => m.department === menteeFilters.department);
    if (menteeFilters.job_grade) list = list.filter(m => m.job_grade === menteeFilters.job_grade);
    if (menteeSearch.trim()) {
      const q = menteeSearch.toLowerCase();
      list = list.filter(
        m =>
          (m.name || '').toLowerCase().includes(q) ||
          m.topics_to_learn.some(t => t.toLowerCase().includes(q))
      );
    }
    return list;
  }, [unmatchedMentees, menteeSearch, menteeFilters]);

  // Filtered mentors
  const filteredMentors = useMemo(() => {
    let list = cohort.mentors;
    if (mentorFilters.location) list = list.filter(m => m.location_timezone === mentorFilters.location);
    if (mentorFilters.experience) list = list.filter(m => m.experience_years === mentorFilters.experience);
    if (mentorFilters.role) list = list.filter(m => m.role === mentorFilters.role);
    if (mentorFilters.seniority) list = list.filter(m => m.seniority_band === mentorFilters.seniority);
    if (mentorFilters.department) list = list.filter(m => m.department === mentorFilters.department);
    if (mentorFilters.job_grade) list = list.filter(m => m.job_grade === mentorFilters.job_grade);
    if (mentorSearch.trim()) {
      const q = mentorSearch.toLowerCase();
      list = list.filter(
        m =>
          (m.name || '').toLowerCase().includes(q) ||
          m.topics_to_mentor.some(t => t.toLowerCase().includes(q))
      );
    }
    return list;
  }, [cohort.mentors, mentorSearch, mentorFilters]);

  // Selected mentee data
  const selectedMentee = useMemo(
    () => cohort.mentees.find(m => m.id === selectedMenteeId),
    [cohort.mentees, selectedMenteeId]
  );

  // Handle clicking a mentor to create a pair
  const handleMentorClick = (mentorId: string) => {
    if (!selectedMenteeId) return;
    setPendingMentorId(mentorId);
    setConfidence(3);
    setNotes('');
  };

  // Confirm the pairing
  const confirmPair = () => {
    if (!selectedMenteeId || !pendingMentorId) return;

    const mentee = cohort.mentees.find(m => m.id === selectedMenteeId);
    const mentor = cohort.mentors.find(m => m.id === pendingMentorId);

    const newPair: ManualMatch = {
      mentee_id: selectedMenteeId,
      mentee_name: mentee?.name,
      mentor_id: pendingMentorId,
      mentor_name: mentor?.name,
      confidence,
      notes: notes.trim() || undefined,
      created_at: new Date().toISOString(),
    };

    setPairs(prev => [...prev, newPair]);
    setIsFinalized(false);
    setSelectedMenteeId(null);
    setPendingMentorId(null);
    setConfidence(3);
    setNotes('');
  };

  // Remove a pair
  const removePair = (index: number) => {
    setPairs(prev => prev.filter((_, i) => i !== index));
    setIsFinalized(false);
  };

  // Start editing a pair
  const startEdit = (index: number) => {
    const pair = pairs[index];
    setEditingPairIndex(index);
    setEditConfidence(pair.confidence);
    setEditNotes(pair.notes || '');
  };

  // Save edit
  const saveEdit = () => {
    if (editingPairIndex === null) return;
    setPairs(prev =>
      prev.map((p, i) =>
        i === editingPairIndex
          ? { ...p, confidence: editConfidence, notes: editNotes.trim() || undefined }
          : p
      )
    );
    setEditingPairIndex(null);
  };

  // Save matches
  const handleSave = async (finalized: boolean) => {
    setIsSaving(true);
    try {
      const output: ManualMatchingOutput = {
        matches: pairs,
        created_at: existingManualMatches?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        finalized,
      };
      await onSave(output);
      setIsFinalized(finalized);
      toast({
        title: finalized ? 'Manual matches finalized' : 'Draft saved',
        description: `${pairs.length} pair${pairs.length !== 1 ? 's' : ''} saved`,
      });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Failed to save',
        description: 'Please try again',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getEffectiveCapacity = (mentor: MentorData) => {
    const manualUsed = mentorPairCounts[mentor.id] || 0;
    const aiUsed = mentorAiMatchCounts[mentor.id] || 0;
    return mentor.capacity_remaining - aiUsed - manualUsed;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Manual Matching</h2>
          <p className="text-sm text-muted-foreground">
            Click a mentee, then click a mentor to create a pair. Rate your confidence in each match.
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>Unmatched: {unmatchedMentees.length}</span>
          <span>Paired: {pairs.length}</span>
          <span>Total mentees: {cohort.mentees.length}</span>
        </div>
      </div>

      {/* Two-panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Mentees */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4" />
                Mentees
                <Badge variant="secondary">{unmatchedMentees.length} unmatched</Badge>
              </CardTitle>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or topic..."
                  value={menteeSearch}
                  onChange={e => setMenteeSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Button
                variant={showMenteeFilters ? 'default' : 'outline'}
                size="sm"
                className="shrink-0 h-9"
                onClick={() => setShowMenteeFilters(v => !v)}
              >
                <Filter className="w-4 h-4 mr-1" />
                Filters
                {menteeActiveFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full">
                    {menteeActiveFilterCount}
                  </Badge>
                )}
              </Button>
            </div>
            {showMenteeFilters && (
              <div className="mt-2 p-3 border rounded-md bg-muted/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Filters</span>
                  {menteeActiveFilterCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs px-2"
                      onClick={() => setMenteeFilters({ location: '', experience: '', role: '', seniority: '', department: '', job_grade: '' })}
                    >
                      <X className="w-3 h-3 mr-1" /> Clear all
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {menteeFilterOptions.locations.length > 1 && (
                    <Select value={menteeFilters.location} onValueChange={v => setMenteeFilters(f => ({ ...f, location: v === '_all' ? '' : v }))}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Location" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_all">All locations</SelectItem>
                        {menteeFilterOptions.locations.map(loc => (
                          <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {menteeFilterOptions.experiences.length > 1 && (
                    <Select value={menteeFilters.experience} onValueChange={v => setMenteeFilters(f => ({ ...f, experience: v === '_all' ? '' : v }))}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Experience" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_all">All experience</SelectItem>
                        {menteeFilterOptions.experiences.map(exp => (
                          <SelectItem key={exp} value={exp}>{exp}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {menteeFilterOptions.roles.length > 1 && (
                    <Select value={menteeFilters.role} onValueChange={v => setMenteeFilters(f => ({ ...f, role: v === '_all' ? '' : v }))}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Department / Role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_all">All roles</SelectItem>
                        {menteeFilterOptions.roles.map(role => (
                          <SelectItem key={role} value={role}>{role}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {menteeFilterOptions.seniorities.length > 1 && (
                    <Select value={menteeFilters.seniority} onValueChange={v => setMenteeFilters(f => ({ ...f, seniority: v === '_all' ? '' : v }))}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Seniority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_all">All seniority</SelectItem>
                        {menteeFilterOptions.seniorities.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {menteeFilterOptions.departments.length > 1 && (
                    <Select value={menteeFilters.department} onValueChange={v => setMenteeFilters(f => ({ ...f, department: v === '_all' ? '' : v }))}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_all">All departments</SelectItem>
                        {menteeFilterOptions.departments.map(d => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {menteeFilterOptions.jobGrades.length > 1 && (
                    <Select value={menteeFilters.job_grade} onValueChange={v => setMenteeFilters(f => ({ ...f, job_grade: v === '_all' ? '' : v }))}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Job Grade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_all">All grades</SelectItem>
                        {menteeFilterOptions.jobGrades.map(g => (
                          <SelectItem key={g} value={g}>{g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-2 pr-4">
                {filteredMentees.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {unmatchedMentees.length === 0
                      ? 'All mentees have been paired'
                      : 'No mentees match your filters'}
                  </p>
                ) : (
                  filteredMentees.map(mentee => (
                    <div
                      key={mentee.id}
                      onClick={() =>
                        setSelectedMenteeId(prev =>
                          prev === mentee.id ? null : mentee.id
                        )
                      }
                      className={cn(
                        'p-3 border rounded-lg cursor-pointer transition-all',
                        'hover:border-primary/50 hover:bg-accent/50',
                        selectedMenteeId === mentee.id &&
                          'border-primary bg-primary/5 ring-2 ring-primary/20'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-sm truncate">
                              {mentee.name || mentee.id}
                            </h4>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 shrink-0"
                              onClick={e => {
                                e.stopPropagation();
                                setPreviewProfile({ data: mentee, type: 'mentee' });
                              }}
                            >
                              <Eye className="w-3 h-3" />
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {mentee.role}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {mentee.primary_capability ? (
                          <>
                            <Badge variant="default" className="text-xs">
                              <BookOpen className="w-2.5 h-2.5 mr-0.5" />
                              {mentee.primary_capability}
                            </Badge>
                            {mentee.secondary_capability && (
                              <Badge variant="outline" className="text-xs">
                                {mentee.secondary_capability}
                              </Badge>
                            )}
                          </>
                        ) : (
                          <>
                            {mentee.topics_to_learn.slice(0, 3).map(topic => (
                              <Badge
                                key={topic}
                                variant="outline"
                                className="text-xs"
                              >
                                <BookOpen className="w-2.5 h-2.5 mr-0.5" />
                                {topic}
                              </Badge>
                            ))}
                            {mentee.topics_to_learn.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{mentee.topics_to_learn.length - 3}
                              </Badge>
                            )}
                          </>
                        )}
                      </div>
                      {mentee.location_timezone && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="w-3 h-3" />
                          {mentee.location_timezone}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Right: Mentors */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4" />
                Mentors
                <Badge variant="secondary">{cohort.mentors.length}</Badge>
              </CardTitle>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or topic..."
                  value={mentorSearch}
                  onChange={e => setMentorSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Button
                variant={showMentorFilters ? 'default' : 'outline'}
                size="sm"
                className="shrink-0 h-9"
                onClick={() => setShowMentorFilters(v => !v)}
              >
                <Filter className="w-4 h-4 mr-1" />
                Filters
                {mentorActiveFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full">
                    {mentorActiveFilterCount}
                  </Badge>
                )}
              </Button>
            </div>
            {showMentorFilters && (
              <div className="mt-2 p-3 border rounded-md bg-muted/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Filters</span>
                  {mentorActiveFilterCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs px-2"
                      onClick={() => setMentorFilters({ location: '', experience: '', role: '', seniority: '', department: '', job_grade: '' })}
                    >
                      <X className="w-3 h-3 mr-1" /> Clear all
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {mentorFilterOptions.locations.length > 1 && (
                    <Select value={mentorFilters.location} onValueChange={v => setMentorFilters(f => ({ ...f, location: v === '_all' ? '' : v }))}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Location" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_all">All locations</SelectItem>
                        {mentorFilterOptions.locations.map(loc => (
                          <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {mentorFilterOptions.experiences.length > 1 && (
                    <Select value={mentorFilters.experience} onValueChange={v => setMentorFilters(f => ({ ...f, experience: v === '_all' ? '' : v }))}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Experience" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_all">All experience</SelectItem>
                        {mentorFilterOptions.experiences.map(exp => (
                          <SelectItem key={exp} value={exp}>{exp}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {mentorFilterOptions.roles.length > 1 && (
                    <Select value={mentorFilters.role} onValueChange={v => setMentorFilters(f => ({ ...f, role: v === '_all' ? '' : v }))}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Department / Role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_all">All roles</SelectItem>
                        {mentorFilterOptions.roles.map(role => (
                          <SelectItem key={role} value={role}>{role}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {mentorFilterOptions.seniorities.length > 1 && (
                    <Select value={mentorFilters.seniority} onValueChange={v => setMentorFilters(f => ({ ...f, seniority: v === '_all' ? '' : v }))}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Seniority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_all">All seniority</SelectItem>
                        {mentorFilterOptions.seniorities.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {mentorFilterOptions.departments.length > 1 && (
                    <Select value={mentorFilters.department} onValueChange={v => setMentorFilters(f => ({ ...f, department: v === '_all' ? '' : v }))}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_all">All departments</SelectItem>
                        {mentorFilterOptions.departments.map(d => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {mentorFilterOptions.jobGrades.length > 1 && (
                    <Select value={mentorFilters.job_grade} onValueChange={v => setMentorFilters(f => ({ ...f, job_grade: v === '_all' ? '' : v }))}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Job Grade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_all">All grades</SelectItem>
                        {mentorFilterOptions.jobGrades.map(g => (
                          <SelectItem key={g} value={g}>{g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            )}
            {selectedMentee && (
              <div className="mt-2 p-2 bg-primary/5 rounded-md text-xs">
                <span className="font-medium">Selecting for:</span>{' '}
                {selectedMentee.name} — looking for:{' '}
                {selectedMentee.primary_capability || selectedMentee.topics_to_learn.join(', ')}
              </div>
            )}
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-2 pr-4">
                {filteredMentors.map(mentor => {
                  const effectiveCap = getEffectiveCapacity(mentor);
                  const isFull = effectiveCap <= 0;
                  const topicOverlap = selectedMentee
                    ? getTopicOverlap(
                        selectedMentee.topics_to_learn,
                        mentor.topics_to_mentor
                      )
                    : [];
                  const hasOverlap = topicOverlap.length > 0;

                  return (
                    <Popover
                      key={mentor.id}
                      open={pendingMentorId === mentor.id}
                      onOpenChange={open => {
                        if (!open) setPendingMentorId(null);
                      }}
                    >
                      <PopoverTrigger asChild>
                        <div
                          onClick={() => handleMentorClick(mentor.id)}
                          className={cn(
                            'p-3 border rounded-lg transition-all',
                            selectedMenteeId
                              ? 'cursor-pointer hover:border-primary/50 hover:bg-accent/50'
                              : 'cursor-default',
                            selectedMenteeId &&
                              hasOverlap &&
                              'border-green-300 bg-green-50/50',
                            isFull && 'opacity-50'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                              <User className="w-4 h-4 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium text-sm truncate">
                                  {mentor.name || mentor.id}
                                </h4>
                                <div className="flex items-center gap-2 shrink-0">
                                  <Badge
                                    variant={isFull ? 'destructive' : 'secondary'}
                                    className="text-xs"
                                  >
                                    {effectiveCap}/{mentor.capacity_remaining} slots
                                  </Badge>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={e => {
                                      e.stopPropagation();
                                      setPreviewProfile({ data: mentor, type: 'mentor' });
                                    }}
                                  >
                                    <Eye className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground truncate">
                                {mentor.role}
                              </p>
                            </div>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {mentor.primary_capability ? (
                              <>
                                <Badge
                                  variant={topicOverlap.some(t => t.toLowerCase() === mentor.primary_capability!.toLowerCase()) ? 'default' : 'outline'}
                                  className={cn(
                                    'text-xs',
                                    topicOverlap.some(t => t.toLowerCase() === mentor.primary_capability!.toLowerCase()) && 'bg-green-600 hover:bg-green-600'
                                  )}
                                >
                                  <Briefcase className="w-2.5 h-2.5 mr-0.5" />
                                  {mentor.primary_capability}
                                </Badge>
                                {(mentor.secondary_capabilities || []).slice(0, 2).map(cap => {
                                  const isShared = topicOverlap.some(t => t.toLowerCase() === cap.toLowerCase());
                                  return (
                                    <Badge key={cap} variant={isShared ? 'default' : 'outline'} className={cn('text-xs', isShared && 'bg-green-600 hover:bg-green-600')}>
                                      {cap}
                                    </Badge>
                                  );
                                })}
                                {(mentor.secondary_capabilities || []).length > 2 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{mentor.secondary_capabilities!.length - 2}
                                  </Badge>
                                )}
                              </>
                            ) : (
                              <>
                                {mentor.topics_to_mentor.slice(0, 3).map(topic => {
                                  const isShared = topicOverlap.some(
                                    t => t.toLowerCase() === topic.toLowerCase()
                                  );
                                  return (
                                    <Badge
                                      key={topic}
                                      variant={isShared ? 'default' : 'outline'}
                                      className={cn(
                                        'text-xs',
                                        isShared && 'bg-green-600 hover:bg-green-600'
                                      )}
                                    >
                                      <Briefcase className="w-2.5 h-2.5 mr-0.5" />
                                      {topic}
                                    </Badge>
                                  );
                                })}
                                {mentor.topics_to_mentor.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{mentor.topics_to_mentor.length - 3}
                                  </Badge>
                                )}
                              </>
                            )}
                          </div>
                          {mentor.location_timezone && (
                            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="w-3 h-3" />
                              {mentor.location_timezone}
                            </div>
                          )}
                          {selectedMenteeId && hasOverlap && (
                            <div className="mt-1 text-xs text-green-700 font-medium">
                              {topicOverlap.length} shared topic{topicOverlap.length !== 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                      </PopoverTrigger>
                      <PopoverContent className="w-80" align="start">
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-medium text-sm mb-1">
                              Create pair
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              {selectedMentee?.name} <ArrowRight className="w-3 h-3 inline" />{' '}
                              {mentor.name}
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium">
                              Confidence: {confidence}/5
                            </label>
                            <Slider
                              value={[confidence]}
                              onValueChange={v => setConfidence(v[0])}
                              min={1}
                              max={5}
                              step={1}
                              className="mt-2"
                            />
                            <div className="flex justify-between text-xs text-muted-foreground mt-1">
                              <span>Low</span>
                              <span>High</span>
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium">
                              Notes (optional)
                            </label>
                            <Textarea
                              value={notes}
                              onChange={e => setNotes(e.target.value)}
                              placeholder="Why this pair works..."
                              className="mt-1"
                              rows={2}
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => setPendingMentorId(null)}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              className="flex-1"
                              onClick={confirmPair}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Pair
                            </Button>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Paired Matches */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Paired Matches
            <Badge variant="secondary">{pairs.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pairs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No pairs yet. Select a mentee on the left, then click a mentor on the right to create a pair.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mentee</TableHead>
                  <TableHead className="text-center">
                    <ArrowRight className="w-4 h-4 mx-auto" />
                  </TableHead>
                  <TableHead>Mentor</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pairs.map((pair, index) => (
                  <TableRow key={`${pair.mentee_id}-${pair.mentor_id}`}>
                    <TableCell className="font-medium">
                      {pair.mentee_name || pair.mentee_id}
                    </TableCell>
                    <TableCell className="text-center">
                      <ArrowRight className="w-4 h-4 mx-auto text-muted-foreground" />
                    </TableCell>
                    <TableCell>{pair.mentor_name || pair.mentor_id}</TableCell>
                    <TableCell>
                      <ConfidenceBadge confidence={pair.confidence} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {pair.notes || '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => startEdit(index)}
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                          onClick={() => removePair(index)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Action buttons */}
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <div className="flex gap-2 items-center">
          {isFinalized && (
            <Badge className="bg-green-100 text-green-800 border-green-200 mr-2">
              <CheckCircle className="w-3 h-3 mr-1" />
              Finalized
            </Badge>
          )}
          <Button
            variant="outline"
            onClick={() => handleSave(false)}
            disabled={pairs.length === 0 || isSaving}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Draft
          </Button>
          {!isFinalized && (
            <Button
              onClick={() => handleSave(true)}
              disabled={pairs.length === 0 || isSaving}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Finalize ({pairs.length} pair{pairs.length !== 1 ? 's' : ''})
            </Button>
          )}
        </div>
      </div>

      {/* Edit pair dialog */}
      <Dialog
        open={editingPairIndex !== null}
        onOpenChange={open => {
          if (!open) setEditingPairIndex(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Pair</DialogTitle>
          </DialogHeader>
          {editingPairIndex !== null && pairs[editingPairIndex] && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {pairs[editingPairIndex].mentee_name}{' '}
                <ArrowRight className="w-3 h-3 inline" />{' '}
                {pairs[editingPairIndex].mentor_name}
              </p>
              <div>
                <label className="text-sm font-medium">
                  Confidence: {editConfidence}/5
                </label>
                <Slider
                  value={[editConfidence]}
                  onValueChange={v => setEditConfidence(v[0])}
                  min={1}
                  max={5}
                  step={1}
                  className="mt-2"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Notes</label>
                <Textarea
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  placeholder="Why this pair works..."
                  className="mt-1"
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setEditingPairIndex(null)}
                >
                  Cancel
                </Button>
                <Button className="flex-1" onClick={saveEdit}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Profile preview dialog */}
      <Dialog
        open={previewProfile !== null}
        onOpenChange={open => {
          if (!open) setPreviewProfile(null);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center',
                previewProfile?.type === 'mentee' ? 'bg-green-100' : 'bg-blue-100'
              )}>
                <User className={cn(
                  'w-4 h-4',
                  previewProfile?.type === 'mentee' ? 'text-green-600' : 'text-blue-600'
                )} />
              </div>
              {previewProfile?.type === 'mentee' ? 'Mentee' : 'Mentor'} Profile
            </DialogTitle>
          </DialogHeader>
          {previewProfile?.type === 'mentee' && (() => {
            const m = previewProfile.data as MenteeData;
            const hasNewFields = !!(m.primary_capability || m.mentoring_goal);
            return (
              <div className="space-y-5">
                <div>
                  <h3 className="font-semibold text-lg">{m.name || m.id}</h3>
                  <p className="text-muted-foreground">{m.role}</p>
                  {m.pronouns && <p className="text-sm text-muted-foreground">{m.pronouns}</p>}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                  {m.seniority_band && (
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span><span className="font-medium">Level:</span> {m.seniority_band}</span>
                    </div>
                  )}
                  {!m.seniority_band && m.experience_years && (
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span><span className="font-medium">Experience:</span> {m.experience_years}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span>{m.location_timezone}</span>
                  </div>
                  {m.email && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Email:</span> {m.email}
                    </div>
                  )}
                  {m.has_participated_before !== undefined && (
                    <div className="col-span-2 sm:col-span-3">
                      <Badge variant={m.has_participated_before ? 'default' : 'outline'} className="text-xs">
                        {m.has_participated_before ? 'Returning participant' : 'First-time participant'}
                      </Badge>
                    </div>
                  )}
                </div>

                {m.bio && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Bio</span>
                    <p className="text-sm mt-0.5">{m.bio}</p>
                  </div>
                )}

                {hasNewFields ? (
                  <>
                    <div>
                      <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                        <BookOpen className="w-4 h-4" /> Capabilities to Build
                      </h4>
                      <div className="space-y-2">
                        {m.primary_capability && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="default">{m.primary_capability}</Badge>
                            <span className="text-xs text-muted-foreground">Primary</span>
                            {m.primary_proficiency && (
                              <span className="text-xs text-muted-foreground">(Proficiency: {m.primary_proficiency}/4)</span>
                            )}
                          </div>
                        )}
                        {m.primary_capability_detail && (
                          <p className="text-xs text-muted-foreground ml-2">{m.primary_capability_detail}</p>
                        )}
                        {m.secondary_capability && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline">{m.secondary_capability}</Badge>
                            <span className="text-xs text-muted-foreground">Secondary</span>
                            {m.secondary_proficiency && (
                              <span className="text-xs text-muted-foreground">(Proficiency: {m.secondary_proficiency}/4)</span>
                            )}
                          </div>
                        )}
                        {m.secondary_capability_detail && (
                          <p className="text-xs text-muted-foreground ml-2">{m.secondary_capability_detail}</p>
                        )}
                      </div>
                    </div>

                    {m.mentoring_goal && (
                      <div>
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Mentoring Goal</span>
                        <p className="text-sm mt-0.5">{m.mentoring_goal}</p>
                      </div>
                    )}

                    {m.practice_scenarios && m.practice_scenarios.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2">Practice Scenarios</h4>
                        <div className="flex flex-wrap gap-1">
                          {m.practice_scenarios.map(s => (
                            <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div>
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <BookOpen className="w-4 h-4" /> Topics to Learn
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {m.topics_to_learn.map(topic => (
                        <Badge key={topic} variant="outline">{topic}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {hasNewFields ? (
                  (m.mentor_help_wanted || m.preferred_style || m.feedback_preference || m.mentor_experience_importance) && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm">Mentoring Preferences</h4>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        {m.preferred_style && (
                          <div>
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Session Style</span>
                            <p className="mt-0.5">{m.preferred_style}</p>
                          </div>
                        )}
                        {m.feedback_preference && (
                          <div>
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Feedback Style</span>
                            <p className="mt-0.5">{m.feedback_preference}</p>
                          </div>
                        )}
                        {m.mentor_experience_importance && (
                          <div className="col-span-2">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Open to First-Time Mentor?</span>
                            <p className="mt-0.5">{m.mentor_experience_importance}</p>
                          </div>
                        )}
                        {m.mentor_help_wanted && m.mentor_help_wanted.length > 0 && (
                          <div className="col-span-2">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Kind of Mentor Help Wanted</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {m.mentor_help_wanted.map(h => (
                                <Badge key={h} variant="outline" className="text-xs">{h}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                ) : (
                  (m.preferred_mentor_style || m.preferred_mentor_energy || m.feedback_preference || m.mentor_experience_importance || m.what_not_wanted || m.meeting_frequency || m.desired_qualities) && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm">Mentoring Preferences</h4>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        {m.preferred_mentor_style && (
                          <div>
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Preferred Style</span>
                            <p className="mt-0.5">{m.preferred_mentor_style}</p>
                          </div>
                        )}
                        {m.preferred_mentor_energy && (
                          <div>
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Preferred Energy</span>
                            <p className="mt-0.5">{m.preferred_mentor_energy}</p>
                          </div>
                        )}
                        {m.feedback_preference && (
                          <div>
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Feedback Preference</span>
                            <p className="mt-0.5">{m.feedback_preference}</p>
                          </div>
                        )}
                        {m.meeting_frequency && (
                          <div>
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Meeting Frequency</span>
                            <p className="mt-0.5">{m.meeting_frequency}</p>
                          </div>
                        )}
                        {m.mentor_experience_importance && (
                          <div className="col-span-2">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">How Important Is Mentor Experience?</span>
                            <p className="mt-0.5">{m.mentor_experience_importance}</p>
                          </div>
                        )}
                        {m.desired_qualities && (
                          <div className="col-span-2">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Desired Qualities in a Mentor</span>
                            <p className="mt-0.5">{m.desired_qualities}</p>
                          </div>
                        )}
                        {m.what_not_wanted && (
                          <div className="col-span-2">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">What They Don't Want</span>
                            <p className="mt-0.5 text-red-700">{m.what_not_wanted}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                )}

                {!hasNewFields && (m.motivation || m.main_reason || m.goals_text || m.expectations) && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm">What They Want</h4>
                    {m.motivation && (
                      <div>
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Motivation</span>
                        <p className="text-sm mt-0.5">{m.motivation}</p>
                      </div>
                    )}
                    {m.main_reason && (
                      <div>
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Main Reason</span>
                        <p className="text-sm mt-0.5">{m.main_reason}</p>
                      </div>
                    )}
                    {m.goals_text && (
                      <div>
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Goals</span>
                        <p className="text-sm mt-0.5">{m.goals_text}</p>
                      </div>
                    )}
                    {m.expectations && (
                      <div>
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Expectations</span>
                        <p className="text-sm mt-0.5">{m.expectations}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
          {previewProfile?.type === 'mentor' && (() => {
            const m = previewProfile.data as MentorData;
            const hasNewFields = !!(m.primary_capability || m.mentor_motivation);
            return (
              <div className="space-y-5">
                <div>
                  <h3 className="font-semibold text-lg">{m.name || m.id}</h3>
                  <p className="text-muted-foreground">{m.role}</p>
                  {m.pronouns && <p className="text-sm text-muted-foreground">{m.pronouns}</p>}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                  {m.seniority_band && (
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span><span className="font-medium">Level:</span> {m.seniority_band}</span>
                    </div>
                  )}
                  {!m.seniority_band && m.experience_years && (
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span><span className="font-medium">Experience:</span> {m.experience_years}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span>{m.location_timezone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span><span className="font-medium">Capacity:</span> {m.capacity_remaining} slots</span>
                  </div>
                  {m.email && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Email:</span> {m.email}
                    </div>
                  )}
                  <div>
                    <Badge variant={m.has_mentored_before ? 'default' : 'outline'} className="text-xs">
                      {m.has_mentored_before ? 'Experienced mentor' : 'First-time mentor'}
                    </Badge>
                  </div>
                  {m.mentoring_experience && (
                    <div className="col-span-2 sm:col-span-3 text-xs text-muted-foreground">
                      {m.mentoring_experience}
                    </div>
                  )}
                </div>

                {(m.bio || m.bio_text) && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Bio</span>
                    <p className="text-sm mt-0.5">{m.bio || m.bio_text}</p>
                  </div>
                )}

                {hasNewFields ? (
                  <>
                    <div>
                      <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                        <BookOpen className="w-4 h-4" /> Capabilities to Mentor
                      </h4>
                      <div className="space-y-2">
                        {m.primary_capability && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="default">{m.primary_capability}</Badge>
                            <span className="text-xs text-muted-foreground">Primary</span>
                            {m.primary_proficiency && (
                              <span className="text-xs text-muted-foreground">(Proficiency: {m.primary_proficiency}/5)</span>
                            )}
                          </div>
                        )}
                        {m.primary_capability_detail && (
                          <p className="text-xs text-muted-foreground ml-2">{m.primary_capability_detail}</p>
                        )}
                        {m.secondary_capabilities && m.secondary_capabilities.length > 0 && (
                          <div className="flex items-center gap-2 flex-wrap">
                            {m.secondary_capabilities.map(cap => (
                              <Badge key={cap} variant="outline">{cap}</Badge>
                            ))}
                            <span className="text-xs text-muted-foreground">Secondary</span>
                          </div>
                        )}
                        {m.secondary_capability_detail && (
                          <p className="text-xs text-muted-foreground ml-2">{m.secondary_capability_detail}</p>
                        )}
                      </div>
                    </div>

                    {m.mentor_motivation && (
                      <div>
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Why They Want to Mentor</span>
                        <p className="text-sm mt-0.5">{m.mentor_motivation}</p>
                      </div>
                    )}

                    {m.hard_earned_lesson && (
                      <div>
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Hard-Earned Lesson</span>
                        <p className="text-sm mt-0.5">{m.hard_earned_lesson}</p>
                      </div>
                    )}

                    {m.natural_strengths && m.natural_strengths.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2">Natural Strengths</h4>
                        <div className="flex flex-wrap gap-1">
                          {m.natural_strengths.map(s => (
                            <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {m.practice_scenarios && m.practice_scenarios.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2">Practice Scenarios</h4>
                        <div className="flex flex-wrap gap-1">
                          {m.practice_scenarios.map(s => (
                            <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {m.excluded_scenarios && m.excluded_scenarios.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2 text-red-700">Scenarios They Prefer Not to Support</h4>
                        <div className="flex flex-wrap gap-1">
                          {m.excluded_scenarios.map(s => (
                            <Badge key={s} variant="outline" className="border-red-200 text-red-700 text-xs">{s}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {m.match_exclusions && (
                      <div>
                        <span className="text-xs font-medium text-red-700 uppercase tracking-wide">Match Exclusions</span>
                        <p className="text-sm mt-0.5 text-red-700">{m.match_exclusions}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div>
                      <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                        <BookOpen className="w-4 h-4" /> Topics to Mentor
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {m.topics_to_mentor.map(topic => (
                          <Badge key={topic} variant="outline">{topic}</Badge>
                        ))}
                      </div>
                    </div>

                    {m.topics_not_to_mentor && m.topics_not_to_mentor.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2 text-red-700">Topics They Don't Want to Mentor</h4>
                        <div className="flex flex-wrap gap-1">
                          {m.topics_not_to_mentor.map(topic => (
                            <Badge key={topic} variant="outline" className="border-red-200 text-red-700 text-xs">{topic}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Mentoring Approach</h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    {m.meeting_style && (
                      <div>
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Session Style</span>
                        <p className="mt-0.5">{m.meeting_style}</p>
                      </div>
                    )}
                    {m.mentoring_style && (
                      <div>
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Mentoring Style</span>
                        <p className="mt-0.5">{m.mentoring_style}</p>
                      </div>
                    )}
                    {m.first_time_support && m.first_time_support.length > 0 && (
                      <div className="col-span-2">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">First-Time Support Needed</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {m.first_time_support.map(s => (
                            <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {!hasNewFields && (m.motivation || m.expectations) && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm">About</h4>
                    {m.motivation && (
                      <div>
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Motivation</span>
                        <p className="text-sm mt-0.5">{m.motivation}</p>
                      </div>
                    )}
                    {m.expectations && (
                      <div>
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Expectations</span>
                        <p className="text-sm mt-0.5">{m.expectations}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
