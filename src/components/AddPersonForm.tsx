import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight, X, User, UserPlus } from "lucide-react";
import { getAllCohorts, signupMentor, signupMentee } from "@/lib/cohortManager";
import { Cohort } from "@/types/mentoring";

const LIFE_EXPERIENCES = [
  "Returning from maternity/paternity/parental leave",
  "Navigating menopause or andropause",
  "Career break / sabbatical",
  "Relocation to a new country",
  "Career change or industry switch",
  "Managing health challenges (physical or mental)",
  "Stepping into leadership for the first time",
  "Promotions",
  "Internal moves",
  "Other"
];

const TOPICS_TO_MENTOR = [
  "Career growth & progression",
  "Leadership & management",
  "Technical / product knowledge",
  "Customer success & client relationships",
  "Communication & soft skills",
  "Cross-functional collaboration",
  "Strategic thinking & vision",
  "Change management / navigating transformation",
  "Diversity, equity & inclusion",
  "Work–life balance & wellbeing",
  "Other"
];

const TOPICS_TO_LEARN = [
  "Career growth & progression",
  "Leadership & management",
  "Technical / product knowledge",
  "Customer success & client relationships",
  "Communication & soft skills",
  "Cross-functional collaboration",
  "Strategic thinking & vision",
  "Change management / navigating transformation",
  "Diversity, equity & inclusion",
  "Work–life balance & wellbeing",
  "Other"
];

interface AddPersonFormProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'mentor' | 'mentee';
  selectedCohortId?: string;
  onSuccess: () => void;
}

