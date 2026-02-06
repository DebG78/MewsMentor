import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { User, MapPin, Clock, Target, MessageCircle, Heart, AlertCircle, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface OtherCohortInfo {
  cohort_id: string;
  cohort_name: string;
  cohort_status: string;
}

interface ProfileModalProps {
  profile: any;
  type: 'mentee' | 'mentor';
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileModal({ profile, type, isOpen, onClose }: ProfileModalProps) {
  const [otherCohorts, setOtherCohorts] = useState<OtherCohortInfo[]>([]);

  const isMentee = type === 'mentee';
  const personId = profile?.[isMentee ? 'mentee_id' : 'mentor_id'];
  const currentCohortId = profile?.cohort_id;
  const displayName = profile?.full_name || personId;

  useEffect(() => {
    if (!isOpen || !personId) {
      setOtherCohorts([]);
      return;
    }

    const fetchOtherCohorts = async () => {
      const table = isMentee ? 'mentees' : 'mentors';
      const idColumn = isMentee ? 'mentee_id' : 'mentor_id';

      // Find all cohorts this person belongs to (excluding current)
      const { data: rows } = await supabase
        .from(table)
        .select('cohort_id')
        .eq(idColumn, personId)
        .neq('cohort_id', currentCohortId || '');

      if (!rows || rows.length === 0) {
        setOtherCohorts([]);
        return;
      }

      // Fetch cohort names and statuses
      const cohortIds = rows.map((r: any) => r.cohort_id);
      const { data: cohorts } = await supabase
        .from('cohorts')
        .select('id, name, status')
        .in('id', cohortIds);

      if (cohorts) {
        setOtherCohorts(cohorts.map((c: any) => ({
          cohort_id: c.id,
          cohort_name: c.name,
          cohort_status: c.status,
        })));
      }
    };

    fetchOtherCohorts();
  }, [isOpen, personId, currentCohortId, isMentee]);

  if (!profile) return null;

  const activeCohorts = otherCohorts.filter(c => c.cohort_status === 'active' || c.cohort_status === 'matching');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            {displayName} - {isMentee ? 'Mentee' : 'Mentor'} Profile
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Cross-cohort participation warning */}
          {activeCohorts.length > 0 && (
            <Alert variant="destructive">
              <Users className="h-4 w-4" />
              <AlertDescription>
                <strong>Already in {activeCohorts.length} other active cohort{activeCohorts.length > 1 ? 's' : ''}:</strong>
                <div className="flex flex-wrap gap-1 mt-1">
                  {activeCohorts.map(c => (
                    <Badge key={c.cohort_id} variant="outline" className="text-xs">
                      {c.cohort_name}
                    </Badge>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Other (non-active) cohort participation */}
          {otherCohorts.length > 0 && activeCohorts.length < otherCohorts.length && (
            <Alert>
              <Users className="h-4 w-4" />
              <AlertDescription>
                Also in {otherCohorts.length - activeCohorts.length} other cohort{otherCohorts.length - activeCohorts.length > 1 ? 's' : ''}:
                <div className="flex flex-wrap gap-1 mt-1">
                  {otherCohorts.filter(c => c.cohort_status !== 'active' && c.cohort_status !== 'matching').map(c => (
                    <Badge key={c.cohort_id} variant="secondary" className="text-xs">
                      {c.cohort_name} ({c.cohort_status})
                    </Badge>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Role</label>
                  <p className="font-medium">{profile.role}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Experience</label>
                  <p className="font-medium">{profile.experience_years} years</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Location/Timezone</label>
                  <p className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {profile.location_timezone}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Pronouns</label>
                  <p className="font-medium">{profile.pronouns || 'Not specified'}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Languages</label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(profile.languages || []).map((lang: string, idx: number) => (
                    <Badge key={idx} variant="outline">{lang}</Badge>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Industry</label>
                <p className="font-medium">{profile.industry}</p>
              </div>
            </CardContent>
          </Card>

          {/* Life Experiences */}
          {profile.life_experiences && profile.life_experiences.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Heart className="w-5 h-5" />
                  Life Experiences
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {profile.life_experiences.map((exp: string, idx: number) => (
                    <Badge key={idx} variant="secondary" className="text-sm">{exp}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Topics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="w-5 h-5" />
                {isMentee ? 'Topics to Learn' : 'Topics to Mentor'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {(profile[isMentee ? 'topics_to_learn' : 'topics_to_mentor'] || []).map((topic: string, idx: number) => (
                  <Badge key={idx} variant="default" className="text-sm">{topic}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Mentee-specific fields */}
          {isMentee && (
            <>
              {/* Motivation & Goals */}
              {(profile.motivation || profile.main_reason || profile.expectations) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MessageCircle className="w-5 h-5" />
                      Motivation & Goals
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {profile.motivation && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Why join mentorship program?</label>
                        <p className="mt-1 text-sm">{profile.motivation}</p>
                      </div>
                    )}
                    {profile.main_reason && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Main reason for wanting a mentor</label>
                        <p className="mt-1 text-sm">{profile.main_reason}</p>
                      </div>
                    )}
                    {profile.expectations && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Program expectations</label>
                        <p className="mt-1 text-sm">{profile.expectations}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Mentor Preferences */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Mentor Preferences</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {profile.preferred_style && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Preferred mentor style</label>
                        <p className="text-sm">{profile.preferred_style}</p>
                      </div>
                    )}
                    {profile.preferred_energy && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Preferred mentor energy</label>
                        <p className="text-sm">{profile.preferred_energy}</p>
                      </div>
                    )}
                    {profile.feedback_preference && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Feedback preference</label>
                        <p className="text-sm">{profile.feedback_preference}</p>
                      </div>
                    )}
                    {profile.mentor_experience_importance && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Mentor experience importance</label>
                        <p className="text-sm">{profile.mentor_experience_importance}</p>
                      </div>
                    )}
                  </div>

                  {profile.mentor_qualities && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Desired mentor qualities</label>
                      <p className="text-sm">{profile.mentor_qualities}</p>
                    </div>
                  )}

                  {profile.unwanted_qualities && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        What NOT wanted in a mentor
                      </label>
                      <p className="text-sm text-red-600">{profile.unwanted_qualities}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* Mentor-specific fields */}
          {!isMentee && (
            <>
              {/* Mentoring Approach */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Mentoring Approach</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Capacity Remaining</label>
                      <p className="font-medium text-lg">{profile.capacity_remaining}</p>
                    </div>
                    {profile.has_mentored_before !== undefined && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Has mentored before?</label>
                        <p className="font-medium">{profile.has_mentored_before ? 'Yes' : 'No'}</p>
                      </div>
                    )}
                    {profile.mentoring_style && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Mentoring style</label>
                        <p className="text-sm">{profile.mentoring_style}</p>
                      </div>
                    )}
                    {profile.meeting_style && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Meeting style</label>
                        <p className="text-sm">{profile.meeting_style}</p>
                      </div>
                    )}
                    {profile.mentor_energy && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Mentor energy</label>
                        <p className="text-sm">{profile.mentor_energy}</p>
                      </div>
                    )}
                    {profile.feedback_style && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Feedback style</label>
                        <p className="text-sm">{profile.feedback_style}</p>
                      </div>
                    )}
                  </div>

                  {profile.preferred_mentee_level && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Preferred mentee levels</label>
                      <p className="text-sm">{profile.preferred_mentee_level}</p>
                    </div>
                  )}

                  {profile.topics_not_to_mentor && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        Topics NOT to mentor
                      </label>
                      <p className="text-sm text-red-600">{profile.topics_not_to_mentor}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Motivation */}
              {(profile.motivation || profile.expectations) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MessageCircle className="w-5 h-5" />
                      Motivation & Expectations
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {profile.motivation && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">What do you hope to gain from being a mentor?</label>
                        <p className="mt-1 text-sm">{profile.motivation}</p>
                      </div>
                    )}
                    {profile.expectations && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Program expectations</label>
                        <p className="mt-1 text-sm">{profile.expectations}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Meeting Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Meeting Preferences
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Meeting frequency</label>
                <p className="font-medium">{profile.meeting_frequency}</p>
              </div>
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">System Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm text-muted-foreground">
                {profile.full_name && <p>Name: {profile.full_name}</p>}
                <p>ID: {profile[isMentee ? 'mentee_id' : 'mentor_id']}</p>
                <p>Cohort: {profile.cohort_id}</p>
                {profile.created_at && (
                  <p>Created: {new Date(profile.created_at).toLocaleDateString()}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}