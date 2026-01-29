import React, { useState } from "react";
import { MentorData, MenteeData } from "@/types/mentoring";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Plus, Save, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProfileEditFormProps {
  profile: MentorData | MenteeData;
  type: "mentor" | "mentee";
  onSave: (updatedProfile: MentorData | MenteeData) => void;
  onCancel: () => void;
}

export function ProfileEditForm({ profile, type, onSave, onCancel }: ProfileEditFormProps) {
  const [formData, setFormData] = useState(profile);
  const [newTopic, setNewTopic] = useState("");
  const [newIndustry, setNewIndustry] = useState("");
  const [newLanguage, setNewLanguage] = useState("");
  const [newGoal, setNewGoal] = useState("");
  const { toast } = useToast();

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addToArray = (field: keyof (MentorData | MenteeData), value: string, setValue: (val: string) => void) => {
    if (!value.trim()) return;

    const currentArray = (formData[field] as string[]) || [];
    if (!currentArray.includes(value.trim())) {
      setFormData(prev => ({
        ...prev,
        [field]: [...currentArray, value.trim()]
      }));
    }
    setValue("");
  };

  const removeFromArray = (field: keyof (MentorData | MenteeData), index: number) => {
    const currentArray = (formData[field] as string[]) || [];
    setFormData(prev => ({
      ...prev,
      [field]: currentArray.filter((_, i) => i !== index)
    }));
  };

  const handleSave = () => {
    // Basic validation
    if (!formData.name?.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Name is required",
      });
      return;
    }

    if (!formData.role?.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Role is required",
      });
      return;
    }

    onSave(formData);
    toast({
      title: "Profile Updated",
      description: "Profile has been successfully updated",
    });
  };

  const experienceLevels = ["Junior", "Mid-level", "Senior", "Staff", "Principal", "Director", "VP", "C-Level"];
  const timezones = [
    "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
    "Europe/London", "Europe/Paris", "Europe/Berlin", "Asia/Tokyo", "Asia/Shanghai",
    "Australia/Sydney", "Pacific/Auckland"
  ];

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Edit {type === "mentor" ? "Mentor" : "Mentee"} Profile</CardTitle>
        <CardDescription>
          Update profile information and preferences
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Basic Information */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name || ""}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="Full name"
            />
          </div>

          <div>
            <Label htmlFor="role">Role *</Label>
            <Input
              id="role"
              value={formData.role || ""}
              onChange={(e) => handleInputChange("role", e.target.value)}
              placeholder="Job title"
            />
          </div>

          <div>
            <Label htmlFor="company">Company</Label>
            <Input
              id="company"
              value={formData.company || ""}
              onChange={(e) => handleInputChange("company", e.target.value)}
              placeholder="Company name"
            />
          </div>

          <div>
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location || ""}
              onChange={(e) => handleInputChange("location", e.target.value)}
              placeholder="City, Country"
            />
          </div>

          <div>
            <Label htmlFor="timezone">Timezone</Label>
            <Select
              value={formData.timezone || ""}
              onValueChange={(value) => handleInputChange("timezone", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {timezones.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz.replace(/_/g, ' ').replace(/\//g, ' / ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="experience_level">Experience Level</Label>
            <Select
              value={formData.experience_level || ""}
              onValueChange={(value) => handleInputChange("experience_level", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select experience level" />
              </SelectTrigger>
              <SelectContent>
                {experienceLevels.map((level) => (
                  <SelectItem key={level} value={level}>
                    {level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Mentor-specific fields */}
        {type === "mentor" && (
          <div>
            <Label htmlFor="capacity">Mentoring Capacity</Label>
            <Input
              id="capacity"
              type="number"
              value={(formData as MentorData).capacity || 0}
              onChange={(e) => handleInputChange("capacity", parseInt(e.target.value) || 0)}
              placeholder="Number of mentees"
              min="0"
              max="10"
            />
          </div>
        )}

        {/* Mentee-specific fields */}
        {type === "mentee" && (
          <div>
            <Label htmlFor="manager">Manager</Label>
            <Input
              id="manager"
              value={(formData as MenteeData).manager || ""}
              onChange={(e) => handleInputChange("manager", e.target.value)}
              placeholder="Manager name"
            />
          </div>
        )}

        <Separator />

        {/* Description */}
        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description || ""}
            onChange={(e) => handleInputChange("description", e.target.value)}
            placeholder={`Tell us about yourself and your ${type === "mentor" ? "mentoring approach" : "learning goals"}...`}
            rows={4}
          />
        </div>

        <Separator />

        {/* Topics */}
        <div>
          <Label>Topics</Label>
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                placeholder="Add a topic"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addToArray("topics", newTopic, setNewTopic);
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => addToArray("topics", newTopic, setNewTopic)}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(formData.topics || []).map((topic, index) => (
                <Badge key={index} variant="outline" className="pr-1">
                  {topic}
                  <button
                    onClick={() => removeFromArray("topics", index)}
                    className="ml-1 hover:bg-muted rounded-sm"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Goals (for mentees) */}
        {type === "mentee" && (
          <div>
            <Label>Learning Goals</Label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={newGoal}
                  onChange={(e) => setNewGoal(e.target.value)}
                  placeholder="Add a learning goal"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addToArray("goals", newGoal, setNewGoal);
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => addToArray("goals", newGoal, setNewGoal)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {((formData as MenteeData).goals || []).map((goal, index) => (
                  <Badge key={index} variant="outline" className="pr-1">
                    {goal}
                    <button
                      onClick={() => removeFromArray("goals", index)}
                      className="ml-1 hover:bg-muted rounded-sm"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Industries */}
        <div>
          <Label>Industries</Label>
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                value={newIndustry}
                onChange={(e) => setNewIndustry(e.target.value)}
                placeholder="Add an industry"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addToArray("industries", newIndustry, setNewIndustry);
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => addToArray("industries", newIndustry, setNewIndustry)}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(formData.industries || []).map((industry, index) => (
                <Badge key={index} variant="secondary" className="pr-1">
                  {industry}
                  <button
                    onClick={() => removeFromArray("industries", index)}
                    className="ml-1 hover:bg-muted rounded-sm"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Languages */}
        <div>
          <Label>Languages</Label>
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                value={newLanguage}
                onChange={(e) => setNewLanguage(e.target.value)}
                placeholder="Add a language"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addToArray("languages", newLanguage, setNewLanguage);
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => addToArray("languages", newLanguage, setNewLanguage)}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(formData.languages || []).map((language, index) => (
                <Badge key={index} variant="outline" className="pr-1">
                  {language}
                  <button
                    onClick={() => removeFromArray("languages", index)}
                    className="ml-1 hover:bg-muted rounded-sm"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Availability */}
        <div>
          <Label htmlFor="availability">Availability</Label>
          <Textarea
            id="availability"
            value={formData.availability || ""}
            onChange={(e) => handleInputChange("availability", e.target.value)}
            placeholder="Describe your availability (days, times, frequency)"
            rows={3}
          />
        </div>

        {/* Additional Info */}
        <div>
          <Label htmlFor="additional_info">Additional Information</Label>
          <Textarea
            id="additional_info"
            value={formData.additional_info || ""}
            onChange={(e) => handleInputChange("additional_info", e.target.value)}
            placeholder="Any additional information you'd like to share"
            rows={3}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-6">
          <Button variant="outline" onClick={onCancel}>
            <XCircle className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}