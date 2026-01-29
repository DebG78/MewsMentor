// Survey Template System Types

export interface SurveyQuestion {
  id: string;
  type: "text" | "textarea" | "select" | "multiselect" | "radio" | "checkbox";
  title: string;
  description?: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
  step: number;
  order: number;
  active: boolean;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    errorMessage?: string;
  };
}

export interface SurveyStep {
  id: string;
  title: string;
  description: string;
  step: number;
  questions: SurveyQuestion[];
}

export interface SurveyTemplate {
  id: string;
  name: string;
  description?: string;
  type: "mentor" | "mentee";
  steps: SurveyStep[];
  isDefault: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  version: number;
}

export interface SurveyResponse {
  questionId: string;
  questionTitle: string;
  questionType: string;
  value: string | string[] | boolean;
  step: number;
}

export interface CompletedSurvey {
  templateId: string;
  templateName: string;
  templateVersion: number;
  responses: SurveyResponse[];
  completedAt: string;
  personId: string;
  personType: "mentor" | "mentee";
}

export interface SurveyTemplateCreateInput {
  name: string;
  description?: string;
  type: "mentor" | "mentee";
  steps: SurveyStep[];
  isDefault?: boolean;
  createdBy?: string;
}

export interface SurveyTemplateUpdateInput {
  name?: string;
  description?: string;
  steps?: SurveyStep[];
  isActive?: boolean;
  isDefault?: boolean;
}

// Default survey templates data
export const DEFAULT_MENTOR_SURVEY_TEMPLATE: Omit<SurveyTemplate, 'id' | 'createdAt' | 'updatedAt'> = {
  name: "Standard Mentor Survey",
  description: "Complete 5-step mentor registration survey",
  type: "mentor",
  isDefault: true,
  isActive: true,
  version: 1,
  steps: [
    {
      id: "mentor_step_1",
      title: "Basic Information",
      description: "Tell us about yourself and your background",
      step: 1,
      questions: [
        {
          id: "pronouns",
          type: "text",
          title: "Do you want to share your pronouns? (Optional)",
          placeholder: "e.g., she/her, he/him, they/them",
          required: false,
          step: 1,
          order: 1,
          active: true
        },
        {
          id: "role",
          type: "text",
          title: "What's your current role at Mews?",
          placeholder: "e.g., Senior Software Engineer, VP of Product",
          required: true,
          step: 1,
          order: 2,
          active: true
        },
        {
          id: "experience_years",
          type: "select",
          title: "How many years of work experience do you have?",
          required: true,
          options: ["2-3", "4-6", "7-10", "10-15", "15+"],
          step: 1,
          order: 3,
          active: true
        },
        {
          id: "location_timezone",
          type: "text",
          title: "Where are you based (location/time zone)?",
          placeholder: "e.g., London, UK (GMT) or San Francisco, CA (PST)",
          required: true,
          step: 1,
          order: 4,
          active: true
        }
      ]
    },
    {
      id: "mentor_step_2",
      title: "Experience & Topics",
      description: "Share your experiences and mentoring topics",
      step: 2,
      questions: [
        {
          id: "life_experiences",
          type: "checkbox",
          title: "Which experiences have you navigated that you could help others with?",
          description: "Select all that apply",
          required: true,
          options: [
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
          ],
          step: 2,
          order: 1,
          active: true
        },
        {
          id: "other_experience",
          type: "textarea",
          title: "You picked Other - we'd love to hear more. What experience would you add?",
          placeholder: "Please describe the experience...",
          required: false,
          step: 2,
          order: 2,
          active: true
        },
        {
          id: "topics_to_mentor",
          type: "checkbox",
          title: "What areas could you mentor on?",
          description: "Select all that apply",
          required: true,
          options: [
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
          ],
          step: 2,
          order: 3,
          active: true
        },
        {
          id: "other_topics",
          type: "textarea",
          title: "You picked Other - we'd love to hear more. What topic would you add?",
          placeholder: "Please describe the topic...",
          required: false,
          step: 2,
          order: 4,
          active: true
        },
        {
          id: "has_mentored_before",
          type: "radio",
          title: "Have you mentored before?",
          required: true,
          options: ["Yes", "No"],
          step: 2,
          order: 5,
          active: true
        }
      ]
    },
    {
      id: "mentor_step_3",
      title: "Mentoring Style",
      description: "Tell us about your mentoring approach",
      step: 3,
      questions: [
        {
          id: "mentoring_style",
          type: "textarea",
          title: "🤝 Your mentoring style — How would you describe your preferred mentoring style?",
          placeholder: "Describe your mentoring approach and style...",
          required: true,
          step: 3,
          order: 1,
          active: true
        },
        {
          id: "meeting_style",
          type: "textarea",
          title: "What type of meeting style do you usually prefer?",
          placeholder: "Describe your preferred meeting format and structure...",
          required: true,
          step: 3,
          order: 2,
          active: true
        },
        {
          id: "mentor_energy",
          type: "textarea",
          title: "How would you describe your energy as a mentor?",
          placeholder: "Describe your energy and approach when mentoring...",
          required: true,
          step: 3,
          order: 3,
          active: true
        },
        {
          id: "feedback_style",
          type: "textarea",
          title: "What's your feedback style?",
          placeholder: "Describe how you typically give feedback...",
          required: true,
          step: 3,
          order: 4,
          active: true
        },
        {
          id: "preferred_mentee_level",
          type: "select",
          title: "What level of mentee do you prefer to work with?",
          required: true,
          options: ["Early-career", "Mid-level", "Senior stretch role", "No preference"],
          step: 3,
          order: 5,
          active: true
        }
      ]
    },
    {
      id: "mentor_step_4",
      title: "Preferences & Expectations",
      description: "Share your mentoring preferences and expectations",
      step: 4,
      questions: [
        {
          id: "topics_not_to_mentor",
          type: "textarea",
          title: "Are there any topics you would prefer NOT to mentor on?",
          placeholder: "List any topics you'd prefer to avoid...",
          required: false,
          step: 4,
          order: 1,
          active: true
        },
        {
          id: "meeting_frequency",
          type: "select",
          title: "How often would you ideally like to meet with a mentee?",
          required: true,
          options: ["Weekly", "Bi-weekly", "Monthly", "As needed"],
          step: 4,
          order: 2,
          active: true
        },
        {
          id: "motivation",
          type: "textarea",
          title: "💡 Motivation — What do you hope to gain from being a mentor?",
          placeholder: "Share what motivates you to mentor others...",
          required: true,
          step: 4,
          order: 3,
          active: true
        },
        {
          id: "expectations",
          type: "textarea",
          title: "🙌 Expectations — What expectations do you have for the mentorship program?",
          placeholder: "Share your expectations for the program...",
          required: true,
          step: 4,
          order: 4,
          active: true
        }
      ]
    },
    {
      id: "mentor_step_5",
      title: "Choose Cohort",
      description: "Select an existing cohort to join, or leave blank for holding area",
      step: 5,
      questions: [
        {
          id: "cohort_selection",
          type: "select",
          title: "Select a Cohort",
          placeholder: "Choose a cohort or leave blank for holding area",
          required: false,
          options: [], // This will be populated dynamically
          step: 5,
          order: 1,
          active: true
        }
      ]
    }
  ]
};

