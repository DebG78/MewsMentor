import React, { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  User,
  MapPin,
  Clock,
  Target,
  MessageCircle,
  AlertCircle,
  Users,
  Globe,
  Briefcase,
  Zap,
  Star,
  XCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toDisplayName } from '@/lib/displayName';

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
  const displayName = toDisplayName(profile?.name || profile?.full_name || personId);

  useEffect(() => {
    if (!isOpen || !personId) {
      setOtherCohorts([]);
      return;
    }

    const fetchOtherCohorts = async () => {
      const table = isMentee ? 'mentees' : 'mentors';
      const idColumn = isMentee ? 'mentee_id' : 'mentor_id';

      const { data: rows } = await supabase
        .from(table)
        .select('cohort_id')
        .eq(idColumn, personId)
        .neq('cohort_id', currentCohortId || '');

      if (!rows || rows.length === 0) {
        setOtherCohorts([]);
        return;
      }

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

  // Get the right field names (handles both DB column names and type field names)
  const topics = profile[isMentee ? 'topics_to_learn' : 'topics_to_mentor'] || [];
  const languages = profile.languages || [];
  const preferredStyle = profile.preferred_mentor_style || profile.preferred_style;
  const preferredEnergy = profile.preferred_mentor_energy || profile.preferred_energy;
  const feedbackPref = profile.feedback_preference;
  const mentorExpImportance = profile.mentor_experience_importance;
  const desiredQualities = profile.desired_qualities || profile.mentor_qualities;
  const unwanted = profile.what_not_wanted || profile.unwanted_qualities;
  const topicsNotToMentor = profile.topics_not_to_mentor;
  const preferredMenteeLevels = profile.preferred_mentee_levels || profile.preferred_mentee_level;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0 overflow-hidden flex flex-col">
        {/* Header - colored banner with key info */}
        <div className={`px-8 pt-8 pb-6 shrink-0 ${isMentee ? 'bg-green-50 dark:bg-green-950/30' : 'bg-blue-50 dark:bg-blue-950/30'}`}>
          <div className="flex items-start gap-4">
            <div className={`w-14 h-14 rounded-lg flex items-center justify-center shrink-0 ${
              isMentee ? 'bg-green-100 dark:bg-green-900' : 'bg-blue-100 dark:bg-blue-900'
            }`}>
              <User className={`w-7 h-7 ${isMentee ? 'text-green-600' : 'text-blue-600'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold truncate">{displayName}</h2>
                <Badge variant={isMentee ? "secondary" : "default"} className="shrink-0">
                  {isMentee ? 'Mentee' : 'Mentor'}
                </Badge>
              </div>
              <p className="text-muted-foreground mt-0.5">{profile.role}</p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {profile.location_timezone}
                </span>
                <span className="flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5" />
                  {profile.experience_years} yrs
                </span>
                {profile.meeting_frequency && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {profile.meeting_frequency}
                  </span>
                )}
                {!isMentee && profile.capacity_remaining !== undefined && (
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {profile.capacity_remaining} slots
                  </span>
                )}
                {profile.pronouns && (
                  <span className="text-xs">({profile.pronouns})</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-8 py-6 space-y-5 flex-1 overflow-y-auto min-h-0">
          {/* Cross-cohort warnings */}
          {activeCohorts.length > 0 && (
            <Alert variant="destructive" className="py-2">
              <Users className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Also active in: {activeCohorts.map(c => c.cohort_name).join(', ')}
              </AlertDescription>
            </Alert>
          )}

          {/* Languages & Industry - inline */}
          {(languages.length > 0 || profile.industry) && (
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              {languages.length > 0 && (
                <div className="flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>{languages.join(', ')}</span>
                </div>
              )}
              {profile.industry && (
                <div className="flex items-center gap-2">
                  <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>{profile.industry}</span>
                </div>
              )}
            </div>
          )}

          {/* Topics */}
          {topics.length > 0 && (
            <Section icon={<Target className="w-4 h-4" />} title={isMentee ? 'Wants to learn' : 'Can mentor in'}>
              <div className="flex flex-wrap gap-1.5">
                {topics.map((topic: string, idx: number) => (
                  <Badge key={idx} variant="default" className="text-xs font-normal">{topic}</Badge>
                ))}
              </div>
            </Section>
          )}

          {/* Mentee: Motivation & Goals */}
          {isMentee && (profile.motivation || profile.main_reason || profile.expectations) && (
            <Section icon={<MessageCircle className="w-4 h-4" />} title="Motivation & goals">
              <div className="space-y-2 text-sm">
                {profile.motivation && <p><span className="text-muted-foreground">Why:</span> {profile.motivation}</p>}
                {profile.main_reason && <p><span className="text-muted-foreground">Main reason:</span> {profile.main_reason}</p>}
                {profile.expectations && <p><span className="text-muted-foreground">Expects:</span> {profile.expectations}</p>}
              </div>
            </Section>
          )}

          {/* Mentee: Preferences */}
          {isMentee && (preferredStyle || preferredEnergy || feedbackPref || desiredQualities) && (
            <Section icon={<Star className="w-4 h-4" />} title="Mentor preferences">
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                {preferredStyle && <InfoItem label="Style" value={preferredStyle} />}
                {preferredEnergy && <InfoItem label="Energy" value={preferredEnergy} />}
                {feedbackPref && <InfoItem label="Feedback" value={feedbackPref} />}
                {mentorExpImportance && <InfoItem label="Experience importance" value={mentorExpImportance} />}
              </div>
              {desiredQualities && (
                <p className="text-sm mt-2"><span className="text-muted-foreground">Wants:</span> {desiredQualities}</p>
              )}
              {unwanted && (
                <p className="text-sm mt-1 text-red-600 flex items-start gap-1">
                  <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  {unwanted}
                </p>
              )}
            </Section>
          )}

          {/* Mentor: Approach */}
          {!isMentee && (
            <Section icon={<Zap className="w-4 h-4" />} title="Mentoring approach">
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                {profile.mentoring_style && <InfoItem label="Style" value={profile.mentoring_style} />}
                {profile.meeting_style && <InfoItem label="Meetings" value={profile.meeting_style} />}
                {profile.mentor_energy && <InfoItem label="Energy" value={profile.mentor_energy} />}
                {profile.feedback_style && <InfoItem label="Feedback" value={profile.feedback_style} />}
                {profile.has_mentored_before !== undefined && (
                  <InfoItem label="Mentored before" value={profile.has_mentored_before ? 'Yes' : 'No'} />
                )}
              </div>
              {preferredMenteeLevels && (
                <p className="text-sm mt-2">
                  <span className="text-muted-foreground">Prefers:</span>{' '}
                  {Array.isArray(preferredMenteeLevels) ? preferredMenteeLevels.join(', ') : preferredMenteeLevels}
                </p>
              )}
              {topicsNotToMentor && (
                <p className="text-sm mt-1 text-red-600 flex items-start gap-1">
                  <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  Won't mentor: {Array.isArray(topicsNotToMentor) ? topicsNotToMentor.join(', ') : topicsNotToMentor}
                </p>
              )}
            </Section>
          )}

          {/* Mentor: Motivation */}
          {!isMentee && (profile.motivation || profile.expectations) && (
            <Section icon={<MessageCircle className="w-4 h-4" />} title="Motivation">
              <div className="space-y-2 text-sm">
                {profile.motivation && <p>{profile.motivation}</p>}
                {profile.expectations && <p><span className="text-muted-foreground">Expects:</span> {profile.expectations}</p>}
              </div>
            </Section>
          )}

          {/* Bio text if available */}
          {profile.bio_text && (
            <Section icon={<MessageCircle className="w-4 h-4" />} title="Bio">
              <p className="text-sm leading-relaxed">{profile.bio_text}</p>
            </Section>
          )}

          {/* Footer */}
          <div className="text-xs text-muted-foreground/60 pt-2 border-t">
            {profile.created_at && <>Joined {new Date(profile.created_at).toLocaleDateString()}</>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Compact section with icon + title + content, no card wrapper
function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wide">
        {icon}
        {title}
      </h3>
      {children}
    </div>
  );
}

// Label: value pair
function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-muted-foreground">{label}:</span>{' '}
      <span>{value}</span>
    </div>
  );
}
