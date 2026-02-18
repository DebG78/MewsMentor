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
    }
  }
}