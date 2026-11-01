-- ==============================================================================
-- MINIMALIST RESOURCE MANAGEMENT SCHEMA
-- Execute in Supabase SQL Editor: https://supabase.com/dashboard/project/zeqefyxwhznqiyfgjmrn/sql
-- ==============================================================================

-- 1. Create the resources table
CREATE TABLE IF NOT EXISTS public.resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    category VARCHAR(120) NOT NULL DEFAULT 'APSSDC - AWS',
    file_id VARCHAR(120),
    resource_type VARCHAR(50) NOT NULL DEFAULT 'file',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Performance Index
CREATE INDEX IF NOT EXISTS idx_resources_category ON public.resources(category);
CREATE INDEX IF NOT EXISTS idx_resources_created_at ON public.resources(created_at DESC);

-- 3. Simple Direct Client-Side Access (No Heavy Auth Required)
-- This allows your lightweight frontend to read, add, and delete links directly:
ALTER TABLE public.resources DISABLE ROW LEVEL SECURITY;