export const AddPersonForm = ({ isOpen, onClose, type, selectedCohortId, onSuccess }: AddPersonFormProps) => {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;
  const [availableCohorts, setAvailableCohorts] = useState<Cohort[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Unified form data for both mentor and mentee
  const [formData, setFormData] = useState({
    // Common fields
    pronouns: "",
    role: "",
    experienceYears: "",
    locationTimezone: "",
    lifeExperiences: [] as string[],
    otherExperience: "",
    cohortId: selectedCohortId || "",

    // Mentor-specific fields
    topicsToMentor: [] as string[],
    otherTopics: "",
    hasMentoredBefore: "",
    mentoringStyle: "",
    meetingStyle: "",
    mentorEnergy: "",
    feedbackStyle: "",
    preferredMenteeLevel: "",
    topicsNotToMentor: "",
    meetingFrequency: "",
    motivation: "",
    expectations: "",

    // Mentee-specific fields
    hasParticipatedBefore: "",
    topicsToLearn: [] as string[],
    mainReason: "",
    preferredStyle: "",
    preferredEnergy: "",
    feedbackPreference: "",
    mentorExperienceImportance: "",
    unwantedQualities: "",
    mentorQualities: ""
  });

  // Load available cohorts
  useEffect(() => {
    const loadCohorts = async () => {
      try {
        const cohorts = await getAllCohorts();
        setAvailableCohorts(cohorts.filter(c => c.status === 'active' || c.status === 'draft'));
      } catch (error) {
        console.error('Error loading cohorts:', error);
      }
    };
    loadCohorts();
  }, []);

  // Reset form when dialog opens/closes or type changes
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setFormData({
        pronouns: "",
        role: "",
        experienceYears: "",
        locationTimezone: "",
        lifeExperiences: [],
        otherExperience: "",
        cohortId: selectedCohortId || "",
        topicsToMentor: [],
        otherTopics: "",
        hasMentoredBefore: "",
        mentoringStyle: "",
        meetingStyle: "",
        mentorEnergy: "",
        feedbackStyle: "",
        preferredMenteeLevel: "",
        topicsNotToMentor: "",
        meetingFrequency: "",
        motivation: "",
        expectations: "",
        hasParticipatedBefore: "",
        topicsToLearn: [],
        mainReason: "",
        preferredStyle: "",
        preferredEnergy: "",
        feedbackPreference: "",
        mentorExperienceImportance: "",
        unwantedQualities: "",
        mentorQualities: ""
      });
    }
  }, [isOpen, type, selectedCohortId]);

  const handleCheckboxChange = (field: 'lifeExperiences' | 'topicsToMentor' | 'topicsToLearn', value: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: checked
        ? [...prev[field], value]
        : prev[field].filter(item => item !== value)
    }));
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      let result;

      if (type === 'mentor') {
        result = await signupMentor({
          pronouns: formData.pronouns,
          role: formData.role,
          experienceYears: formData.experienceYears,
          locationTimezone: formData.locationTimezone,
          lifeExperiences: formData.lifeExperiences,
          otherExperiences: formData.otherExperience,
          topicsToMentor: formData.topicsToMentor,
          otherTopics: formData.otherTopics,
          hasMentoredBefore: formData.hasMentoredBefore === "yes",
          mentoringStyle: formData.mentoringStyle,
          meetingStyle: formData.meetingStyle,
          mentorEnergy: formData.mentorEnergy,
          feedbackStyle: formData.feedbackStyle,
          preferredMenteeLevel: formData.preferredMenteeLevel,
          topicsNotToMentor: formData.topicsNotToMentor,
          meetingFrequency: formData.meetingFrequency,
          motivation: formData.motivation,
          expectations: formData.expectations,
          cohortId: formData.cohortId || undefined
        });
      } else {
        result = await signupMentee({
          pronouns: formData.pronouns,
          role: formData.role,
          experienceYears: formData.experienceYears,
          locationTimezone: formData.locationTimezone,
          lifeExperiences: formData.lifeExperiences,
          otherExperience: formData.otherExperience,
          hasParticipatedBefore: formData.hasParticipatedBefore === "yes",
          topicsToLearn: formData.topicsToLearn,
          otherTopics: formData.otherTopics,
          motivation: formData.motivation,
          mainReason: formData.mainReason,
          preferredStyle: formData.preferredStyle,
          preferredEnergy: formData.preferredEnergy,
          feedbackPreference: formData.feedbackPreference,
          mentorExperienceImportance: formData.mentorExperienceImportance,
          unwantedQualities: formData.unwantedQualities,
          meetingFrequency: formData.meetingFrequency,
          mentorQualities: formData.mentorQualities,
          expectations: formData.expectations,
          cohortId: formData.cohortId || undefined
        });
      }

      if (result.success) {
        toast({
          title: `${type === 'mentor' ? 'Mentor' : 'Mentee'} Added Successfully!`,
          description: formData.cohortId
            ? `The ${type} has been added to the selected cohort.`
            : `The ${type} has been added to the holding area for admin assignment.`,
        });
        onSuccess();
        onClose();
      } else {
        throw new Error(result.error || "Failed to add person");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to add ${type}. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <Label htmlFor="pronouns">Do you want to share your pronouns? (Optional)</Label>
        <Input
          id="pronouns"
          value={formData.pronouns}
          onChange={(e) => setFormData(prev => ({ ...prev, pronouns: e.target.value }))}
          placeholder="e.g., she/her, he/him, they/them"
        />
      </div>

      <div>
        <Label htmlFor="role">What's your current role at Mews? *</Label>
        <Input
          id="role"
          value={formData.role}
          onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
          placeholder="e.g., Senior Software Engineer, VP of Product"
          required
        />
      </div>

      <div>
        <Label htmlFor="experience">How many years of work experience do you have? *</Label>
        <Select value={formData.experienceYears} onValueChange={(value) => setFormData(prev => ({ ...prev, experienceYears: value }))}>
          <SelectTrigger>
            <SelectValue placeholder="Select experience level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2-3">2-3 years</SelectItem>
            <SelectItem value="4-6">4-6 years</SelectItem>
            <SelectItem value="7-10">7-10 years</SelectItem>
            <SelectItem value="10-15">10-15 years</SelectItem>
            <SelectItem value="15+">15+ years</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="location">Where are you based (location/time zone)? *</Label>
        <Input
          id="location"
          value={formData.locationTimezone}
          onChange={(e) => setFormData(prev => ({ ...prev, locationTimezone: e.target.value }))}
          placeholder="e.g., London, UK (GMT) or San Francisco, CA (PST)"
          required
        />
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <Label className="text-base font-medium">Which experiences have you navigated that you could help others with? (Select all that apply)</Label>
        <div className="mt-3 space-y-3">
          {LIFE_EXPERIENCES.map((experience) => (
            <div key={experience} className="flex items-center space-x-2">
              <Checkbox
                id={experience}
                checked={formData.lifeExperiences.includes(experience)}
                onCheckedChange={(checked) => handleCheckboxChange('lifeExperiences', experience, checked as boolean)}
              />
              <Label htmlFor={experience} className="text-sm font-normal">{experience}</Label>
            </div>
          ))}
        </div>
      </div>

      {formData.lifeExperiences.includes("Other") && (
        <div>
          <Label htmlFor="otherExperiences">You picked Other - we'd love to hear more. What experience would you add?</Label>
          <Textarea
            id="otherExperiences"
            value={formData.otherExperience}
            onChange={(e) => setFormData(prev => ({ ...prev, otherExperience: e.target.value }))}
            placeholder="Please describe the experience..."
          />
        </div>
      )}

      {/* Mentor-specific topics */}
      {type === 'mentor' && (
        <>
          <div>
            <Label className="text-base font-medium">What areas could you mentor on? (Select all that apply)</Label>
            <div className="mt-3 space-y-3">
              {TOPICS_TO_MENTOR.map((topic) => (
                <div key={topic} className="flex items-center space-x-2">
                  <Checkbox
                    id={topic}
                    checked={formData.topicsToMentor.includes(topic)}
                    onCheckedChange={(checked) => handleCheckboxChange('topicsToMentor', topic, checked as boolean)}
                  />
                  <Label htmlFor={topic} className="text-sm font-normal">{topic}</Label>
                </div>
              ))}
            </div>
          </div>

          {formData.topicsToMentor.includes("Other") && (
            <div>
              <Label htmlFor="otherTopics">You picked Other - we'd love to hear more. What topic would you add?</Label>
              <Textarea
                id="otherTopics"
                value={formData.otherTopics}
                onChange={(e) => setFormData(prev => ({ ...prev, otherTopics: e.target.value }))}
                placeholder="Please describe the topic..."
              />
            </div>
          )}

          <div>
            <Label className="text-base font-medium">Have you mentored before?</Label>
            <RadioGroup
              value={formData.hasMentoredBefore}
              onValueChange={(value) => setFormData(prev => ({ ...prev, hasMentoredBefore: value }))}
              className="mt-3"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="mentored-yes" />
                <Label htmlFor="mentored-yes">Yes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="mentored-no" />
                <Label htmlFor="mentored-no">No</Label>
              </div>
            </RadioGroup>
          </div>
        </>
      )}

      {/* Mentee-specific topics */}
      {type === 'mentee' && (
        <>
          <div>
            <Label className="text-base font-medium">What areas would you like to learn about? (Select all that apply)</Label>
            <div className="mt-3 space-y-3">
              {TOPICS_TO_LEARN.map((topic) => (
                <div key={topic} className="flex items-center space-x-2">
                  <Checkbox
                    id={topic}
                    checked={formData.topicsToLearn.includes(topic)}
                    onCheckedChange={(checked) => handleCheckboxChange('topicsToLearn', topic, checked as boolean)}
                  />
                  <Label htmlFor={topic} className="text-sm font-normal">{topic}</Label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-base font-medium">Have you participated in a mentorship program before?</Label>
            <RadioGroup
              value={formData.hasParticipatedBefore}
              onValueChange={(value) => setFormData(prev => ({ ...prev, hasParticipatedBefore: value }))}
              className="mt-3"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="participated-yes" />
                <Label htmlFor="participated-yes">Yes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="participated-no" />
                <Label htmlFor="participated-no">No</Label>
              </div>
            </RadioGroup>
          </div>
        </>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      {type === 'mentor' ? (
        // Mentor-specific step 3
        <>
          <div>
            <Label htmlFor="mentoringStyle">🤝 Your mentoring style — How would you describe your preferred mentoring style?</Label>
            <Textarea
              id="mentoringStyle"
              value={formData.mentoringStyle}
              onChange={(e) => setFormData(prev => ({ ...prev, mentoringStyle: e.target.value }))}
              placeholder="Describe your mentoring approach and style..."
            />
          </div>

          <div>
            <Label htmlFor="meetingStyle">What type of meeting style do you usually prefer?</Label>
            <Textarea
              id="meetingStyle"
              value={formData.meetingStyle}
              onChange={(e) => setFormData(prev => ({ ...prev, meetingStyle: e.target.value }))}
              placeholder="Describe your preferred meeting format and structure..."
            />
          </div>

          <div>
            <Label htmlFor="mentorEnergy">How would you describe your energy as a mentor?</Label>
            <Textarea
              id="mentorEnergy"
              value={formData.mentorEnergy}
              onChange={(e) => setFormData(prev => ({ ...prev, mentorEnergy: e.target.value }))}
              placeholder="Describe your energy and approach when mentoring..."
            />
          </div>

          <div>
            <Label htmlFor="feedbackStyle">What's your feedback style?</Label>
            <Textarea
              id="feedbackStyle"
              value={formData.feedbackStyle}
              onChange={(e) => setFormData(prev => ({ ...prev, feedbackStyle: e.target.value }))}
              placeholder="Describe how you typically give feedback..."
            />
          </div>

          <div>
            <Label htmlFor="preferredLevel">What level of mentee do you prefer to work with?</Label>
            <Select value={formData.preferredMenteeLevel} onValueChange={(value) => setFormData(prev => ({ ...prev, preferredMenteeLevel: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select preferred mentee level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="early-career">Early-career</SelectItem>
                <SelectItem value="mid-level">Mid-level</SelectItem>
                <SelectItem value="senior-stretch">Senior stretch role</SelectItem>
                <SelectItem value="no-preference">No preference</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      ) : (
        // Mentee-specific step 3
        <>
          <div>
            <Label htmlFor="motivation">💡 Motivation — What do you hope to gain from this mentorship program?</Label>
            <Textarea
              id="motivation"
              value={formData.motivation}
              onChange={(e) => setFormData(prev => ({ ...prev, motivation: e.target.value }))}
              placeholder="Share what you hope to achieve through mentorship..."
            />
          </div>

          <div>
            <Label htmlFor="mainReason">What's the main reason you're looking for a mentor?</Label>
            <Textarea
              id="mainReason"
              value={formData.mainReason}
              onChange={(e) => setFormData(prev => ({ ...prev, mainReason: e.target.value }))}
              placeholder="Share your primary motivation for seeking mentorship..."
            />
          </div>

          <div>
            <Label htmlFor="preferredStyle">What type of mentoring style would you prefer?</Label>
            <Textarea
              id="preferredStyle"
              value={formData.preferredStyle}
              onChange={(e) => setFormData(prev => ({ ...prev, preferredStyle: e.target.value }))}
              placeholder="Describe your preferred mentoring approach..."
            />
          </div>

          <div>
            <Label htmlFor="preferredEnergy">What type of energy would you prefer in a mentor?</Label>
            <Textarea
              id="preferredEnergy"
              value={formData.preferredEnergy}
              onChange={(e) => setFormData(prev => ({ ...prev, preferredEnergy: e.target.value }))}
              placeholder="Describe the energy and personality you're looking for..."
            />
          </div>
        </>
      )}
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      {type === 'mentor' ? (
        // Mentor-specific step 4
        <>
          <div>
            <Label htmlFor="topicsNotToMentor">Are there any topics you would prefer NOT to mentor on?</Label>
            <Textarea
              id="topicsNotToMentor"
              value={formData.topicsNotToMentor}
              onChange={(e) => setFormData(prev => ({ ...prev, topicsNotToMentor: e.target.value }))}
              placeholder="List any topics you'd prefer to avoid..."
            />
          </div>

          <div>
            <Label htmlFor="meetingFrequency">How often would you ideally like to meet with a mentee?</Label>
            <Select value={formData.meetingFrequency} onValueChange={(value) => setFormData(prev => ({ ...prev, meetingFrequency: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select meeting frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="as-needed">As needed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="motivation">💡 Motivation — What do you hope to gain from being a mentor?</Label>
            <Textarea
              id="motivation"
              value={formData.motivation}
              onChange={(e) => setFormData(prev => ({ ...prev, motivation: e.target.value }))}
              placeholder="Share what motivates you to mentor others..."
            />
          </div>

          <div>
            <Label htmlFor="expectations">🙌 Expectations — What expectations do you have for the mentorship program?</Label>
            <Textarea
              id="expectations"
              value={formData.expectations}
              onChange={(e) => setFormData(prev => ({ ...prev, expectations: e.target.value }))}
              placeholder="Share your expectations for the program..."
            />
          </div>
        </>
      ) : (
        // Mentee-specific step 4
        <>
          <div>
            <Label htmlFor="feedbackPreference">What's your preferred feedback style?</Label>
            <Textarea
              id="feedbackPreference"
              value={formData.feedbackPreference}
              onChange={(e) => setFormData(prev => ({ ...prev, feedbackPreference: e.target.value }))}
              placeholder="Describe how you prefer to receive feedback..."
            />
          </div>

          <div>
            <Label htmlFor="mentorExperienceImportance">How important is it that your mentor has specific experience in your field?</Label>
            <Select value={formData.mentorExperienceImportance} onValueChange={(value) => setFormData(prev => ({ ...prev, mentorExperienceImportance: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select importance level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="very-important">Very important</SelectItem>
                <SelectItem value="somewhat-important">Somewhat important</SelectItem>
                <SelectItem value="not-important">Not important</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="unwantedQualities">Are there any qualities or approaches you would NOT want in a mentor?</Label>
            <Textarea
              id="unwantedQualities"
              value={formData.unwantedQualities}
              onChange={(e) => setFormData(prev => ({ ...prev, unwantedQualities: e.target.value }))}
              placeholder="Describe any qualities you'd prefer to avoid..."
            />
          </div>

          <div>
            <Label htmlFor="meetingFrequency">How often would you ideally like to meet with a mentor?</Label>
            <Select value={formData.meetingFrequency} onValueChange={(value) => setFormData(prev => ({ ...prev, meetingFrequency: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select meeting frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="as-needed">As needed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="mentorQualities">What qualities are you looking for in a mentor?</Label>
            <Textarea
              id="mentorQualities"
              value={formData.mentorQualities}
              onChange={(e) => setFormData(prev => ({ ...prev, mentorQualities: e.target.value }))}
              placeholder="Describe the qualities you value in a mentor..."
            />
          </div>

          <div>
            <Label htmlFor="expectations">🙌 Expectations — What expectations do you have for the mentorship program?</Label>
            <Textarea
              id="expectations"
              value={formData.expectations}
              onChange={(e) => setFormData(prev => ({ ...prev, expectations: e.target.value }))}
              placeholder="Share your expectations for the program..."
            />
          </div>
        </>
      )}
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold mb-2">🎯 Choose Cohort</h3>
        <p className="text-muted-foreground">
          {selectedCohortId
            ? "This person will be added to the selected cohort."
            : "Select an existing cohort to join, or leave blank to be assigned to holding area."
          }
        </p>
      </div>

      <div>
        <Label htmlFor="cohort">Select a Cohort</Label>
        <Select
          value={formData.cohortId || "unassigned"}
          onValueChange={(value) => setFormData(prev => ({ ...prev, cohortId: value === "unassigned" ? "" : value }))}
          disabled={!!selectedCohortId}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose a cohort or leave blank for holding area" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">No cohort selected (holding area)</SelectItem>
            {availableCohorts.map((cohort) => (
              <SelectItem key={cohort.id} value={cohort.id}>
                {cohort.name} ({cohort.status})
                {cohort.description && ` - ${cohort.description}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {formData.cohortId && formData.cohortId !== "unassigned" && (
        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700">
            <strong>Selected:</strong> {availableCohorts.find(c => c.id === formData.cohortId)?.name}
          </p>
          <p className="text-xs text-blue-600 mt-1">
            This {type} will be added directly to this cohort and can start being matched immediately.
          </p>
        </div>
      )}

      {!formData.cohortId && (
        <div className="p-4 bg-yellow-50 rounded-lg">
          <p className="text-sm text-yellow-700">
            <strong>No cohort selected:</strong> This {type} will be placed in the holding area.
          </p>
          <p className="text-xs text-yellow-600 mt-1">
            You can assign them to a cohort later from the admin dashboard.
          </p>
        </div>
      )}
    </div>
  );

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.role && formData.experienceYears && formData.locationTimezone;
      case 2:
        if (type === 'mentor') {
          return formData.lifeExperiences.length > 0 && formData.topicsToMentor.length > 0 && formData.hasMentoredBefore;
        } else {
          return formData.lifeExperiences.length > 0 && formData.topicsToLearn.length > 0 && formData.hasParticipatedBefore;
        }
      case 3:
        if (type === 'mentor') {
          return formData.mentoringStyle && formData.meetingStyle && formData.mentorEnergy && formData.feedbackStyle;
        } else {
          return formData.motivation && formData.mainReason && formData.preferredStyle && formData.preferredEnergy;
        }
      case 4:
        if (type === 'mentor') {
          return formData.meetingFrequency;
        } else {
          return formData.feedbackPreference && formData.mentorExperienceImportance && formData.meetingFrequency;
        }
      case 5:
        return true; // Cohort selection is optional
      default:
        return false;
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {type === 'mentor' ? (
                <User className="w-6 h-6 text-green-600" />
              ) : (
                <UserPlus className="w-6 h-6 text-blue-600" />
              )}
              <div>
                <DialogTitle>Add New {type === 'mentor' ? 'Mentor' : 'Mentee'}</DialogTitle>
                <DialogDescription>
                  Complete the same survey that {type}s fill out when they sign up.
                </DialogDescription>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Step {currentStep} of {totalSteps}</span>
            <div className="w-64 bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              />
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
          {currentStep === 5 && renderStep5()}

          <div className="flex justify-between pt-6">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

            {currentStep < totalSteps ? (
              <Button
                onClick={() => setCurrentStep(prev => prev + 1)}
                disabled={!canProceed()}
              >
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!canProceed() || isSubmitting}
              >
                {isSubmitting ? "Adding..." : `Add ${type === 'mentor' ? 'Mentor' : 'Mentee'}`}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};