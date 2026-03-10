-- Migration: Add full_name column to mentees and mentors tables
-- Run this in the Supabase SQL Editor

ALTER TABLE mentees ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS full_name TEXT;
