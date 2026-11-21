-- Runs once when the Docker volume is initialised. The migration also enables
-- the extension so managed databases work without this file.
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
