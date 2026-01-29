import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { getAllCohorts, signupMentee } from "@/lib/cohortManager";
import { Cohort } from "@/types/mentoring";
import { createUserSession } from "@/contexts/UserContext";

const LIFE_EXPERIENCES = [
  "Returning from maternity/paternity/parental leave",
  "Navigating menopause or andropause",
  "Career break / sabbatical",
  "Relocation to a new country",
  "Career change or industry switch",
  "Managing health challenges (physical or mental)",
  "Stepping into leadership for the first time",
  "Working towards a promotion",
  "Thinking about an internal move",
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

const MenteeSignup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5; // Added cohort selection step
  const [availableCohorts, setAvailableCohorts] = useState<Cohort[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    pronouns: "",
    role: "",
    experienceYears: "",
    locationTimezone: "",
    lifeExperiences: [] as string[],
    otherExperience: "",
    hasParticipatedBefore: "",
    topicsToLearn: [] as string[],
    otherTopics: "",
    motivation: "",
    mainReason: "",
    preferredStyle: "",
    preferredEnergy: "",
    feedbackPreference: "",
    mentorExperienceImportance: "",
    unwantedQualities: "",
    meetingFrequency: "",
    mentorQualities: "",
    expectations: "",
    cohortId: "" // Optional cohort selection
  });

  // Load available cohorts
  useEffect(() => {
    const loadCohorts = async () => {
      try {
        const cohorts = await getAllCohorts();
        // Only show active and draft cohorts for signup
        setAvailableCohorts(cohorts.filter(c => c.status === 'active' || c.status === 'draft'));
      } catch (error) {
        console.error('Error loading cohorts:', error);
      }
    };
    loadCohorts();
  }, []);

  const handleCheckboxChange = (field: 'lifeExperiences' | 'topicsToLearn', value: string, checked: boolean) => {
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
      const result = await signupMentee({
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

      if (result.success && result.userId) {
        // Create user session
        await createUserSession(result.userId);

        toast({
          title: "Registration Successful!",
          description: formData.cohortId
            ? "Welcome to the mentorship program. You've been added to your selected cohort."
            : "Welcome to the mentorship program. An admin will assign you to a cohort soon.",
        });
        navigate('/dashboard');
      } else {
        throw new Error(result.error || "Registration failed");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit registration. Please try again.",
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
          placeholder="e.g., Software Engineer, Product Manager"
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
            <SelectItem value="0-1">0-1 years</SelectItem>
            <SelectItem value="2-3">2-3 years</SelectItem>
            <SelectItem value="4-6">4-6 years</SelectItem>
            <SelectItem value="7-10">7-10 years</SelectItem>
            <SelectItem value="10+">10+ years</SelectItem>
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
        <Label className="text-base font-medium">Which of these experiences resonate with you? (Select all that apply)</Label>
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
          <Label htmlFor="otherExperience">You picked Other - we'd love to hear more. What experience would you add?</Label>
          <Textarea
            id="otherExperience"
            value={formData.otherExperience}
            onChange={(e) => setFormData(prev => ({ ...prev, otherExperience: e.target.value }))}
            placeholder="Please describe the experience..."
          />
        </div>
      )}

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
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div>
        <Label className="text-base font-medium">What areas would you like mentoring on? (Select all that apply)</Label>
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

      {formData.topicsToLearn.includes("Other") && (
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
        <Label htmlFor="motivation">💡 Motivation — Why would you like to join the mentorship program?</Label>
        <Textarea
          id="motivation"
          value={formData.motivation}
          onChange={(e) => setFormData(prev => ({ ...prev, motivation: e.target.value }))}
          placeholder="Share your motivation..."
        />
      </div>

      <div>
        <Label htmlFor="mainReason">What's the main reason you'd like a mentor?</Label>
        <Textarea
          id="mainReason"
          value={formData.mainReason}
          onChange={(e) => setFormData(prev => ({ ...prev, mainReason: e.target.value }))}
          placeholder="Describe your main reason..."
        />
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div>
        <Label htmlFor="preferredStyle">🤝 Mentoring Style Preferences — What kind of mentor style do you think would help you most?</Label>
        <Textarea
          id="preferredStyle"
          value={formData.preferredStyle}
          onChange={(e) => setFormData(prev => ({ ...prev, preferredStyle: e.target.value }))}
          placeholder="Describe your preferred mentoring style..."
        />
      </div>

      <div>
        <Label htmlFor="preferredEnergy">What kind of mentor energy would help you thrive?</Label>
        <Textarea
          id="preferredEnergy"
          value={formData.preferredEnergy}
          onChange={(e) => setFormData(prev => ({ ...prev, preferredEnergy: e.target.value }))}
          placeholder="Describe the energy that helps you thrive..."
        />
      </div>

      <div>
        <Label htmlFor="feedbackPreference">How do you prefer to receive feedback?</Label>
        <Textarea
          id="feedbackPreference"
          value={formData.feedbackPreference}
          onChange={(e) => setFormData(prev => ({ ...prev, feedbackPreference: e.target.value }))}
          placeholder="Describe your feedback preferences..."
        />
      </div>

      <div>
        <Label htmlFor="mentorExperience">How important is it to you that your mentor has prior mentoring experience?</Label>
        <Select value={formData.mentorExperienceImportance} onValueChange={(value) => setFormData(prev => ({ ...prev, mentorExperienceImportance: value }))}>
          <SelectTrigger>
            <SelectValue placeholder="Select importance level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="very-important">Very important</SelectItem>
            <SelectItem value="somewhat-important">Somewhat important</SelectItem>
            <SelectItem value="not-important">Not important</SelectItem>
            <SelectItem value="no-preference">No preference</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="unwantedQualities">What do you NOT want in a mentor?</Label>
        <Textarea
          id="unwantedQualities"
          value={formData.unwantedQualities}
          onChange={(e) => setFormData(prev => ({ ...prev, unwantedQualities: e.target.value }))}
          placeholder="Describe qualities you'd prefer to avoid..."
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
        <Label htmlFor="mentorQualities">🌈 Expectations — What qualities would you like in a mentor?</Label>
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
          placeholder="Share your expectations..."
        />
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold mb-2">🎯 Choose Your Cohort (Optional)</h3>
        <p className="text-muted-foreground">
          Select an existing cohort to join, or leave blank to be assigned by an admin.
        </p>
      </div>

      <div>
        <Label htmlFor="cohort">Select a Cohort (Optional)</Label>
        <Select value={formData.cohortId} onValueChange={(value) => setFormData(prev => ({ ...prev, cohortId: value }))}>
          <SelectTrigger>
            <SelectValue placeholder="Choose a cohort or leave blank for admin assignment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">No cohort selected (admin will assign)</SelectItem>
            {availableCohorts.map((cohort) => (
              <SelectItem key={cohort.id} value={cohort.id}>
                {cohort.name} ({cohort.status})
                {cohort.description && ` - ${cohort.description}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {formData.cohortId && (
        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700">
            <strong>Selected:</strong> {availableCohorts.find(c => c.id === formData.cohortId)?.name}
          </p>
          <p className="text-xs text-blue-600 mt-1">
            You'll be added directly to this cohort and can start matching immediately.
          </p>
        </div>
      )}

      {!formData.cohortId && (
        <div className="p-4 bg-yellow-50 rounded-lg">
          <p className="text-sm text-yellow-700">
            <strong>No cohort selected:</strong> You'll be placed in a holding area for admin assignment.
          </p>
          <p className="text-xs text-yellow-600 mt-1">
            An admin will review your profile and assign you to the most suitable cohort.
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
        return formData.lifeExperiences.length > 0 && formData.hasParticipatedBefore;
      case 3:
        return formData.topicsToLearn.length > 0;
      case 4:
        return formData.meetingFrequency;
      case 5:
        return true; // Cohort selection is optional
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
          <div className="text-sm text-muted-foreground">
            Step {currentStep} of {totalSteps}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Join as a Mentee</CardTitle>
              <CardDescription>
                Help us understand your goals and preferences to find the perfect mentor match.
              </CardDescription>
              <div className="w-full bg-muted rounded-full h-2 mt-4">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
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
                    {isSubmitting ? "Submitting..." : "Complete Registration"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default MenteeSignup;