export const DEFAULT_MENTEE_SURVEY_TEMPLATE: Omit<SurveyTemplate, 'id' | 'createdAt' | 'updatedAt'> = {
  name: "Standard Mentee Survey",
  description: "Complete 5-step mentee registration survey",
  type: "mentee",
  isDefault: true,
  isActive: true,
  version: 1,
  steps: [
    {
      id: "mentee_step_1",
      title: "Basic Information",
      description: "Tell us about yourself and your background",
      step: 1,
      questions: [
        {
          id: "pronouns",
          type: "text",
          title: "Do you want to share your pronouns? (Optional)",
          placeholder: "e.g., she/her, he/him, they/them",
          required: false,
          step: 1,
          order: 1,
          active: true
        },
        {
          id: "role",
          type: "text",
          title: "What's your current role at Mews?",
          placeholder: "e.g., Software Engineer, Product Manager",
          required: true,
          step: 1,
          order: 2,
          active: true
        },
        {
          id: "experience_years",
          type: "select",
          title: "How many years of work experience do you have?",
          required: true,
          options: ["2-3", "4-6", "7-10", "10-15", "15+"],
          step: 1,
          order: 3,
          active: true
        },
        {
          id: "location_timezone",
          type: "text",
          title: "Where are you based (location/time zone)?",
          placeholder: "e.g., London, UK (GMT) or San Francisco, CA (PST)",
          required: true,
          step: 1,
          order: 4,
          active: true
        }
      ]
    },
    {
      id: "mentee_step_2",
      title: "Experience & Learning Goals",
      description: "Share your experiences and what you'd like to learn",
      step: 2,
      questions: [
        {
          id: "life_experiences",
          type: "checkbox",
          title: "Which experiences have you navigated that you could help others with?",
          description: "Select all that apply",
          required: true,
          options: [
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
          ],
          step: 2,
          order: 1,
          active: true
        },
        {
          id: "other_experience",
          type: "textarea",
          title: "You picked Other - we'd love to hear more. What experience would you add?",
          placeholder: "Please describe the experience...",
          required: false,
          step: 2,
          order: 2,
          active: true
        },
        {
          id: "topics_to_learn",
          type: "checkbox",
          title: "What areas would you like to learn about?",
          description: "Select all that apply",
          required: true,
          options: [
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
          ],
          step: 2,
          order: 3,
          active: true
        },
        {
          id: "other_topics",
          type: "textarea",
          title: "You picked Other - we'd love to hear more. What topic would you add?",
          placeholder: "Please describe the topic...",
          required: false,
          step: 2,
          order: 4,
          active: true
        },
        {
          id: "has_participated_before",
          type: "radio",
          title: "Have you participated in a mentorship program before?",
          required: true,
          options: ["Yes", "No"],
          step: 2,
          order: 5,
          active: true
        }
      ]
    },
    {
      id: "mentee_step_3",
      title: "Goals & Preferences",
      description: "Tell us about your mentorship goals and preferences",
      step: 3,
      questions: [
        {
          id: "motivation",
          type: "textarea",
          title: "💡 Motivation — What do you hope to gain from this mentorship program?",
          placeholder: "Share what you hope to achieve through mentorship...",
          required: true,
          step: 3,
          order: 1,
          active: true
        },
        {
          id: "main_reason",
          type: "textarea",
          title: "What's the main reason you're looking for a mentor?",
          placeholder: "Share your primary motivation for seeking mentorship...",
          required: true,
          step: 3,
          order: 2,
          active: true
        },
        {
          id: "preferred_style",
          type: "textarea",
          title: "What type of mentoring style would you prefer?",
          placeholder: "Describe your preferred mentoring approach...",
          required: true,
          step: 3,
          order: 3,
          active: true
        },
        {
          id: "preferred_energy",
          type: "textarea",
          title: "What type of energy would you prefer in a mentor?",
          placeholder: "Describe the energy and personality you're looking for...",
          required: true,
          step: 3,
          order: 4,
          active: true
        }
      ]
    },
    {
      id: "mentee_step_4",
      title: "Mentor Preferences",
      description: "Help us find the right mentor for you",
      step: 4,
      questions: [
        {
          id: "feedback_preference",
          type: "textarea",
          title: "What's your preferred feedback style?",
          placeholder: "Describe how you prefer to receive feedback...",
          required: true,
          step: 4,
          order: 1,
          active: true
        },
        {
          id: "mentor_experience_importance",
          type: "select",
          title: "How important is it that your mentor has specific experience in your field?",
          required: true,
          options: ["Very important", "Somewhat important", "Not important"],
          step: 4,
          order: 2,
          active: true
        },
        {
          id: "unwanted_qualities",
          type: "textarea",
          title: "Are there any qualities or approaches you would NOT want in a mentor?",
          placeholder: "Describe any qualities you'd prefer to avoid...",
          required: false,
          step: 4,
          order: 3,
          active: true
        },
        {
          id: "meeting_frequency",
          type: "select",
          title: "How often would you ideally like to meet with a mentor?",
          required: true,
          options: ["Weekly", "Bi-weekly", "Monthly", "As needed"],
          step: 4,
          order: 4,
          active: true
        },
        {
          id: "mentor_qualities",
          type: "textarea",
          title: "What qualities are you looking for in a mentor?",
          placeholder: "Describe the qualities you value in a mentor...",
          required: true,
          step: 4,
          order: 5,
          active: true
        },
        {
          id: "expectations",
          type: "textarea",
          title: "🙌 Expectations — What expectations do you have for the mentorship program?",
          placeholder: "Share your expectations for the program...",
          required: true,
          step: 4,
          order: 6,
          active: true
        }
      ]
    },
    {
      id: "mentee_step_5",
      title: "Choose Cohort",
      description: "Select an existing cohort to join, or leave blank for holding area",
      step: 5,
      questions: [
        {
          id: "cohort_selection",
          type: "select",
          title: "Select a Cohort",
          placeholder: "Choose a cohort or leave blank for holding area",
          required: false,
          options: [], // This will be populated dynamically
          step: 5,
          order: 1,
          active: true
        }
      ]
    }
  ]
};