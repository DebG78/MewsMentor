import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/lib/supabase";
import {
  Search,
  Filter,
  X,
  User,
  MapPin,
  Briefcase,
  Clock,
  Users,
  UserPlus,
  ClipboardList,
  GitMerge,
  Mail,
  BarChart3,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { assignToCohort } from "@/lib/cohortManager";
import { toDisplayName } from "@/lib/displayName";
import { SurveyInfoTab } from "./profiles/SurveyInfoTab";
import { MatchesTab } from "./profiles/MatchesTab";
import { MessagesTab } from "./profiles/MessagesTab";
import { AnalyticsTab } from "./profiles/AnalyticsTab";

interface GroupedProfile {
  id: string;
  person_id: string;
  cohort_ids: string[];
  pronouns?: string;
  role: string;
  experience_years: number;
  location_timezone: string;
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
  const [groupedMentees, setGroupedMentees] = useState<GroupedProfile[]>([]);
  const [groupedMentors, setGroupedMentors] = useState<GroupedProfile[]>([]);
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [selectedType, setSelectedType] = useState<"mentee" | "mentor">("mentee");
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
        supabase.from("mentees").select("*").order("created_at", { ascending: false }),
        supabase.from("mentors").select("*").order("created_at", { ascending: false }),
        supabase.from("cohorts").select("id, name"),
      ]);

      if (cohortsResult.data) {
        const nameMap: Record<string, string> = {};
        cohortsResult.data.forEach((c: { id: string; name: string }) => {
          nameMap[c.id] = c.name;
        });
        setCohortNameMap(nameMap);
      }

      // Build a stable grouping key: prefer slack_user_id, then full_name, then raw ID
      const groupKeyFor = (row: any, idField: string) =>
        (row.slack_user_id || row.full_name || row[idField] || '').trim().toLowerCase();

      // Only keep rows that belong to an existing cohort or the holding area
      const validCohortIds = new Set(cohortsResult.data?.map((c: any) => c.id) || []);
      const isValidRow = (row: any) =>
        !row.cohort_id || row.cohort_id === 'unassigned' || validCohortIds.has(row.cohort_id);

      if (menteesResult.data) {
        const menteeMap = new Map<string, GroupedProfile>();
        menteesResult.data.filter(isValidRow).forEach((mentee: any) => {
          const menteeId = mentee.mentee_id;
          const groupKey = groupKeyFor(mentee, 'mentee_id');
          if (menteeMap.has(groupKey)) {
            const existing = menteeMap.get(groupKey)!;
            if (mentee.cohort_id && mentee.cohort_id !== "unassigned" && !existing.cohort_ids.includes(mentee.cohort_id)) {
              existing.cohort_ids.push(mentee.cohort_id);
            }
            // Prefer the row that's in an active cohort over the unassigned one
            if (mentee.cohort_id && mentee.cohort_id !== "unassigned" && (!existing.cohort_id || existing.cohort_id === "unassigned")) {
              const cohortIds = existing.cohort_ids;
              Object.assign(existing, mentee, { person_id: menteeId, cohort_ids: cohortIds, topics: mentee.topics_to_learn || [] });
            }
          } else {
            menteeMap.set(groupKey, {
              ...mentee,
              person_id: menteeId,
              cohort_ids: mentee.cohort_id && mentee.cohort_id !== "unassigned" ? [mentee.cohort_id] : [],
              topics: mentee.topics_to_learn || [],
            });
          }
        });
        setGroupedMentees(Array.from(menteeMap.values()));
      }

      if (mentorsResult.data) {
        const mentorMap = new Map<string, GroupedProfile>();
        mentorsResult.data.filter(isValidRow).forEach((mentor: any) => {
          const mentorId = mentor.mentor_id;
          const groupKey = groupKeyFor(mentor, 'mentor_id');
          if (mentorMap.has(groupKey)) {
            const existing = mentorMap.get(groupKey)!;
            if (mentor.cohort_id && mentor.cohort_id !== "unassigned" && !existing.cohort_ids.includes(mentor.cohort_id)) {
              existing.cohort_ids.push(mentor.cohort_id);
            }
            // Prefer the row that's in an active cohort over the unassigned one
            if (mentor.cohort_id && mentor.cohort_id !== "unassigned" && (!existing.cohort_id || existing.cohort_id === "unassigned")) {
              const cohortIds = existing.cohort_ids;
              Object.assign(existing, mentor, { person_id: mentorId, cohort_ids: cohortIds, topics: mentor.topics_to_mentor || [], capacity_remaining: mentor.capacity_remaining });
            }
          } else {
            mentorMap.set(groupKey, {
              ...mentor,
              person_id: mentorId,
              cohort_ids: mentor.cohort_id && mentor.cohort_id !== "unassigned" ? [mentor.cohort_id] : [],
              topics: mentor.topics_to_mentor || [],
              capacity_remaining: mentor.capacity_remaining,
            });
          }
        });
        setGroupedMentors(Array.from(mentorMap.values()));
      }
    } catch (error) {
      console.error("Error loading profiles:", error);
    } finally {
      setLoading(false);
    }
  };

  // Combined and filtered list
  const allProfiles = useMemo(() => {
    const mentees: Array<GroupedProfile & { _type: "mentee" | "mentor" }> =
      groupedMentees.map((p) => ({ ...p, _type: "mentee" as const }));
    const mentors: Array<GroupedProfile & { _type: "mentee" | "mentor" }> =
      groupedMentors.map((p) => ({ ...p, _type: "mentor" as const }));
    return [...mentees, ...mentors];
  }, [groupedMentees, groupedMentors]);

  const searchResults = useMemo(() => {
    if (!searchTerm) return [];
    const term = searchTerm.toLowerCase();

    let results = allProfiles.filter((profile) =>
      Object.values(profile).some((val) => {
        if (typeof val === "string") return val.toLowerCase().includes(term);
        if (Array.isArray(val))
          return val.some((v) => typeof v === "string" && v.toLowerCase().includes(term));
        return false;
      })
    );

    if (roleFilter === "mentee") results = results.filter((p) => p._type === "mentee");
    if (roleFilter === "mentor") results = results.filter((p) => p._type === "mentor");

    return results;
  }, [allProfiles, searchTerm, roleFilter]);

  const handleSelectProfile = (profile: any, type: "mentee" | "mentor") => {
    setSelectedProfile(profile);
    setSelectedType(type);
  };

  const handleAssignToCohort = async (personId: string, personType: "mentee" | "mentor") => {
    if (!selectedCohort) {
      toast({ variant: "destructive", title: "No cohort selected", description: "Please select a cohort first." });
      return;
    }
    setAssigningPersonId(personId);
    try {
      const result = await assignToCohort(personId, personType, selectedCohort.id);
      if (result.success) {
        toast({ title: "Assignment Successful!", description: `Assigned to ${selectedCohort.name}.` });
        await loadAllProfiles();
      } else {
        throw new Error(result.error || "Assignment failed");
      }
    } catch {
      toast({ variant: "destructive", title: "Assignment Failed", description: "Please try again." });
    } finally {
      setAssigningPersonId(null);
    }
  };

  const activeFilterCount = (roleFilter ? 1 : 0);
  const isMentee = selectedType === "mentee";
  const personId = selectedProfile
    ? selectedProfile[isMentee ? "mentee_id" : "mentor_id"] || selectedProfile.person_id
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto" />
          <p className="mt-2 text-muted-foreground">Loading profiles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold">{groupedMentees.length}</div>
            <div className="text-xs text-muted-foreground">Total Mentees</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold">{groupedMentors.length}</div>
            <div className="text-xs text-muted-foreground">Total Mentors</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold">{groupedMentees.length + groupedMentors.length}</div>
            <div className="text-xs text-muted-foreground">Total Profiles</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold">{Object.keys(cohortNameMap).length}</div>
            <div className="text-xs text-muted-foreground">Cohorts</div>
          </CardContent>
        </Card>
      </div>

      {/* Search / Filter bar — like People Analytics filter section */}
      <Card className="p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Search className="w-4 h-4" />
            Find profile:
          </div>
          <div className="relative flex-1 min-w-[250px] max-w-md">
            <Input
              placeholder="Search by name, role, topic, location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v === "_all" ? "" : v)}>
            <SelectTrigger className="w-36 h-9 text-sm">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All Roles</SelectItem>
              <SelectItem value="mentee">Mentees only</SelectItem>
              <SelectItem value="mentor">Mentors only</SelectItem>
            </SelectContent>
          </Select>
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-sm"
              onClick={() => setRoleFilter("")}
            >
              <X className="w-4 h-4 mr-1" /> Clear
            </Button>
          )}
          {searchTerm && (
            <Badge variant="outline" className="text-xs">
              {searchResults.length} result{searchResults.length !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>
      </Card>

      {/* Search results dropdown */}
      {searchTerm && searchResults.length > 0 && !selectedProfile && (
        <Card>
          <CardContent className="p-0">
            <div className="max-h-[350px] overflow-y-auto divide-y">
              {searchResults.slice(0, 20).map((profile) => (
                <div
                  key={`${profile._type}-${profile.person_id}`}
                  onClick={() => handleSelectProfile(profile, profile._type)}
                  className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        profile._type === "mentee"
                          ? "bg-green-100 text-green-600"
                          : "bg-blue-100 text-blue-600"
                      }`}
                    >
                      <User className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {toDisplayName(profile.full_name || profile.person_id)}
                        </span>
                        <Badge
                          variant={profile._type === "mentee" ? "secondary" : "default"}
                          className="text-[10px] shrink-0"
                        >
                          {profile._type}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {profile.business_title || profile.role}
                        {profile.country || profile.location_timezone
                          ? ` · ${profile.country || profile.location_timezone}`
                          : ""}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {profile.cohort_ids.length > 0 && (
                      <Badge variant="outline" className="text-[10px]">
                        {cohortNameMap[profile.cohort_ids[0]] || "Assigned"}
                        {profile.cohort_ids.length > 1 && ` +${profile.cohort_ids.length - 1}`}
                      </Badge>
                    )}
                    {selectedCohort && profile.cohort_ids.length === 0 && (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAssignToCohort(profile.person_id, profile._type);
                        }}
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        disabled={assigningPersonId === profile.person_id}
                      >
                        <UserPlus className="h-3 w-3 mr-1" />
                        Assign
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {searchResults.length > 20 && (
                <div className="px-4 py-2 text-xs text-muted-foreground text-center">
                  Showing 20 of {searchResults.length} results. Refine your search to see more.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No results */}
      {searchTerm && searchResults.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <Users className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No profiles match "{searchTerm}"</p>
          </CardContent>
        </Card>
      )}

      {/* Selected profile detail — full-width tabs like People Analytics */}
      {selectedProfile && (
        <>
          {/* Profile header card */}
          <Card>
            <CardContent className="p-0">
              <div
                className={`px-6 py-4 ${
                  isMentee
                    ? "bg-green-50 dark:bg-green-950/30"
                    : "bg-blue-50 dark:bg-blue-950/30"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${
                        isMentee
                          ? "bg-green-100 dark:bg-green-900"
                          : "bg-blue-100 dark:bg-blue-900"
                      }`}
                    >
                      <User className={`w-6 h-6 ${isMentee ? "text-green-600" : "text-blue-600"}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold truncate">
                          {toDisplayName(selectedProfile.full_name || selectedProfile.name || personId)}
                        </h2>
                        <Badge variant={isMentee ? "secondary" : "default"} className="shrink-0">
                          {isMentee ? "Mentee" : "Mentor"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5 truncate">
                        {selectedProfile.business_title || selectedProfile.role}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                        {(selectedProfile.country || selectedProfile.location_timezone) && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {selectedProfile.country || selectedProfile.location_timezone}
                          </span>
                        )}
                        {(selectedProfile.compensation_grade || selectedProfile.experience_years) && (
                          <span className="flex items-center gap-1">
                            <Briefcase className="w-3 h-3" />
                            {selectedProfile.compensation_grade || `${selectedProfile.experience_years} yrs`}
                          </span>
                        )}
                        {selectedProfile.meeting_frequency && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {selectedProfile.meeting_frequency}
                          </span>
                        )}
                        {!isMentee && selectedProfile.capacity_remaining !== undefined && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {selectedProfile.capacity_remaining} slots
                          </span>
                        )}
                        {selectedProfile.pronouns && (
                          <span className="text-[10px]">({selectedProfile.pronouns})</span>
                        )}
                      </div>
                      {/* Cohort membership */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        {selectedProfile.cohort_ids && selectedProfile.cohort_ids.length > 0 ? (
                          selectedProfile.cohort_ids.map((cId: string) => (
                            <Badge key={cId} variant="outline" className="text-[10px]">
                              {cohortNameMap[cId] || cId}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="outline" className="text-[10px] border-amber-200 text-amber-700">
                            Holding Area
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0"
                    onClick={() => setSelectedProfile(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs — same pattern as People Analytics */}
          <Tabs defaultValue="survey">
            <TabsList>
              <TabsTrigger value="survey">
                <ClipboardList className="w-4 h-4 mr-1.5" />
                Survey Info
              </TabsTrigger>
              <TabsTrigger value="matches">
                <GitMerge className="w-4 h-4 mr-1.5" />
                Matches
              </TabsTrigger>
              <TabsTrigger value="messages">
                <Mail className="w-4 h-4 mr-1.5" />
                Messages
              </TabsTrigger>
              <TabsTrigger value="analytics">
                <BarChart3 className="w-4 h-4 mr-1.5" />
                Analytics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="survey" className="space-y-4">
              <Card>
                <CardContent className="pt-6">
                  <SurveyInfoTab profile={selectedProfile} type={selectedType} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="matches" className="space-y-4">
              <MatchesTab personId={personId} personType={selectedType} />
            </TabsContent>

            <TabsContent value="messages" className="space-y-4">
              <Card>
                <CardContent className="pt-6">
                  <MessagesTab personId={personId} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              <AnalyticsTab personId={personId} personType={selectedType} />
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Empty state — no search yet and no profile selected */}
      {!searchTerm && !selectedProfile && (
        <Card>
          <CardContent className="py-12 text-center">
            <Search className="w-10 h-10 mx-auto text-muted-foreground mb-3 opacity-40" />
            <h3 className="text-base font-medium mb-1">Search for a profile</h3>
            <p className="text-sm text-muted-foreground">
              Type a name, role, topic, or location above to find someone.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
