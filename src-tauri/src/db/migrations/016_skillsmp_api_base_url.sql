-- Add configurable SkillsMP API base URL to system settings
ALTER TABLE system_settings ADD COLUMN skillsmp_api_base_url TEXT NOT NULL DEFAULT 'https://skillsmp.com';
