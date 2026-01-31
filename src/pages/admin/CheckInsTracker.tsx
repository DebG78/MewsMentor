import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import {
  Plus,
  CheckCircle,
  Clock,
  AlertTriangle,
  AlertCircle,
  Loader2,
  Calendar,
  Filter,
} from 'lucide-react';
import type { CheckIn, RiskFlag, CheckInSummary } from '@/types/checkIns';
import {
  getCheckInsByCohort,
  createCheckIn,
  updateCheckIn,
  completeCheckIn,
  updateRiskFlag,
  getCheckInSummary,
} from '@/lib/checkInService';
import { getAllCohorts } from '@/lib/supabaseService';
import { cn } from '@/lib/utils';

export default function CheckInsTracker() {
  const { toast } = useToast();
  const [cohorts, setCohorts] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedCohort, setSelectedCohort] = useState<string>('');
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [summary, setSummary] = useState<CheckInSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterRisk, setFilterRisk] = useState<RiskFlag | 'all'>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCheckIn, setEditingCheckIn] = useState<CheckIn | null>(null);

  // Form state
  const [formMentorId, setFormMentorId] = useState('');
  const [formMenteeId, setFormMenteeId] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formRiskFlag, setFormRiskFlag] = useState<RiskFlag>('green');
  const [formRiskReason, setFormRiskReason] = useState('');
  const [formNextAction, setFormNextAction] = useState('');

  useEffect(() => {
    loadCohorts();
  }, []);

  useEffect(() => {
    if (selectedCohort) {
      loadCheckIns();
    }
  }, [selectedCohort]);

  const loadCohorts = async () => {
    try {
      const data = await getAllCohorts();
      setCohorts(data.map(c => ({ id: c.id, name: c.name })));
      if (data.length > 0) {
        setSelectedCohort(data[0].id);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load cohorts',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadCheckIns = async () => {
    if (!selectedCohort) return;

    setIsLoading(true);
    try {
      const [checkInsData, summaryData] = await Promise.all([
        getCheckInsByCohort(selectedCohort),
        getCheckInSummary(selectedCohort),
      ]);
      setCheckIns(checkInsData);
      setSummary(summaryData);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load check-ins',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCheckIn = async () => {
    if (!formMentorId || !formMenteeId || !formDate) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      await createCheckIn({
        cohort_id: selectedCohort,
        mentor_id: formMentorId,
        mentee_id: formMenteeId,
        check_in_date: formDate,
        notes: formNotes,
        risk_flag: formRiskFlag,
        risk_reason: formRiskReason,
        next_action: formNextAction,
      });
      toast({
        title: 'Success',
        description: 'Check-in created',
      });
      setIsCreateDialogOpen(false);
      resetForm();
      loadCheckIns();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create check-in',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateRiskFlag = async (checkIn: CheckIn, newFlag: RiskFlag) => {
    try {
      await updateRiskFlag(checkIn.id, newFlag);
      toast({
        title: 'Success',
        description: 'Risk flag updated',
      });
      loadCheckIns();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update risk flag',
        variant: 'destructive',
      });
    }
  };

  const handleCompleteCheckIn = async (checkIn: CheckIn) => {
    try {
      await completeCheckIn(checkIn.id);
      toast({
        title: 'Success',
        description: 'Check-in marked as completed',
      });
      loadCheckIns();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to complete check-in',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormMentorId('');
    setFormMenteeId('');
    setFormDate('');
    setFormNotes('');
    setFormRiskFlag('green');
    setFormRiskReason('');
    setFormNextAction('');
  };

  const getRiskBadge = (risk: RiskFlag) => {
    switch (risk) {
      case 'green':
        return <Badge className="bg-green-500">Green</Badge>;
      case 'amber':
        return <Badge className="bg-yellow-500">Amber</Badge>;
      case 'red':
        return <Badge className="bg-red-500">Red</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500">Completed</Badge>;
      case 'scheduled':
        return <Badge variant="secondary">Scheduled</Badge>;
      case 'missed':
        return <Badge className="bg-red-500">Missed</Badge>;
      case 'cancelled':
        return <Badge variant="outline">Cancelled</Badge>;
      default:
        return null;
    }
  };

  const filteredCheckIns = filterRisk === 'all'
    ? checkIns
    : checkIns.filter(c => c.risk_flag === filterRisk);

  if (isLoading && cohorts.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Check-ins Tracker</h1>
          <p className="text-muted-foreground">
            Track mentor-mentee check-ins and identify at-risk pairs
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Check-in
        </Button>
      </div>

      {/* Cohort Selector and Summary */}
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

        {summary && (
          <div className="flex gap-4">
            <Card className="w-32">
              <CardContent className="pt-4 text-center">
                <div className="text-2xl font-bold">{summary.total}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </CardContent>
            </Card>
            <Card className="w-32">
              <CardContent className="pt-4 text-center">
                <div className="text-2xl font-bold text-green-600">{summary.green}</div>
                <div className="text-xs text-muted-foreground">Green</div>
              </CardContent>
            </Card>
            <Card className="w-32">
              <CardContent className="pt-4 text-center">
                <div className="text-2xl font-bold text-yellow-600">{summary.amber}</div>
                <div className="text-xs text-muted-foreground">Amber</div>
              </CardContent>
            </Card>
            <Card className="w-32">
              <CardContent className="pt-4 text-center">
                <div className="text-2xl font-bold text-red-600">{summary.red}</div>
                <div className="text-xs text-muted-foreground">Red</div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <Label className="text-sm">Filter by risk:</Label>
        <Select value={filterRisk} onValueChange={(v) => setFilterRisk(v as RiskFlag | 'all')}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="green">Green</SelectItem>
            <SelectItem value="amber">Amber</SelectItem>
            <SelectItem value="red">Red</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Check-ins Table */}
      <Card>
        <CardHeader>
          <CardTitle>Check-ins</CardTitle>
          <CardDescription>
            {filteredCheckIns.length} check-in(s) found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : filteredCheckIns.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No check-ins found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Mentor</TableHead>
                  <TableHead>Mentee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Next Action</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCheckIns.map(checkIn => (
                  <TableRow key={checkIn.id}>
                    <TableCell>
                      {new Date(checkIn.check_in_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{checkIn.mentor_id}</TableCell>
                    <TableCell>{checkIn.mentee_id}</TableCell>
                    <TableCell>{getStatusBadge(checkIn.status)}</TableCell>
                    <TableCell>
                      <Select
                        value={checkIn.risk_flag}
                        onValueChange={(v) => handleUpdateRiskFlag(checkIn, v as RiskFlag)}
                      >
                        <SelectTrigger className="w-24 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="green">
                            <span className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-green-500" />
                              Green
                            </span>
                          </SelectItem>
                          <SelectItem value="amber">
                            <span className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-yellow-500" />
                              Amber
                            </span>
                          </SelectItem>
                          <SelectItem value="red">
                            <span className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-red-500" />
                              Red
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {checkIn.next_action || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {checkIn.status === 'scheduled' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCompleteCheckIn(checkIn)}
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Check-in Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Check-in</DialogTitle>
            <DialogDescription>
              Create a new check-in for a mentor-mentee pair
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mentor ID</Label>
                <Input
                  value={formMentorId}
                  onChange={(e) => setFormMentorId(e.target.value)}
                  placeholder="Enter mentor ID"
                />
              </div>
              <div className="space-y-2">
                <Label>Mentee ID</Label>
                <Input
                  value={formMenteeId}
                  onChange={(e) => setFormMenteeId(e.target.value)}
                  placeholder="Enter mentee ID"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Check-in Date</Label>
              <Input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Risk Flag</Label>
              <Select value={formRiskFlag} onValueChange={(v) => setFormRiskFlag(v as RiskFlag)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="green">Green - On Track</SelectItem>
                  <SelectItem value="amber">Amber - Needs Attention</SelectItem>
                  <SelectItem value="red">Red - At Risk</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Add notes..."
              />
            </div>
            <div className="space-y-2">
              <Label>Next Action</Label>
              <Input
                value={formNextAction}
                onChange={(e) => setFormNextAction(e.target.value)}
                placeholder="What's the next step?"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCheckIn}>Create Check-in</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
