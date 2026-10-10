-- Add onboarding_completed to profiles
ALTER TABLE profiles ADD COLUMN onboarding_completed boolean DEFAULT false;
