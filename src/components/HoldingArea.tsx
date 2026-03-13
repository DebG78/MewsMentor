import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Users,
  Target,
  MoreHorizontal,
  Eye,
  Trash2,
  Clock,
  Search,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { toDisplayName } from '@/lib/displayName';
import { getUnassignedSignups, assignToCohort, getAllCohorts } from "@/lib/cohortManager";
import { deleteUnassignedPerson } from "@/lib/supabaseService";
import { Cohort } from "@/types/mentoring";

import type { Database } from '@/types/database';

type MenteeRow = Database['public']['Tables']['mentees']['Row'];
type MentorRow = Database['public']['Tables']['mentors']['Row'];

export function HoldingArea() {
  const [unassignedMentees, setUnassignedMentees] = useState<MenteeRow[]>([]);
  const [unassignedMentors, setUnassignedMentors] = useState<MentorRow[]>([]);
  const [availableCohorts, setAvailableCohorts] = useState<Cohort[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [assigningPersonId, setAssigningPersonId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; type: 'mentee' | 'mentor' } | null>(null);
  const [selectedMentees, setSelectedMentees] = useState<Set<string>>(new Set());
  const [selectedMentors, setSelectedMentors] = useState<Set<string>>(new Set());
  const [bulkDeleteTarget, setBulkDeleteTarget] = useState<{ ids: { id: string; name: string }[]; type: 'mentee' | 'mentor' } | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [unassigned, cohorts] = await Promise.all([
        getUnassignedSignups(),
        getAllCohorts()
      ]);

      console.log('Unassigned mentees loaded:', unassigned.mentees.length, unassigned.mentees);
      console.log('Unassigned mentors loaded:', unassigned.mentors.length, unassigned.mentors);

      setUnassignedMentees(unassigned.mentees);
      setUnassignedMentors(unassigned.mentors);
      setAvailableCohorts(cohorts.filter(c => c.status === 'active' || c.status === 'draft'));
    } catch (error) {
      console.error('Error loading holding area data:', error);
      toast({
        variant: "destructive",
        title: "Failed to load data",
        description: "Please refresh the page to try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAssignToCohort = async (
    personId: string,
    personType: 'mentee' | 'mentor',
    cohortId: string
  ) => {
    setAssigningPersonId(personId);
    try {
      const result = await assignToCohort(personId, personType, cohortId);

      if (result.success) {
        toast({
          title: "Assignment Successful!",
          description: `${personType === 'mentee' ? 'Mentee' : 'Mentor'} has been assigned to the cohort.`,
        });

        // Reload data to reflect changes
        await loadData();
      } else {
        throw new Error(result.error || "Assignment failed");
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Assignment Failed",
        description: "Failed to assign to cohort. Please try again.",
      });
    } finally {
      setAssigningPersonId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const success = await deleteUnassignedPerson(deleteTarget.id, deleteTarget.type);
      if (success) {
        toast({
          title: "Deleted",
          description: `${deleteTarget.name} has been removed from the holding area.`,
        });
        await loadData();
      } else {
        throw new Error("Delete failed");
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: "Could not delete this person. Please try again.",
      });
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleBulkDelete = async () => {
    if (!bulkDeleteTarget) return;
    setIsBulkDeleting(true);
    try {
      const results = await Promise.all(
        bulkDeleteTarget.ids.map(({ id }) => deleteUnassignedPerson(id, bulkDeleteTarget.type))
      );
      const successCount = results.filter(Boolean).length;
      const failCount = results.length - successCount;
      if (successCount > 0) {
        toast({
          title: "Deleted",
          description: `${successCount} ${bulkDeleteTarget.type}${successCount !== 1 ? 's' : ''} removed.${failCount > 0 ? ` ${failCount} failed.` : ''}`,
        });
        if (bulkDeleteTarget.type === 'mentee') setSelectedMentees(new Set());
        else setSelectedMentors(new Set());
        await loadData();
      } else {
        throw new Error("All deletes failed");
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: "Could not delete selected profiles. Please try again.",
      });
    } finally {
      setBulkDeleteTarget(null);
      setIsBulkDeleting(false);
    }
  };

  const toggleMenteeSelection = (menteeId: string) => {
    setSelectedMentees(prev => {
      const next = new Set(prev);
      if (next.has(menteeId)) next.delete(menteeId);
      else next.add(menteeId);
      return next;
    });
  };

  const toggleMentorSelection = (mentorId: string) => {
    setSelectedMentors(prev => {
      const next = new Set(prev);
      if (next.has(mentorId)) next.delete(mentorId);
      else next.add(mentorId);
      return next;
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTopics = (topics: string[]) => {
    if (topics.length <= 2) return topics.join(', ');
    return `${topics.slice(0, 2).join(', ')} +${topics.length - 2} more`;
  };

  const term = searchTerm.toLowerCase();
  const filteredMentees = term
    ? unassignedMentees.filter((m) =>
        [m.full_name, m.mentee_id, m.role, m.location_timezone, ...(m.topics_to_learn || [])]
          .filter(Boolean)
          .some((v) => v!.toLowerCase().includes(term))
      )
    : unassignedMentees;
  const filteredMentors = term
    ? unassignedMentors.filter((m) =>
        [m.full_name, m.mentor_id, m.role, m.location_timezone, ...(m.topics_to_mentor || [])]
          .filter(Boolean)
          .some((v) => v!.toLowerCase().includes(term))
      )
    : unassignedMentors;

  const allMenteesSelected = filteredMentees.length > 0 && filteredMentees.every(m => selectedMentees.has(m.mentee_id));
  const someMenteesSelected = filteredMentees.some(m => selectedMentees.has(m.mentee_id));
  const allMentorsSelected = filteredMentors.length > 0 && filteredMentors.every(m => selectedMentors.has(m.mentor_id));
  const someMentorsSelected = filteredMentors.some(m => selectedMentors.has(m.mentor_id));

  const toggleAllMentees = (checked: boolean) => {
    if (checked) {
      setSelectedMentees(new Set(filteredMentees.map(m => m.mentee_id)));
    } else {
      setSelectedMentees(new Set());
    }
  };

  const toggleAllMentors = (checked: boolean) => {
    if (checked) {
      setSelectedMentors(new Set(filteredMentors.map(m => m.mentor_id)));
    } else {
      setSelectedMentors(new Set());
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading unassigned signups...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Pending Cohort Assignment
              </CardTitle>
              <CardDescription>
                People who have signed up but haven't been assigned to a cohort yet.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="mentees" className="w-full">
            <div className="flex items-center gap-3 mb-4">
              <TabsList>
                <TabsTrigger value="mentees">
                  Mentees ({unassignedMentees.length})
                </TabsTrigger>
                <TabsTrigger value="mentors">
                  Mentors ({unassignedMentors.length})
                </TabsTrigger>
              </TabsList>
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, role, topic..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9 text-sm pl-8"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <TabsContent value="mentees" className="space-y-4">
              {selectedMentees.size > 0 && (
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <span className="text-sm font-medium">{selectedMentees.size} selected</span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      const targets = filteredMentees
                        .filter(m => selectedMentees.has(m.mentee_id))
                        .map(m => ({ id: m.mentee_id, name: toDisplayName(m.full_name || m.mentee_id) }));
                      setBulkDeleteTarget({ ids: targets, type: 'mentee' });
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete Selected
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedMentees(new Set())}>
                    Clear Selection
                  </Button>
                </div>
              )}
              {filteredMentees.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <h4 className="text-lg font-semibold mb-2">
                    {searchTerm ? "No matching mentees" : "No Unassigned Mentees"}
                  </h4>
                  <p>{searchTerm ? "Try a different search term." : "All mentees have been assigned to cohorts."}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={allMenteesSelected ? true : someMenteesSelected ? "indeterminate" : false}
                          onCheckedChange={(checked) => toggleAllMentees(!!checked)}
                        />
                      </TableHead>
                      <TableHead>Name/ID</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Experience</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Topics</TableHead>
                      <TableHead>Signed Up</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMentees.map((mentee) => (
                      <TableRow key={mentee.id} className={selectedMentees.has(mentee.mentee_id) ? "bg-muted/50" : ""}>
                        <TableCell>
                          <Checkbox
                            checked={selectedMentees.has(mentee.mentee_id)}
                            onCheckedChange={() => toggleMenteeSelection(mentee.mentee_id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{toDisplayName(mentee.full_name || mentee.mentee_id)}</div>
                          {mentee.pronouns && (
                            <div className="text-sm text-muted-foreground">({mentee.pronouns})</div>
                          )}
                        </TableCell>
                        <TableCell>{mentee.role}</TableCell>
                        <TableCell>{mentee.experience_years} years</TableCell>
                        <TableCell className="max-w-32 truncate">{mentee.location_timezone}</TableCell>
                        <TableCell className="max-w-48">
                          <div className="text-sm">{formatTopics(mentee.topics_to_learn)}</div>
                        </TableCell>
                        <TableCell>{formatDate(mentee.created_at)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Select
                              onValueChange={(cohortId) => handleAssignToCohort(mentee.mentee_id, 'mentee', cohortId)}
                              disabled={assigningPersonId === mentee.mentee_id}
                            >
                              <SelectTrigger className="w-40">
                                <SelectValue placeholder="Assign to cohort" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableCohorts.map((cohort) => (
                                  <SelectItem key={cohort.id} value={cohort.id}>
                                    {cohort.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <Eye className="w-4 h-4 mr-2" />
                                  View Full Profile
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => setDeleteTarget({
                                    id: mentee.mentee_id,
                                    name: toDisplayName(mentee.full_name || mentee.mentee_id),
                                    type: 'mentee',
                                  })}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="mentors" className="space-y-4">
              {selectedMentors.size > 0 && (
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <span className="text-sm font-medium">{selectedMentors.size} selected</span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      const targets = filteredMentors
                        .filter(m => selectedMentors.has(m.mentor_id))
                        .map(m => ({ id: m.mentor_id, name: toDisplayName(m.full_name || m.mentor_id) }));
                      setBulkDeleteTarget({ ids: targets, type: 'mentor' });
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete Selected
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedMentors(new Set())}>
                    Clear Selection
                  </Button>
                </div>
              )}
              {filteredMentors.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <h4 className="text-lg font-semibold mb-2">
                    {searchTerm ? "No matching mentors" : "No Unassigned Mentors"}
                  </h4>
                  <p>{searchTerm ? "Try a different search term." : "All mentors have been assigned to cohorts."}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={allMentorsSelected ? true : someMentorsSelected ? "indeterminate" : false}
                          onCheckedChange={(checked) => toggleAllMentors(!!checked)}
                        />
                      </TableHead>
                      <TableHead>Name/ID</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Experience</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Topics</TableHead>
                      <TableHead>Capacity</TableHead>
                      <TableHead>Signed Up</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMentors.map((mentor) => (
                      <TableRow key={mentor.id} className={selectedMentors.has(mentor.mentor_id) ? "bg-muted/50" : ""}>
                        <TableCell>
                          <Checkbox
                            checked={selectedMentors.has(mentor.mentor_id)}
                            onCheckedChange={() => toggleMentorSelection(mentor.mentor_id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{toDisplayName(mentor.full_name || mentor.mentor_id)}</div>
                          {mentor.pronouns && (
                            <div className="text-sm text-muted-foreground">({mentor.pronouns})</div>
                          )}
                        </TableCell>
                        <TableCell>{mentor.role}</TableCell>
                        <TableCell>{mentor.experience_years} years</TableCell>
                        <TableCell className="max-w-32 truncate">{mentor.location_timezone}</TableCell>
                        <TableCell className="max-w-48">
                          <div className="text-sm">{formatTopics(mentor.topics_to_mentor)}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{mentor.capacity_remaining} slots</Badge>
                        </TableCell>
                        <TableCell>{formatDate(mentor.created_at)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Select
                              onValueChange={(cohortId) => handleAssignToCohort(mentor.mentor_id, 'mentor', cohortId)}
                              disabled={assigningPersonId === mentor.mentor_id}
                            >
                              <SelectTrigger className="w-40">
                                <SelectValue placeholder="Assign to cohort" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableCohorts.map((cohort) => (
                                  <SelectItem key={cohort.id} value={cohort.id}>
                                    {cohort.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <Eye className="w-4 h-4 mr-2" />
                                  View Full Profile
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => setDeleteTarget({
                                    id: mentor.mentor_id,
                                    name: toDisplayName(mentor.full_name || mentor.mentor_id),
                                    type: 'mentor',
                                  })}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.type === 'mentee' ? 'Mentee' : 'Mentor'}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <strong>{deleteTarget?.name}</strong> from the holding area. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!bulkDeleteTarget} onOpenChange={(open) => !open && setBulkDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {bulkDeleteTarget?.ids.length} {bulkDeleteTarget?.type === 'mentee' ? 'Mentee' : 'Mentor'}{(bulkDeleteTarget?.ids.length ?? 0) !== 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the following from the holding area. This action cannot be undone.
              <ul className="mt-2 max-h-40 overflow-y-auto list-disc pl-5 space-y-1">
                {bulkDeleteTarget?.ids.map(({ id, name }) => (
                  <li key={id}>{name}</li>
                ))}
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isBulkDeleting ? "Deleting..." : `Delete ${bulkDeleteTarget?.ids.length}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}