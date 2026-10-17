-- Migration: Add push_token column to profiles table for push notification support
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS push_token text;
