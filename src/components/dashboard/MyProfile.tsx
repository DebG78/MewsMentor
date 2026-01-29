import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import {
  User,
  Edit,
  Save,
  Clock,
  MapPin,
  Languages,
  Briefcase,
  Target,
  Calendar,
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import type { Database } from "@/types/database";

type MenteeRow = Database["public"]["Tables"]["mentees"]["Row"];
type MentorRow = Database["public"]["Tables"]["mentors"]["Row"];

interface MyProfileProps {
  userId: string;
  userType: "mentor" | "mentee";
  userData: MenteeRow | MentorRow | null;
}

export const MyProfile = ({ userId, userType, userData }: MyProfileProps) => {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setSaving] = useState(false);
  const [profileData, setProfileData] = useState<any>(userData || {});

  const handleSave = async () => {
    setSaving(true);
    try {
      // TODO: Implement profile update API call
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call

      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
      setIsEditing(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getProfileCompleteness = () => {
    if (!userData) return { percentage: 0, missing: [] };

    const requiredFields = userType === "mentor"
      ? ["role", "topics_to_mentor", "experience_years", "location_timezone"]
      : ["role", "topics_to_learn", "meeting_frequency", "location_timezone"];

    const completed = requiredFields.filter(field => userData[field as keyof typeof userData]);
    const missing = requiredFields.filter(field => !userData[field as keyof typeof userData]);

    return {
      percentage: Math.round((completed.length / requiredFields.length) * 100),
      missing
    };
  };

  const completeness = getProfileCompleteness();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">My Profile</h2>
          <p className="text-muted-foreground">
            Manage your {userType} profile and preferences
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={completeness.percentage === 100 ? "default" : "secondary"}>
            {completeness.percentage}% Complete
          </Badge>
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                <Save className="w-4 h-4 mr-2" />
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Profile Completeness Alert */}
      {completeness.percentage < 100 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Your profile is {completeness.percentage}% complete.
            Complete missing fields to improve your matching accuracy.
          </AlertDescription>
        </Alert>
      )}

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Basic Information
          </CardTitle>
          <CardDescription>
            Your core profile details and role information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              {isEditing ? (
                <Input
                  id="role"
                  value={profileData.role || ""}
                  onChange={(e) => setProfileData({...profileData, role: e.target.value})}
                  placeholder="Your current role"
                />
              ) : (
                <p className="text-sm py-2">{userData?.role || "Not specified"}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="pronouns">Pronouns</Label>
              {isEditing ? (
                <Input
                  id="pronouns"
                  value={profileData.pronouns || ""}
                  onChange={(e) => setProfileData({...profileData, pronouns: e.target.value})}
                  placeholder="Your pronouns"
                />
              ) : (
                <p className="text-sm py-2">{userData?.pronouns || "Not specified"}</p>
              )}
            </div>
          </div>

          {userType === "mentor" && (
            <div className="space-y-2">
              <Label htmlFor="experience">Experience Years</Label>
              {isEditing ? (
                <Input
                  id="experience"
                  type="number"
                  value={profileData.experience_years || ""}
                  onChange={(e) => setProfileData({...profileData, experience_years: parseInt(e.target.value)})}
                  placeholder="Years of experience"
                />
              ) : (
                <p className="text-sm py-2">
                  {(userData as MentorRow)?.experience_years || "Not specified"} years
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Skills & Topics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            {userType === "mentor" ? "Topics I Mentor" : "Topics I Want to Learn"}
          </CardTitle>
          <CardDescription>
            {userType === "mentor"
              ? "Areas where you provide guidance and expertise"
              : "Skills and topics you want to develop"
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditing ? (
            <Textarea
              value={Array.isArray(profileData[userType === "mentor" ? "topics_to_mentor" : "topics_to_learn"])
                ? profileData[userType === "mentor" ? "topics_to_mentor" : "topics_to_learn"].join(", ")
                : profileData[userType === "mentor" ? "topics_to_mentor" : "topics_to_learn"] || ""}
              onChange={(e) => setProfileData({
                ...profileData,
                [userType === "mentor" ? "topics_to_mentor" : "topics_to_learn"]: e.target.value.split(", ").filter(t => t.trim())
              })}
              placeholder="Enter topics separated by commas"
              rows={3}
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              {(Array.isArray(userData?.[userType === "mentor" ? "topics_to_mentor" : "topics_to_learn"])
                ? userData[userType === "mentor" ? "topics_to_mentor" : "topics_to_learn"]
                : userData?.[userType === "mentor" ? "topics_to_mentor" : "topics_to_learn"]?.split?.(",") || [])
                .map((topic: string, index: number) => (
                <Badge key={index} variant="secondary">{topic.trim()}</Badge>
              ))}
              {(!userData?.[userType === "mentor" ? "topics_to_mentor" : "topics_to_learn"] ||
                (Array.isArray(userData[userType === "mentor" ? "topics_to_mentor" : "topics_to_learn"]) &&
                 userData[userType === "mentor" ? "topics_to_mentor" : "topics_to_learn"].length === 0)) && (
                <p className="text-sm text-muted-foreground">No topics specified</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Location & Availability */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Location & Availability
          </CardTitle>
          <CardDescription>
            Your timezone and meeting preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              {isEditing ? (
                <Input
                  id="timezone"
                  value={profileData.location_timezone || ""}
                  onChange={(e) => setProfileData({...profileData, location_timezone: e.target.value})}
                  placeholder="Your timezone"
                />
              ) : (
                <p className="text-sm py-2">{userData?.location_timezone || "Not specified"}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="frequency">Meeting Frequency</Label>
              {isEditing ? (
                <Input
                  id="frequency"
                  value={profileData.meeting_frequency || ""}
                  onChange={(e) => setProfileData({...profileData, meeting_frequency: e.target.value})}
                  placeholder="Preferred meeting frequency"
                />
              ) : (
                <p className="text-sm py-2">{userData?.meeting_frequency || "Not specified"}</p>
              )}
            </div>
          </div>

          {isEditing && (
            <div className="space-y-2">
              <Label htmlFor="availability">Additional Availability Notes</Label>
              <Textarea
                id="availability"
                value={profileData.availability_notes || ""}
                onChange={(e) => setProfileData({...profileData, availability_notes: e.target.value})}
                placeholder="Share any specific availability preferences or constraints"
                rows={2}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Languages & Communication */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Languages className="w-5 h-5" />
            Languages & Communication
          </CardTitle>
          <CardDescription>
            Languages you speak and communication preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="languages">Languages</Label>
            {isEditing ? (
              <Input
                id="languages"
                value={Array.isArray(profileData.languages)
                  ? profileData.languages.join(", ")
                  : profileData.languages || ""}
                onChange={(e) => setProfileData({
                  ...profileData,
                  languages: e.target.value.split(", ").filter(l => l.trim())
                })}
                placeholder="Languages you speak (comma separated)"
              />
            ) : (
              <div className="flex flex-wrap gap-2">
                {(Array.isArray(userData?.languages)
                  ? userData.languages
                  : userData?.languages?.split?.(",") || [])
                  .map((lang: string, index: number) => (
                  <Badge key={index} variant="outline">{lang.trim()}</Badge>
                ))}
                {(!userData?.languages ||
                  (Array.isArray(userData.languages) && userData.languages.length === 0)) && (
                  <p className="text-sm text-muted-foreground">No languages specified</p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Personal Goals & Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Personal Goals & Notes
          </CardTitle>
          <CardDescription>
            Track your mentoring goals and add personal notes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="goals">
              {userType === "mentor" ? "Mentoring Goals" : "Learning Goals"}
            </Label>
            <Textarea
              id="goals"
              value={profileData.personal_goals || ""}
              onChange={(e) => setProfileData({...profileData, personal_goals: e.target.value})}
              placeholder={userType === "mentor"
                ? "What do you hope to achieve as a mentor this cycle?"
                : "What are your specific learning objectives for this mentoring relationship?"
              }
              rows={3}
              disabled={!isEditing}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Private Notes</Label>
            <Textarea
              id="notes"
              value={profileData.private_notes || ""}
              onChange={(e) => setProfileData({...profileData, private_notes: e.target.value})}
              placeholder="Add personal notes, reflections, or reminders (only visible to you)"
              rows={3}
              disabled={!isEditing}
            />
          </div>
        </CardContent>
      </Card>

      {/* Profile Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 border rounded-lg">
              <Calendar className="w-8 h-8 mx-auto mb-2 text-blue-600" />
              <p className="text-2xl font-bold">
                {userData?.created_date ?
                  Math.floor((Date.now() - new Date(userData.created_date).getTime()) / (1000 * 60 * 60 * 24))
                  : 0}
              </p>
              <p className="text-sm text-muted-foreground">Days since joining</p>
            </div>

            <div className="text-center p-4 border rounded-lg">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-600" />
              <p className="text-2xl font-bold">{completeness.percentage}%</p>
              <p className="text-sm text-muted-foreground">Profile complete</p>
            </div>

            <div className="text-center p-4 border rounded-lg">
              <Clock className="w-8 h-8 mx-auto mb-2 text-purple-600" />
              <p className="text-2xl font-bold">
                {userData?.updated_at ?
                  Math.floor((Date.now() - new Date(userData.updated_at).getTime()) / (1000 * 60 * 60 * 24))
                  : 0}
              </p>
              <p className="text-sm text-muted-foreground">Days since last update</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};