export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      cohorts: {
        Row: {
          id: string
          name: string
          description: string | null
          status: 'draft' | 'active' | 'completed' | 'paused'
          created_date: string
          start_date: string | null
          end_date: string | null
          program_manager: string | null
          target_skills: string[] | null
          success_rate_target: number | null
          matches: Json | null
          matching_history: Json | null
          manual_matches: Json | null
          mentor_survey_id: string | null
          mentee_survey_id: string | null
          session_thresholds: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          status?: 'draft' | 'active' | 'completed' | 'paused'
          created_date?: string
          start_date?: string | null
          end_date?: string | null
          program_manager?: string | null
          target_skills?: string[] | null
          success_rate_target?: number | null
          matches?: Json | null
          matching_history?: Json | null
          manual_matches?: Json | null
          mentor_survey_id?: string | null
          mentee_survey_id?: string | null
          session_thresholds?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          status?: 'draft' | 'active' | 'completed' | 'paused'
          created_date?: string
          start_date?: string | null
          end_date?: string | null
          program_manager?: string | null
          target_skills?: string[] | null
          success_rate_target?: number | null
          matches?: Json | null
          matching_history?: Json | null
          manual_matches?: Json | null
          mentor_survey_id?: string | null
          mentee_survey_id?: string | null
          session_thresholds?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      mentees: {
        Row: {
          id: string
          cohort_id: string
          mentee_id: string
          full_name: string | null
          pronouns: string | null
          role: string
          experience_years: number
          location_timezone: string
          life_experiences: string[]
          has_participated_before: boolean | null
          topics_to_learn: string[]
          other_topics: string | null
          motivation: string | null
          main_reason: string | null
          preferred_style: string | null
          preferred_energy: string | null
          feedback_preference: string | null
          mentor_experience_importance: string | null
          unwanted_qualities: string | null
          meeting_frequency: string
          mentor_qualities: string | null
          expectations: string | null
          languages: string[]
          industry: string
          profile_goals: Json
          private_notes: string | null
          email: string | null
          // New survey revamp fields
          bio: string | null
          primary_capability: string | null
          primary_capability_detail: string | null
          secondary_capability: string | null
          secondary_capability_detail: string | null
          primary_proficiency: number | null
          secondary_proficiency: number | null
          mentoring_goal: string | null
          practice_scenarios: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          cohort_id: string
          mentee_id: string
          full_name?: string | null
          pronouns?: string | null
          role: string
          experience_years: number
          location_timezone: string
          life_experiences: string[]
          has_participated_before?: boolean | null
          topics_to_learn: string[]
          other_topics?: string | null
          motivation?: string | null
          main_reason?: string | null
          preferred_style?: string | null
          preferred_energy?: string | null
          feedback_preference?: string | null
          mentor_experience_importance?: string | null
          unwanted_qualities?: string | null
          meeting_frequency: string
          mentor_qualities?: string | null
          expectations?: string | null
          languages: string[]
          industry: string
          profile_goals?: Json
          private_notes?: string | null
          email?: string | null
          // New survey revamp fields
          bio?: string | null
          primary_capability?: string | null
          primary_capability_detail?: string | null
          secondary_capability?: string | null
          secondary_capability_detail?: string | null
          primary_proficiency?: number | null
          secondary_proficiency?: number | null
          mentoring_goal?: string | null
          practice_scenarios?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          cohort_id?: string
          mentee_id?: string
          full_name?: string | null
          pronouns?: string | null
          role?: string
          experience_years?: number
          location_timezone?: string
          life_experiences?: string[]
          has_participated_before?: boolean | null
          topics_to_learn?: string[]
          other_topics?: string | null
          motivation?: string | null
          main_reason?: string | null
          preferred_style?: string | null
          preferred_energy?: string | null
          feedback_preference?: string | null
          mentor_experience_importance?: string | null
          unwanted_qualities?: string | null
          meeting_frequency?: string
          mentor_qualities?: string | null
          expectations?: string | null
          languages?: string[]
          industry?: string
          profile_goals?: Json
          private_notes?: string | null
          email?: string | null
          // New survey revamp fields
          bio?: string | null
          primary_capability?: string | null
          primary_capability_detail?: string | null
          secondary_capability?: string | null
          secondary_capability_detail?: string | null
          primary_proficiency?: number | null
          secondary_proficiency?: number | null
          mentoring_goal?: string | null
          practice_scenarios?: string[] | null
          created_at?: string
          updated_at?: string
        }
      }
      mentors: {
        Row: {
          id: string
          cohort_id: string
          mentor_id: string
          full_name: string | null
          pronouns: string | null
          role: string
          experience_years: number
          location_timezone: string
          life_experiences: string[]
          other_experiences: string | null
          topics_to_mentor: string[]
          other_topics: string | null
          has_mentored_before: boolean | null
          mentoring_style: string | null
          meeting_style: string | null
          mentor_energy: string | null
          feedback_style: string | null
          preferred_mentee_level: string | null
          topics_not_to_mentor: string | null
          meeting_frequency: string
          motivation: string | null
          expectations: string | null
          capacity_remaining: number
          languages: string[]
          industry: string
          profile_goals: Json
          private_notes: string | null
          email: string | null
          // New survey revamp fields
          bio: string | null
          mentor_motivation: string | null
          mentoring_experience: string | null
          first_time_support: string[] | null
          primary_capability: string | null
          primary_capability_detail: string | null
          secondary_capabilities: string[] | null
          secondary_capability_detail: string | null
          primary_proficiency: number | null
          practice_scenarios: string[] | null
          hard_earned_lesson: string | null
          natural_strengths: string[] | null
          excluded_scenarios: string[] | null
          match_exclusions: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          cohort_id: string
          mentor_id: string
          full_name?: string | null
          pronouns?: string | null
          role: string
          experience_years: number
          location_timezone: string
          life_experiences: string[]
          other_experiences?: string | null
          topics_to_mentor: string[]
          other_topics?: string | null
          has_mentored_before?: boolean | null
          mentoring_style?: string | null
          meeting_style?: string | null
          mentor_energy?: string | null
          feedback_style?: string | null
          preferred_mentee_level?: string | null
          topics_not_to_mentor?: string | null
          meeting_frequency: string
          motivation?: string | null
          expectations?: string | null
          capacity_remaining: number
          languages: string[]
          industry: string
          profile_goals?: Json
          private_notes?: string | null
          email?: string | null
          // New survey revamp fields
          bio?: string | null
          mentor_motivation?: string | null
          mentoring_experience?: string | null
          first_time_support?: string[] | null
          primary_capability?: string | null
          primary_capability_detail?: string | null
          secondary_capabilities?: string[] | null
          secondary_capability_detail?: string | null
          primary_proficiency?: number | null
          practice_scenarios?: string[] | null
          hard_earned_lesson?: string | null
          natural_strengths?: string[] | null
          excluded_scenarios?: string[] | null
          match_exclusions?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          cohort_id?: string
          mentor_id?: string
          full_name?: string | null
          pronouns?: string | null
          role?: string
          experience_years?: number
          location_timezone?: string
          life_experiences?: string[]
          other_experiences?: string | null
          topics_to_mentor?: string[]
          other_topics?: string | null
          has_mentored_before?: boolean | null
          mentoring_style?: string | null
          meeting_style?: string | null
          mentor_energy?: string | null
          feedback_style?: string | null
          preferred_mentee_level?: string | null
          topics_not_to_mentor?: string | null
          meeting_frequency?: string
          motivation?: string | null
          expectations?: string | null
          capacity_remaining?: number
          languages?: string[]
          industry?: string
          profile_goals?: Json
          private_notes?: string | null
          email?: string | null
          // New survey revamp fields
          bio?: string | null
          mentor_motivation?: string | null
          mentoring_experience?: string | null
          first_time_support?: string[] | null
          primary_capability?: string | null
          primary_capability_detail?: string | null
          secondary_capabilities?: string[] | null
          secondary_capability_detail?: string | null
          primary_proficiency?: number | null
          practice_scenarios?: string[] | null
          hard_earned_lesson?: string | null
          natural_strengths?: string[] | null
          excluded_scenarios?: string[] | null
          match_exclusions?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          sender_id: string
          sender_type: 'mentor' | 'mentee'
          recipient_id: string
          recipient_type: 'mentor' | 'mentee'
          content: string
          message_type: 'text' | 'file' | 'image' | 'voice'
          file_url: string | null
          file_name: string | null
          file_size: number | null
          is_read: boolean
          reply_to: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          sender_id: string
          sender_type: 'mentor' | 'mentee'
          recipient_id: string
          recipient_type: 'mentor' | 'mentee'
          content: string
          message_type?: 'text' | 'file' | 'image' | 'voice'
          file_url?: string | null
          file_name?: string | null
          file_size?: number | null
          is_read?: boolean
          reply_to?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          sender_id?: string
          sender_type?: 'mentor' | 'mentee'
          recipient_id?: string
          recipient_type?: 'mentor' | 'mentee'
          content?: string
          message_type?: 'text' | 'file' | 'image' | 'voice'
          file_url?: string | null
          file_name?: string | null
          file_size?: number | null
          is_read?: boolean
          reply_to?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      action_items: {
        Row: {
          id: string
          title: string
          description: string | null
          assignee_id: string
          assignee_type: 'mentor' | 'mentee'
          assigner_id: string
          assigner_type: 'mentor' | 'mentee'
          cohort_id: string
          status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
          priority: 'low' | 'medium' | 'high'
          due_date: string | null
          completed_at: string | null
          completion_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          assignee_id: string
          assignee_type: 'mentor' | 'mentee'
          assigner_id: string
          assigner_type: 'mentor' | 'mentee'
          cohort_id: string
          status?: 'pending' | 'in_progress' | 'completed' | 'cancelled'
          priority?: 'low' | 'medium' | 'high'
          due_date?: string | null
          completed_at?: string | null
          completion_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          assignee_id?: string
          assignee_type?: 'mentor' | 'mentee'
          assigner_id?: string
          assigner_type?: 'mentor' | 'mentee'
          cohort_id?: string
          status?: 'pending' | 'in_progress' | 'completed' | 'cancelled'
          priority?: 'low' | 'medium' | 'high'
          due_date?: string | null
          completed_at?: string | null
          completion_notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      shared_notes: {
        Row: {
          id: string
          title: string
          content: string | null
          mentor_id: string
          mentee_id: string
          cohort_id: string
          last_edited_by_id: string
          last_edited_by_type: 'mentor' | 'mentee'
          version: number
          is_archived: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          content?: string | null
          mentor_id: string
          mentee_id: string
          cohort_id: string
          last_edited_by_id: string
          last_edited_by_type: 'mentor' | 'mentee'
          version?: number
          is_archived?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          content?: string | null
          mentor_id?: string
          mentee_id?: string
          cohort_id?: string
          last_edited_by_id?: string
          last_edited_by_type?: 'mentor' | 'mentee'
          version?: number
          is_archived?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      conversations: {
        Row: {
          id: string
          mentor_id: string
          mentee_id: string
          cohort_id: string
          last_message_at: string
          mentor_last_read_at: string
          mentee_last_read_at: string
          is_archived: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          mentor_id: string
          mentee_id: string
          cohort_id: string
          last_message_at?: string
          mentor_last_read_at?: string
          mentee_last_read_at?: string
          is_archived?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          mentor_id?: string
          mentee_id?: string
          cohort_id?: string
          last_message_at?: string
          mentor_last_read_at?: string
          mentee_last_read_at?: string
          is_archived?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      sessions: {
        Row: {
          id: string
          mentor_id: string
          mentee_id: string
          cohort_id: string
          title: string
          description: string | null
          scheduled_datetime: string
          duration_minutes: number
          status: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
          meeting_url: string | null
          meeting_id: string | null
          notes: string | null
          mentor_rating: number | null
          mentee_rating: number | null
          mentor_feedback: string | null
          mentee_feedback: string | null
          journey_phase: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          mentor_id: string
          mentee_id: string
          cohort_id: string
          title: string
          description?: string | null
          scheduled_datetime: string
          duration_minutes?: number
          status?: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
          meeting_url?: string | null
          meeting_id?: string | null
          notes?: string | null
          mentor_rating?: number | null
          mentee_rating?: number | null
          mentor_feedback?: string | null
          mentee_feedback?: string | null
          journey_phase?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          mentor_id?: string
          mentee_id?: string
          cohort_id?: string
          title?: string
          description?: string | null
          scheduled_datetime?: string
          duration_minutes?: number
          status?: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
          meeting_url?: string | null
          meeting_id?: string | null
          notes?: string | null
          mentor_rating?: number | null
          mentee_rating?: number | null
          mentor_feedback?: string | null
          mentee_feedback?: string | null
          journey_phase?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      user_tokens: {
        Row: {
          id: string
          user_email: string
          access_token: string | null
          refresh_token: string | null
          token_expires_at: string | null
          scope: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_email: string
          access_token?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          scope?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_email?: string
          access_token?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          scope?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      profile_embeddings: {
        Row: {
          id: string
          cohort_id: string
          participant_id: string
          participant_type: 'mentee' | 'mentor'
          embedding_text: string
          embedding: number[]
          model_name: string
          created_at: string
        }
        Insert: {
          id?: string
          cohort_id: string
          participant_id: string
          participant_type: 'mentee' | 'mentor'
          embedding_text: string
          embedding: number[]
          model_name?: string
          created_at?: string
        }
        Update: {
          id?: string
          cohort_id?: string
          participant_id?: string
          participant_type?: 'mentee' | 'mentor'
          embedding_text?: string
          embedding?: number[]
          model_name?: string
          created_at?: string
        }
      }
      match_explanations: {
        Row: {
          id: string
          cohort_id: string
          mentee_id: string
          mentor_id: string
          explanation: string
          model_used: string
          total_score: number | null
          generated_at: string
        }
        Insert: {
          id?: string
          cohort_id: string
          mentee_id: string
          mentor_id: string
          explanation: string
          model_used?: string
          total_score?: number | null
          generated_at?: string
        }
        Update: {
          id?: string
          cohort_id?: string
          mentee_id?: string
          mentor_id?: string
          explanation?: string
          model_used?: string
          total_score?: number | null
          generated_at?: string
        }
      }
      message_templates: {
        Row: {
          id: string
          cohort_id: string | null
          template_type: string
          journey_phase: string | null
          body: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          cohort_id?: string | null
          template_type: string
          journey_phase?: string | null
          body: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          cohort_id?: string | null
          template_type?: string
          journey_phase?: string | null
          body?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      message_log: {
        Row: {
          id: string
          cohort_id: string
          template_type: string
          journey_phase: string | null
          recipient_email: string
          message_text: string
          delivery_status: string
          error_detail: string | null
          created_at: string
        }
        Insert: {
          id?: string
          cohort_id: string
          template_type: string
          journey_phase?: string | null
          recipient_email: string
          message_text: string
          delivery_status?: string
          error_detail?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          cohort_id?: string
          template_type?: string
          journey_phase?: string | null
          recipient_email?: string
          message_text?: string
          delivery_status?: string
          error_detail?: string | null
          created_at?: string
        }
      }
      mentee_recommendations: {
        Row: {
          id: string
          mentee_id: string
          cohort_id: string
          recommendation_key: string
          title: string
          description: string
          icon: string
          stage: string
          display_order: number
          is_completed: boolean
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          mentee_id: string
          cohort_id: string
          recommendation_key: string
          title: string
          description: string
          icon: string
          stage: string
          display_order?: number
          is_completed?: boolean
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          mentee_id?: string
          cohort_id?: string
          recommendation_key?: string
          title?: string
          description?: string
          icon?: string
          stage?: string
          display_order?: number
          is_completed?: boolean
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      cohort_status: 'draft' | 'active' | 'completed' | 'paused'
      session_status: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
      message_type: 'text' | 'file' | 'image' | 'voice'
      user_type: 'mentor' | 'mentee'
      action_status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
      priority_level: 'low' | 'medium' | 'high'
      match_status: 'unassigned' | 'awaiting_match' | 'match_pending' | 'matched'
    }
  }
}