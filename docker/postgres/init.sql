-- First start of the local Postgres only. Schema changes belong in Drizzle migrations
-- (apps/api/src/db/migrations), which also create the extensions so RDS gets them too.

-- A separate database for the API's integration tests, so they never touch dev data.
CREATE DATABASE zamani_test OWNER zamani;

\connect zamani
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

\connect zamani_test
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
