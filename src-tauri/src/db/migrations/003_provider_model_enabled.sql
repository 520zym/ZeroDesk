-- Add enabled column to model_providers and models
ALTER TABLE model_providers ADD COLUMN enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE models ADD COLUMN enabled INTEGER NOT NULL DEFAULT 1;
