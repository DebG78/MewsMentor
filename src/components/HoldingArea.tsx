import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  Users,
  Target,
  MoreHorizontal,
  Eye,
  Trash2,
  Clock,
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
            <TabsList>
              <TabsTrigger value="mentees">
                Mentees ({unassignedMentees.length})
              </TabsTrigger>
              <TabsTrigger value="mentors">
                Mentors ({unassignedMentors.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="mentees" className="space-y-4">
              {unassignedMentees.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <h4 className="text-lg font-semibold mb-2">No Unassigned Mentees</h4>
                  <p>All mentees have been assigned to cohorts.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
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
                    {unassignedMentees.map((mentee) => (
                      <TableRow key={mentee.id}>
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
              {unassignedMentors.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <h4 className="text-lg font-semibold mb-2">No Unassigned Mentors</h4>
                  <p>All mentors have been assigned to cohorts.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
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
                    {unassignedMentors.map((mentor) => (
                      <TableRow key={mentor.id}>
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
    </div>
  );
}