import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ProfileModal } from "./ProfileModal";
import { supabase } from "@/lib/supabase";
import { Users, Search, Eye, MapPin, Target, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { assignToCohort } from "@/lib/cohortManager";

interface MenteeRow {
  id: string;
  cohort_id: string;
  mentee_id: string;
  pronouns?: string;
  role: string;
  experience_years: number;
  location_timezone: string;
  life_experiences?: string[];
  topics_to_learn?: string[];
  meeting_frequency?: string;
  languages?: string[];
  industry?: string;
  motivation?: string;
  main_reason?: string;
  preferred_style?: string;
  preferred_energy?: string;
  feedback_preference?: string;
  mentor_experience_importance?: string;
  unwanted_qualities?: string;
  mentor_qualities?: string;
  expectations?: string;
  created_at?: string;
}

interface MentorRow {
  id: string;
  cohort_id: string;
  mentor_id: string;
  pronouns?: string;
  role: string;
  experience_years: number;
  location_timezone: string;
  life_experiences?: string[];
  topics_to_mentor?: string[];
  capacity_remaining: number;
  meeting_frequency?: string;
  languages?: string[];
  industry?: string;
  has_mentored_before?: boolean;
  mentoring_style?: string;
  meeting_style?: string;
  mentor_energy?: string;
  feedback_style?: string;
  preferred_mentee_level?: string;
  topics_not_to_mentor?: string;
  motivation?: string;
  expectations?: string;
  created_at?: string;
}

interface GroupedProfile {
  id: string;
  person_id: string;
  cohort_ids: string[];
  pronouns?: string;
  role: string;
  experience_years: number;
  location_timezone: string;
  life_experiences?: string[];
  topics?: string[];
  meeting_frequency?: string;
  languages?: string[];
  industry?: string;
  capacity_remaining?: number;
  [key: string]: any;
}

interface AllProfilesProps {
  selectedCohort?: { id: string; name: string } | null;
}

export function AllProfiles({ selectedCohort }: AllProfilesProps) {
  const [mentees, setMentees] = useState<MenteeRow[]>([]);
  const [mentors, setMentors] = useState<MentorRow[]>([]);
  const [groupedMentees, setGroupedMentees] = useState<GroupedProfile[]>([]);
  const [groupedMentors, setGroupedMentors] = useState<GroupedProfile[]>([]);
  const [unassignedMentees, setUnassignedMentees] = useState<MenteeRow[]>([]);
  const [unassignedMentors, setUnassignedMentors] = useState<MentorRow[]>([]);
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "");
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [selectedType, setSelectedType] = useState<'mentee' | 'mentor'>('mentee');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [assigningPersonId, setAssigningPersonId] = useState<string | null>(null);
  const [cohortNameMap, setCohortNameMap] = useState<Record<string, string>>({});
  const { toast } = useToast();

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) setSearchTerm(q);
  }, [searchParams]);

  useEffect(() => {
    loadAllProfiles();
  }, []);

  const loadAllProfiles = async () => {
    setLoading(true);
    try {
      const [menteesResult, mentorsResult, cohortsResult] = await Promise.all([
        supabase.from('mentees').select('*').order('created_at', { ascending: false }),
        supabase.from('mentors').select('*').order('created_at', { ascending: false }),
        supabase.from('cohorts').select('id, name')
      ]);

      if (cohortsResult.data) {
        const nameMap: Record<string, string> = {};
        cohortsResult.data.forEach((c: { id: string; name: string }) => {
          nameMap[c.id] = c.name;
        });
        setCohortNameMap(nameMap);
      }

      if (menteesResult.data) {
        setMentees(menteesResult.data);
        setUnassignedMentees(menteesResult.data.filter(m => !m.cohort_id || m.cohort_id === 'unassigned'));

        // Group mentees by mentee_id
        const menteeMap = new Map<string, GroupedProfile>();
        menteesResult.data.forEach((mentee) => {
          const menteeId = mentee.mentee_id;
          if (menteeMap.has(menteeId)) {
            const existing = menteeMap.get(menteeId)!;
            if (mentee.cohort_id && mentee.cohort_id !== 'unassigned') {
              existing.cohort_ids.push(mentee.cohort_id);
            }
          } else {
            menteeMap.set(menteeId, {
              ...mentee,
              person_id: menteeId,
              cohort_ids: mentee.cohort_id && mentee.cohort_id !== 'unassigned' ? [mentee.cohort_id] : [],
              topics: mentee.topics_to_learn || []
            });
          }
        });
        setGroupedMentees(Array.from(menteeMap.values()));
      }

      if (mentorsResult.data) {
        setMentors(mentorsResult.data);
        setUnassignedMentors(mentorsResult.data.filter(m => !m.cohort_id || m.cohort_id === 'unassigned'));

        // Group mentors by mentor_id
        const mentorMap = new Map<string, GroupedProfile>();
        mentorsResult.data.forEach((mentor) => {
          const mentorId = mentor.mentor_id;
          if (mentorMap.has(mentorId)) {
            const existing = mentorMap.get(mentorId)!;
            if (mentor.cohort_id && mentor.cohort_id !== 'unassigned') {
              existing.cohort_ids.push(mentor.cohort_id);
            }
          } else {
            mentorMap.set(mentorId, {
              ...mentor,
              person_id: mentorId,
              cohort_ids: mentor.cohort_id && mentor.cohort_id !== 'unassigned' ? [mentor.cohort_id] : [],
              topics: mentor.topics_to_mentor || [],
              capacity_remaining: mentor.capacity_remaining
            });
          }
        });
        setGroupedMentors(Array.from(mentorMap.values()));
      }
    } catch (error) {
      console.error('Error loading profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  const openProfileModal = (profile: any, type: 'mentee' | 'mentor') => {
    setSelectedProfile(profile);
    setSelectedType(type);
    setIsModalOpen(true);
  };

  const handleAssignToCohort = async (
    personId: string,
    personType: 'mentee' | 'mentor'
  ) => {
    if (!selectedCohort) {
      toast({
        variant: "destructive",
        title: "No cohort selected",
        description: "Please select a cohort first to assign people to it."
      });
      return;
    }

    setAssigningPersonId(personId);
    try {
      const result = await assignToCohort(personId, personType, selectedCohort.id);

      if (result.success) {
        toast({
          title: "Assignment Successful!",
          description: `${personType === 'mentee' ? 'Mentee' : 'Mentor'} has been assigned to ${selectedCohort.name}.`,
        });
        await loadAllProfiles();
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

  const matchesSearch = (profile: GroupedProfile) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    // Search all string and string-array fields on the profile
    return Object.values(profile).some(val => {
      if (typeof val === 'string') return val.toLowerCase().includes(term);
      if (Array.isArray(val)) return val.some(v => typeof v === 'string' && v.toLowerCase().includes(term));
      return false;
    });
  };

  const filteredMentees = groupedMentees.filter(matchesSearch);
  const filteredMentors = groupedMentors.filter(matchesSearch);

  const ProfileTable = ({ profiles, type }: { profiles: any[], type: 'mentee' | 'mentor' }) => {
    const isMentee = type === 'mentee';

    return (
      <ScrollArea className="h-[600px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name/ID</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Experience</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Cohorts</TableHead>
              <TableHead>{isMentee ? 'Learning Topics' : 'Mentoring Topics'}</TableHead>
              {!isMentee && <TableHead>Capacity</TableHead>}
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles.map((profile) => {
              const topics = profile.topics || [];
              const cohortIds = profile.cohort_ids || [];
              const isUnassigned = cohortIds.length === 0;

              return (
                <TableRow key={profile.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">
                    <div>
                      <div className="font-medium">
                        {profile.person_id}
                      </div>
                      {profile.pronouns && (
                        <div className="text-xs text-muted-foreground">
                          {profile.pronouns}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[200px]">
                      <div className="font-medium text-sm truncate" title={profile.role}>
                        {profile.role}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {profile.experience_years} years exp
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {profile.experience_years}y
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm max-w-[150px] truncate" title={profile.location_timezone}>
                      {profile.location_timezone}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[200px]">
                      {isUnassigned ? (
                        <Badge variant="outline" className="text-xs">
                          Unassigned
                        </Badge>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {cohortIds.slice(0, 2).map((cohortId: string, idx: number) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {cohortNameMap[cohortId] || cohortId}
                            </Badge>
                          ))}
                          {cohortIds.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{cohortIds.length - 2}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[250px]">
                      <div className="flex flex-wrap gap-1">
                        {topics.slice(0, 2).map((topic: string, idx: number) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {topic.length > 15 ? topic.substring(0, 15) + '...' : topic}
                          </Badge>
                        ))}
                        {topics.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{topics.length - 2}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  {!isMentee && (
                    <TableCell>
                      <Badge
                        variant={profile.capacity_remaining > 0 ? "default" : "destructive"}
                        className="text-xs"
                      >
                        {profile.capacity_remaining}
                      </Badge>
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        onClick={() => openProfileModal(profile, type)}
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {selectedCohort && isUnassigned && (
                        <Button
                          onClick={() => handleAssignToCohort(
                            profile.person_id,
                            type
                          )}
                          variant="outline"
                          size="sm"
                          className={`h-8 text-xs ${
                            isMentee
                              ? 'text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 active:bg-blue-100'
                              : 'text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700 hover:border-green-300 active:bg-green-100'
                          }`}
                          disabled={assigningPersonId === profile.person_id}
                        >
                          <UserPlus className="h-3 w-3 mr-1" />
                          Assign
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </ScrollArea>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading profiles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">All Profiles</h2>
          <p className="text-muted-foreground">
            {groupedMentees.length} unique mentees and {groupedMentors.length} unique mentors across all cohorts
            {selectedCohort && ` • Managing ${selectedCohort.name}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4" />
          <Input
            placeholder="Search by name, role, or topics..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-80"
          />
        </div>
      </div>

      <Tabs defaultValue={selectedCohort ? "unassigned" : "mentees"} className="w-full">
        <TabsList>
          {selectedCohort && (
            <TabsTrigger value="unassigned" className="flex items-center gap-2 data-[state=active]:bg-orange-100 data-[state=active]:text-orange-700">
              <Target className="w-4 h-4" />
              Unassigned ({unassignedMentees.length + unassignedMentors.length})
            </TabsTrigger>
          )}
          <TabsTrigger value="mentees" className="flex items-center gap-2 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700">
            <Users className="w-4 h-4" />
            All Mentees ({filteredMentees.length})
          </TabsTrigger>
          <TabsTrigger value="mentors" className="flex items-center gap-2 data-[state=active]:bg-green-100 data-[state=active]:text-green-700">
            <Users className="w-4 h-4" />
            All Mentors ({filteredMentors.length})
          </TabsTrigger>
        </TabsList>

        {selectedCohort && (
          <TabsContent value="unassigned" className="space-y-4">
            {unassignedMentees.length === 0 && unassignedMentors.length === 0 ? (
              <div className="text-center py-12">
                <Target className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No Unassigned Profiles</h3>
                <p className="text-muted-foreground">
                  All mentors and mentees have been assigned to cohorts.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {unassignedMentees.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-600" />
                        Unassigned Mentees ({unassignedMentees.length})
                        <Badge variant="outline" className="ml-auto">Ready to assign to {selectedCohort.name}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <ProfileTable profiles={unassignedMentees} type="mentee" />
                    </CardContent>
                  </Card>
                )}

                {unassignedMentors.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="w-5 h-5 text-green-600" />
                        Unassigned Mentors ({unassignedMentors.length})
                        <Badge variant="outline" className="ml-auto">Ready to assign to {selectedCohort.name}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <ProfileTable profiles={unassignedMentors} type="mentor" />
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>
        )}

        <TabsContent value="mentees" className="space-y-4">
          {filteredMentees.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No mentees found</h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'Try adjusting your search criteria' : 'No mentees have been imported yet'}
              </p>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Mentees ({filteredMentees.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ProfileTable profiles={filteredMentees} type="mentee" />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="mentors" className="space-y-4">
          {filteredMentors.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No mentors found</h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'Try adjusting your search criteria' : 'No mentors have been imported yet'}
              </p>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Mentors ({filteredMentors.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ProfileTable profiles={filteredMentors} type="mentor" />
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <ProfileModal
        profile={selectedProfile}
        type={selectedType}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

    </div>
  );
}