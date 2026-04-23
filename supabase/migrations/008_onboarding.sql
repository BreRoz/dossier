ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;
-- Existing subscribers skip onboarding
UPDATE subscribers SET onboarding_completed = true WHERE onboarding_completed IS DISTINCT FROM true;
