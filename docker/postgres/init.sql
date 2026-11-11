-- Axis3 - PostgreSQL Initialization Script
-- This script runs on first container startup

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create database (if not exists)
SELECT 'CREATE DATABASE axis3_dev'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'axis3_dev')\gexec

-- Connect to database
\c axis3_dev

-- Create schema
CREATE SCHEMA IF NOT EXISTS public;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE axis3_dev TO axis3_user;
GRANT ALL PRIVILEGES ON SCHEMA public TO axis3_user;

-- Log
SELECT 'PostgreSQL initialized successfully for Axis3 development' AS status;
