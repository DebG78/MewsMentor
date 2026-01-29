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
import { getAllCohorts, signupMentor } from "@/lib/cohortManager";
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

const MentorSignup = () => {
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
    otherExperiences: "",
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

  const handleCheckboxChange = (field: 'lifeExperiences' | 'topicsToMentor', value: string, checked: boolean) => {
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
      const result = await signupMentor({
        pronouns: formData.pronouns,
        role: formData.role,
        experienceYears: formData.experienceYears,
        locationTimezone: formData.locationTimezone,
        lifeExperiences: formData.lifeExperiences,
        otherExperiences: formData.otherExperiences,
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

      if (result.success && result.userId) {
        // Create user session
        await createUserSession(result.userId);

        toast({
          title: "Registration Successful!",
          description: formData.cohortId
            ? "Welcome to the mentorship program. You've been added to your selected cohort."
            : "Welcome to the mentorship program. An admin will assign you to a cohort soon.",
        });
        navigate('/growth');
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
            value={formData.otherExperiences}
            onChange={(e) => setFormData(prev => ({ ...prev, otherExperiences: e.target.value }))}
            placeholder="Please describe the experience..."
          />
        </div>
      )}

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
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
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
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
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
            You'll be added directly to this cohort and can start being matched with mentees immediately.
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
        return formData.lifeExperiences.length > 0 && formData.topicsToMentor.length > 0 && formData.hasMentoredBefore;
      case 3:
        return formData.mentoringStyle && formData.meetingStyle && formData.mentorEnergy && formData.feedbackStyle;
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
              <CardTitle>Join as a Mentor</CardTitle>
              <CardDescription>
                Share your expertise and help others grow. Tell us about your experience and mentoring preferences.
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

export default MentorSignup;