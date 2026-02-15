import React, { useState } from "react";
import { MentorData, MenteeData } from "@/types/mentoring";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  User,
  Target,
  MessageCircle,
  Star,
  Zap,
  Globe,
  X,
  Plus,
  Save,
  XCircle,
} from "lucide-react";

interface ProfileEditFormProps {
  profile: MentorData | MenteeData;
  type: "mentor" | "mentee";
  onSave: (updatedProfile: MentorData | MenteeData) => void;
  onCancel: () => void;
}

export function ProfileEditForm({ profile, type, onSave, onCancel }: ProfileEditFormProps) {
  const [formData, setFormData] = useState<any>({ ...profile });
  const isMentee = type === "mentee";

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSave(formData);
  };

  return (
    <div className="space-y-6">
      {/* Basic Info Section */}
      <Section icon={<User className="w-4 h-4" />} title="Basic information">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Name">
            <Input value={formData.name || ""} onChange={(e) => handleChange("name", e.target.value)} />
          </Field>
          <Field label="Pronouns">
            <Input value={formData.pronouns || ""} onChange={(e) => handleChange("pronouns", e.target.value)} />
          </Field>
          <Field label="Role">
            <Input value={formData.role || ""} onChange={(e) => handleChange("role", e.target.value)} />
          </Field>
          <Field label="Experience">
            <Input value={formData.experience_years || ""} onChange={(e) => handleChange("experience_years", e.target.value)} />
          </Field>
          <Field label="Location / Timezone">
            <Input value={formData.location_timezone || ""} onChange={(e) => handleChange("location_timezone", e.target.value)} />
          </Field>
          <Field label="Meeting frequency">
            <Input value={formData.meeting_frequency || ""} onChange={(e) => handleChange("meeting_frequency", e.target.value)} />
          </Field>
          <Field label="Industry">
            <Input value={formData.industry || ""} onChange={(e) => handleChange("industry", e.target.value)} />
          </Field>
          {!isMentee && (
            <Field label="Capacity (mentee slots)">
              <Input
                type="number"
                min="0"
                max="20"
                value={formData.capacity_remaining ?? 0}
                onChange={(e) => handleChange("capacity_remaining", parseInt(e.target.value) || 0)}
              />
            </Field>
          )}
        </div>
      </Section>

      {/* Languages */}
      <Section icon={<Globe className="w-4 h-4" />} title="Languages">
        <ArrayField
          items={formData.languages || []}
          placeholder="Add a language"
          onChange={(items) => handleChange("languages", items)}
        />
      </Section>

      {/* Topics */}
      <Section icon={<Target className="w-4 h-4" />} title={isMentee ? "Topics to learn" : "Topics to mentor"}>
        <ArrayField
          items={formData[isMentee ? "topics_to_learn" : "topics_to_mentor"] || []}
          placeholder="Add a topic"
          onChange={(items) => handleChange(isMentee ? "topics_to_learn" : "topics_to_mentor", items)}
        />
      </Section>

      {/* Mentee: Motivation & Goals */}
      {isMentee && (
        <Section icon={<MessageCircle className="w-4 h-4" />} title="Motivation & goals">
          <div className="space-y-3">
            <Field label="Why join the mentorship program?">
              <Textarea rows={2} value={formData.motivation || ""} onChange={(e) => handleChange("motivation", e.target.value)} />
            </Field>
            <Field label="Main reason for wanting a mentor">
              <Textarea rows={2} value={formData.main_reason || ""} onChange={(e) => handleChange("main_reason", e.target.value)} />
            </Field>
            <Field label="Program expectations">
              <Textarea rows={2} value={formData.expectations || ""} onChange={(e) => handleChange("expectations", e.target.value)} />
            </Field>
          </div>
        </Section>
      )}

      {/* Mentee: Preferences */}
      {isMentee && (
        <Section icon={<Star className="w-4 h-4" />} title="Mentor preferences">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Preferred style">
              <Input value={formData.preferred_mentor_style || ""} onChange={(e) => handleChange("preferred_mentor_style", e.target.value)} />
            </Field>
            <Field label="Preferred energy">
              <Input value={formData.preferred_mentor_energy || ""} onChange={(e) => handleChange("preferred_mentor_energy", e.target.value)} />
            </Field>
            <Field label="Feedback preference">
              <Input value={formData.feedback_preference || ""} onChange={(e) => handleChange("feedback_preference", e.target.value)} />
            </Field>
            <Field label="Mentor experience importance">
              <Input value={formData.mentor_experience_importance || ""} onChange={(e) => handleChange("mentor_experience_importance", e.target.value)} />
            </Field>
          </div>
          <div className="space-y-3 mt-3">
            <Field label="Desired mentor qualities">
              <Textarea rows={2} value={formData.desired_qualities || ""} onChange={(e) => handleChange("desired_qualities", e.target.value)} />
            </Field>
            <Field label="What NOT wanted in a mentor">
              <Textarea rows={2} value={formData.what_not_wanted || ""} onChange={(e) => handleChange("what_not_wanted", e.target.value)} />
            </Field>
          </div>
        </Section>
      )}

      {/* Mentor: Approach */}
      {!isMentee && (
        <Section icon={<Zap className="w-4 h-4" />} title="Mentoring approach">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Mentoring style">
              <Input value={formData.mentoring_style || ""} onChange={(e) => handleChange("mentoring_style", e.target.value)} />
            </Field>
            <Field label="Meeting style">
              <Input value={formData.meeting_style || ""} onChange={(e) => handleChange("meeting_style", e.target.value)} />
            </Field>
            <Field label="Mentor energy">
              <Input value={formData.mentor_energy || ""} onChange={(e) => handleChange("mentor_energy", e.target.value)} />
            </Field>
            <Field label="Feedback style">
              <Input value={formData.feedback_style || ""} onChange={(e) => handleChange("feedback_style", e.target.value)} />
            </Field>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <Checkbox
              id="has_mentored_before"
              checked={formData.has_mentored_before || false}
              onCheckedChange={(checked) => handleChange("has_mentored_before", !!checked)}
            />
            <Label htmlFor="has_mentored_before" className="text-sm cursor-pointer">Has mentored before</Label>
          </div>
          <div className="mt-3">
            <Label className="text-xs text-muted-foreground">Preferred mentee levels</Label>
            <ArrayField
              items={formData.preferred_mentee_levels || []}
              placeholder="e.g. Early-career, Mid-level"
              onChange={(items) => handleChange("preferred_mentee_levels", items)}
            />
          </div>
          <div className="mt-3">
            <Label className="text-xs text-muted-foreground">Topics NOT to mentor</Label>
            <ArrayField
              items={formData.topics_not_to_mentor || []}
              placeholder="Add a topic to exclude"
              onChange={(items) => handleChange("topics_not_to_mentor", items)}
            />
          </div>
        </Section>
      )}

      {/* Mentor: Motivation */}
      {!isMentee && (
        <Section icon={<MessageCircle className="w-4 h-4" />} title="Motivation">
          <div className="space-y-3">
            <Field label="What do you hope to gain from being a mentor?">
              <Textarea rows={2} value={formData.motivation || ""} onChange={(e) => handleChange("motivation", e.target.value)} />
            </Field>
            <Field label="Program expectations">
              <Textarea rows={2} value={formData.expectations || ""} onChange={(e) => handleChange("expectations", e.target.value)} />
            </Field>
          </div>
        </Section>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>
          <XCircle className="w-4 h-4 mr-2" />
          Cancel
        </Button>
        <Button onClick={handleSave}>
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>
    </div>
  );
}

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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function ArrayField({ items, placeholder, onChange }: { items: string[]; placeholder: string; onChange: (items: string[]) => void }) {
  const [inputValue, setInputValue] = useState("");

  const addItem = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !items.includes(trimmed)) {
      onChange([...items, trimmed]);
    }
    setInputValue("");
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={placeholder}
          className="text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addItem();
            }
          }}
        />
        <Button type="button" variant="outline" size="sm" onClick={addItem} className="shrink-0 px-2">
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item, index) => (
            <Badge key={index} variant="secondary" className="text-xs font-normal pr-1 gap-1">
              {item}
              <button onClick={() => removeItem(index)} className="ml-0.5 hover:bg-muted rounded-sm">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
