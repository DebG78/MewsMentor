import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  User,
  MapPin,
  Clock,
  Target,
  MessageCircle,
  Users,
  Globe,
  Briefcase,
  Zap,
  Star,
  XCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface OtherCohortInfo {
  cohort_id: string;
  cohort_name: string;
  cohort_status: string;
}

interface SurveyInfoTabProps {
  profile: any;
  type: "mentee" | "mentor";
}

export function SurveyInfoTab({ profile, type }: SurveyInfoTabProps) {
  const [otherCohorts, setOtherCohorts] = useState<OtherCohortInfo[]>([]);

  const isMentee = type === "mentee";
  const personId = profile?.[isMentee ? "mentee_id" : "mentor_id"];
  const currentCohortId = profile?.cohort_id;

  useEffect(() => {
    if (!personId) {
      setOtherCohorts([]);
      return;
    }

    const fetchOtherCohorts = async () => {
      const table = isMentee ? "mentees" : "mentors";
      const idColumn = isMentee ? "mentee_id" : "mentor_id";

      const { data: rows } = await supabase
        .from(table)
        .select("cohort_id")
        .eq(idColumn, personId)
        .neq("cohort_id", currentCohortId || "");

      if (!rows || rows.length === 0) {
        setOtherCohorts([]);
        return;
      }

      const cohortIds = rows.map((r: any) => r.cohort_id);
      const { data: cohorts } = await supabase
        .from("cohorts")
        .select("id, name, status")
        .in("id", cohortIds);

      if (cohorts) {
        setOtherCohorts(
          cohorts.map((c: any) => ({
            cohort_id: c.id,
            cohort_name: c.name,
            cohort_status: c.status,
          }))
        );
      }
    };

    fetchOtherCohorts();
  }, [personId, currentCohortId, isMentee]);

  if (!profile) return null;

  const activeCohorts = otherCohorts.filter(
    (c) => c.cohort_status === "active" || c.cohort_status === "matching"
  );

  const topics =
    profile[isMentee ? "topics_to_learn" : "topics_to_mentor"] || [];
  const languages = profile.languages || [];
  const preferredStyle =
    profile.preferred_mentor_style || profile.preferred_style;
  const preferredEnergy =
    profile.preferred_mentor_energy || profile.preferred_energy;
  const feedbackPref = profile.feedback_preference;
  const mentorExpImportance = profile.mentor_experience_importance;
  const desiredQualities = profile.desired_qualities || profile.mentor_qualities;
  const unwanted = profile.what_not_wanted || profile.unwanted_qualities;
  const topicsNotToMentor = profile.topics_not_to_mentor;
  const preferredMenteeLevels =
    profile.preferred_mentee_levels || profile.preferred_mentee_level;

  return (
    <div className="space-y-5">
      {/* Cross-cohort warnings */}
      {activeCohorts.length > 0 && (
        <Alert variant="destructive" className="py-2">
          <Users className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Also active in: {activeCohorts.map((c) => c.cohort_name).join(", ")}
          </AlertDescription>
        </Alert>
      )}

      {/* Languages & Industry */}
      {(languages.length > 0 || profile.industry) && (
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {languages.length > 0 && (
            <div className="flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{languages.join(", ")}</span>
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

      {/* V3: Workday info */}
      {(profile.org_level_04 || profile.org_level_05) && (
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {profile.org_level_04 && (
            <div className="flex items-center gap-2">
              <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{profile.org_level_04}</span>
            </div>
          )}
          {profile.org_level_05 && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">&rarr;</span>
              <span>{profile.org_level_05}</span>
            </div>
          )}
        </div>
      )}

      {/* Bio */}
      {profile.bio && (
        <Section
          icon={<MessageCircle className="w-4 h-4" />}
          title="About"
        >
          <p className="text-sm leading-relaxed">{profile.bio}</p>
        </Section>
      )}

      {/* V3 Mentee: Capabilities & Goals */}
      {isMentee &&
        (profile.capabilities_wanted ||
          profile.role_specific_area ||
          profile.specific_challenge) && (
          <Section
            icon={<Target className="w-4 h-4" />}
            title="Development goals"
          >
            <div className="space-y-2 text-sm">
              {profile.capabilities_wanted && (
                <p>
                  <span className="text-muted-foreground">
                    Capabilities to develop:
                  </span>{" "}
                  {profile.capabilities_wanted}
                </p>
              )}
              {profile.role_specific_area && (
                <p>
                  <span className="text-muted-foreground">
                    Role-specific area:
                  </span>{" "}
                  {profile.role_specific_area}
                </p>
              )}
              {profile.mentoring_goal && (
                <p>
                  <span className="text-muted-foreground">Goal:</span>{" "}
                  {profile.mentoring_goal}
                </p>
              )}
              {profile.specific_challenge && (
                <p>
                  <span className="text-muted-foreground">Challenge:</span>{" "}
                  {profile.specific_challenge}
                </p>
              )}
            </div>
          </Section>
        )}

      {/* V3 Mentor: Capabilities & Offering */}
      {!isMentee &&
        (profile.capabilities_offered ||
          profile.role_specific_offering ||
          profile.meaningful_impact) && (
          <Section
            icon={<Target className="w-4 h-4" />}
            title="Mentoring offering"
          >
            <div className="space-y-2 text-sm">
              {profile.capabilities_offered && (
                <p>
                  <span className="text-muted-foreground">Capabilities:</span>{" "}
                  {profile.capabilities_offered}
                </p>
              )}
              {profile.role_specific_offering && (
                <p>
                  <span className="text-muted-foreground">Role-specific:</span>{" "}
                  {profile.role_specific_offering}
                </p>
              )}
              {profile.meaningful_impact && (
                <p>
                  <span className="text-muted-foreground">Impact story:</span>{" "}
                  {profile.meaningful_impact}
                </p>
              )}
            </div>
          </Section>
        )}

      {/* Topics (V1/V2) */}
      {topics.length > 0 &&
        !profile.capabilities_wanted &&
        !profile.capabilities_offered && (
          <Section
            icon={<Target className="w-4 h-4" />}
            title={isMentee ? "Wants to learn" : "Can mentor in"}
          >
            <div className="flex flex-wrap gap-1.5">
              {topics.map((topic: string, idx: number) => (
                <Badge key={idx} variant="default" className="text-xs font-normal">
                  {topic}
                </Badge>
              ))}
            </div>
          </Section>
        )}

      {/* Mentee: Motivation & Goals (V1/V2) */}
      {isMentee &&
        !profile.capabilities_wanted &&
        (profile.motivation || profile.main_reason || profile.expectations) && (
          <Section
            icon={<MessageCircle className="w-4 h-4" />}
            title="Motivation & goals"
          >
            <div className="space-y-2 text-sm">
              {profile.motivation && (
                <p>
                  <span className="text-muted-foreground">Why:</span>{" "}
                  {profile.motivation}
                </p>
              )}
              {profile.main_reason && (
                <p>
                  <span className="text-muted-foreground">Main reason:</span>{" "}
                  {profile.main_reason}
                </p>
              )}
              {profile.expectations && (
                <p>
                  <span className="text-muted-foreground">Expects:</span>{" "}
                  {profile.expectations}
                </p>
              )}
            </div>
          </Section>
        )}

      {/* Mentee: Preferences */}
      {isMentee &&
        (preferredStyle ||
          preferredEnergy ||
          feedbackPref ||
          desiredQualities) && (
          <Section
            icon={<Star className="w-4 h-4" />}
            title="Mentor preferences"
          >
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {preferredStyle && (
                <InfoItem label="Style" value={preferredStyle} />
              )}
              {preferredEnergy && (
                <InfoItem label="Energy" value={preferredEnergy} />
              )}
              {feedbackPref && (
                <InfoItem label="Feedback" value={feedbackPref} />
              )}
              {mentorExpImportance && (
                <InfoItem
                  label="Experience importance"
                  value={mentorExpImportance}
                />
              )}
            </div>
            {desiredQualities && (
              <p className="text-sm mt-2">
                <span className="text-muted-foreground">Wants:</span>{" "}
                {desiredQualities}
              </p>
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
        <Section
          icon={<Zap className="w-4 h-4" />}
          title="Mentoring approach"
        >
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            {profile.mentoring_style && (
              <InfoItem label="Style" value={profile.mentoring_style} />
            )}
            {profile.meeting_style && (
              <InfoItem label="Meetings" value={profile.meeting_style} />
            )}
            {profile.mentor_energy && (
              <InfoItem label="Energy" value={profile.mentor_energy} />
            )}
            {profile.feedback_style && (
              <InfoItem label="Feedback" value={profile.feedback_style} />
            )}
            {profile.has_mentored_before !== undefined && (
              <InfoItem
                label="Mentored before"
                value={profile.has_mentored_before ? "Yes" : "No"}
              />
            )}
          </div>
          {preferredMenteeLevels && (
            <p className="text-sm mt-2">
              <span className="text-muted-foreground">Prefers:</span>{" "}
              {Array.isArray(preferredMenteeLevels)
                ? preferredMenteeLevels.join(", ")
                : preferredMenteeLevels}
            </p>
          )}
          {topicsNotToMentor && (
            <p className="text-sm mt-1 text-red-600 flex items-start gap-1">
              <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              Won't mentor:{" "}
              {Array.isArray(topicsNotToMentor)
                ? topicsNotToMentor.join(", ")
                : topicsNotToMentor}
            </p>
          )}
        </Section>
      )}

      {/* Mentor: Motivation */}
      {!isMentee &&
        (profile.motivation || profile.expectations) && (
          <Section
            icon={<MessageCircle className="w-4 h-4" />}
            title="Motivation"
          >
            <div className="space-y-2 text-sm">
              {profile.motivation && <p>{profile.motivation}</p>}
              {profile.expectations && (
                <p>
                  <span className="text-muted-foreground">Expects:</span>{" "}
                  {profile.expectations}
                </p>
              )}
            </div>
          </Section>
        )}

      {/* Legacy bio_text */}
      {profile.bio_text && !profile.bio && (
        <Section
          icon={<MessageCircle className="w-4 h-4" />}
          title="Bio"
        >
          <p className="text-sm leading-relaxed">{profile.bio_text}</p>
        </Section>
      )}

      {/* Footer */}
      <div className="text-xs text-muted-foreground/60 pt-2 border-t">
        {profile.created_at && (
          <>Joined {new Date(profile.created_at).toLocaleDateString()}</>
        )}
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
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

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-muted-foreground">{label}:</span> <span>{value}</span>
    </div>
  );
}
