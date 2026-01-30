// This file contains the new database types for the redesigned schema
// These types are for the new tables created in Phase 1

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface NewDatabase {
  public: {
    Tables: {
      // New Phase 1 Tables
      user_profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          role_title: string | null
          department: string | null
          location_timezone: string | null
          languages: string[] | null
          experience_years: number | null
          bio: string | null
          profile_image_url: string | null
          current_skills: string[] | null
          target_skills: string[] | null
          skills_progression: Json | null
          preferences: Json | null
          availability_settings: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          full_name: string
          role_title?: string | null
          department?: string | null
          location_timezone?: string | null
          languages?: string[] | null
          experience_years?: number | null
          bio?: string | null
          profile_image_url?: string | null
          current_skills?: string[] | null
          target_skills?: string[] | null
          skills_progression?: Json | null
          preferences?: Json | null
          availability_settings?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role_title?: string | null
          department?: string | null
          location_timezone?: string | null
          languages?: string[] | null
          experience_years?: number | null
          bio?: string | null
          profile_image_url?: string | null
          current_skills?: string[] | null
          target_skills?: string[] | null
          skills_progression?: Json | null
          preferences?: Json | null
          availability_settings?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      programs: {
        Row: {
          id: string
          name: string
          type: 'mentoring' | 'other'
          description: string | null
          status: 'active' | 'inactive' | 'archived'
          program_config: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          type: 'mentoring' | 'other'
          description?: string | null
          status?: 'active' | 'inactive' | 'archived'
          program_config?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: 'mentoring' | 'other'
          description?: string | null
          status?: 'active' | 'inactive' | 'archived'
          program_config?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      program_cohorts: {
        Row: {
          id: string
          program_id: string
          name: string
          description: string | null
          status: 'draft' | 'active' | 'completed' | 'paused'
          start_date: string | null
          end_date: string | null
          program_manager: string | null
          target_skills: string[] | null
          matches: Json | null
          matching_history: Json | null
          mentor_survey_id: string | null
          mentee_survey_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          program_id: string
          name: string
          description?: string | null
          status?: 'draft' | 'active' | 'completed' | 'paused'
          start_date?: string | null
          end_date?: string | null
          program_manager?: string | null
          target_skills?: string[] | null
          matches?: Json | null
          matching_history?: Json | null
          mentor_survey_id?: string | null
          mentee_survey_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          program_id?: string
          name?: string
          description?: string | null
          status?: 'draft' | 'active' | 'completed' | 'paused'
          start_date?: string | null
          end_date?: string | null
          program_manager?: string | null
          target_skills?: string[] | null
          matches?: Json | null
          matching_history?: Json | null
          mentor_survey_id?: string | null
          mentee_survey_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      program_participants: {
        Row: {
          id: string
          user_id: string
          program_cohort_id: string
          role_in_program: 'mentee' | 'mentor' | 'admin'
          role_data: Json | null
          status: 'active' | 'inactive' | 'completed' | 'dropped'
          joined_at: string
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          program_cohort_id: string
          role_in_program: 'mentee' | 'mentor' | 'admin'
          role_data?: Json | null
          status?: 'active' | 'inactive' | 'completed' | 'dropped'
          joined_at?: string
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          program_cohort_id?: string
          role_in_program?: 'mentee' | 'mentor' | 'admin'
          role_data?: Json | null
          status?: 'active' | 'inactive' | 'completed' | 'dropped'
          joined_at?: string
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      growth_events: {
        Row: {
          id: string
          user_id: string
          program_cohort_id: string | null
          event_type: 'mentoring_session' | 'badge_earned' | 'skill_milestone' | 'reflection' | 'goal_completed' | 'program_joined' | 'program_completed'
          title: string
          description: string | null
          event_data: Json | null
          event_date: string
          related_user_id: string | null
          related_event_id: string | null
          skills_developed: string[] | null
          reflection: string | null
          rating: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          program_cohort_id?: string | null
          event_type: 'mentoring_session' | 'badge_earned' | 'skill_milestone' | 'reflection' | 'goal_completed' | 'program_joined' | 'program_completed'
          title: string
          description?: string | null
          event_data?: Json | null
          event_date?: string
          related_user_id?: string | null
          related_event_id?: string | null
          skills_developed?: string[] | null
          reflection?: string | null
          rating?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          program_cohort_id?: string | null
          event_type?: 'mentoring_session' | 'badge_earned' | 'skill_milestone' | 'reflection' | 'goal_completed' | 'program_joined' | 'program_completed'
          title?: string
          description?: string | null
          event_data?: Json | null
          event_date?: string
          related_user_id?: string | null
          related_event_id?: string | null
          skills_developed?: string[] | null
          reflection?: string | null
          rating?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      skills: {
        Row: {
          id: string
          name: string
          category: string | null
          description: string | null
          related_skills: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          category?: string | null
          description?: string | null
          related_skills?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          category?: string | null
          description?: string | null
          related_skills?: string[] | null
          created_at?: string
          updated_at?: string
        }
      }
      user_skill_progress: {
        Row: {
          id: string
          user_id: string
          skill_id: string
          proficiency_level: 'learning' | 'practicing' | 'proficient' | 'expert'
          evidence_count: number
          first_recorded: string
          last_updated: string
        }
        Insert: {
          id?: string
          user_id: string
          skill_id: string
          proficiency_level?: 'learning' | 'practicing' | 'proficient' | 'expert'
          evidence_count?: number
          first_recorded?: string
          last_updated?: string
        }
        Update: {
          id?: string
          user_id?: string
          skill_id?: string
          proficiency_level?: 'learning' | 'practicing' | 'proficient' | 'expert'
          evidence_count?: number
          first_recorded?: string
          last_updated?: string
        }
      }
      badges: {
        Row: {
          id: string
          name: string
          description: string
          icon: string
          badge_type: 'milestone' | 'skill' | 'engagement' | 'impact'
          criteria: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description: string
          icon: string
          badge_type: 'milestone' | 'skill' | 'engagement' | 'impact'
          criteria: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          icon?: string
          badge_type?: 'milestone' | 'skill' | 'engagement' | 'impact'
          criteria?: Json
          created_at?: string
          updated_at?: string
        }
      }
      user_badges: {
        Row: {
          id: string
          user_id: string
          badge_id: string
          earned_at: string
          evidence_event_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          badge_id: string
          earned_at?: string
          evidence_event_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          badge_id?: string
          earned_at?: string
          evidence_event_id?: string | null
          created_at?: string
        }
      }
      growth_recommendations: {
        Row: {
          id: string
          user_id: string | null
          program_cohort_id: string | null
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
          user_id?: string | null
          program_cohort_id?: string | null
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
          user_id?: string | null
          program_cohort_id?: string | null
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
  }
}