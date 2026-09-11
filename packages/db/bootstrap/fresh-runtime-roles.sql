-- Run as the owner of a fresh isolated PostgreSQL project before the squashed
-- Drizzle baseline. Passwords are intentionally configured separately.
DO $$
BEGIN
  IF to_regrole('slgs_migrator') IS NULL THEN
    CREATE ROLE slgs_migrator LOGIN NOSUPERUSER INHERIT NOCREATEROLE NOCREATEDB;
  END IF;
  IF to_regrole('slgs_web') IS NULL THEN
    CREATE ROLE slgs_web LOGIN NOSUPERUSER INHERIT NOCREATEROLE NOCREATEDB;
  END IF;
  IF to_regrole('slgs_cms') IS NULL THEN
    CREATE ROLE slgs_cms LOGIN NOSUPERUSER INHERIT NOCREATEROLE NOCREATEDB;
  END IF;
  IF to_regrole('slgs_platform_admin') IS NULL THEN
    CREATE ROLE slgs_platform_admin LOGIN NOSUPERUSER INHERIT NOCREATEROLE NOCREATEDB;
  END IF;
END $$;

GRANT CONNECT ON DATABASE slgs
TO slgs_migrator, slgs_web, slgs_cms, slgs_platform_admin;
GRANT USAGE, CREATE ON SCHEMA public TO slgs_migrator;
