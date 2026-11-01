# Database Schema Specification

This document details the PostgreSQL schema designed for the Minimalist Link Storage and Resource Management system running on **Supabase**.

---

## 1. Entity Overview

The system uses a dedicated table `public.resources` to persist Google Drive links and associated metadata. Access control is enforced at the database layer using PostgreSQL Row Level Security (RLS) integrated with Supabase Authentication.

```
+---------------------------------------------------------------+
|                       auth.users (Supabase)                   |
|   id: UUID (Primary Key)                                      |
|   email: VARCHAR (e.g. cse@drivehub.local)                    |
+-------------------------------+-------------------------------+
                                | 1
                                | 
                                | * (optional reference)
+-------------------------------v-------------------------------+
|                       public.resources                        |
+---------------------------------------------------------------+
| id             : UUID (PK, gen_random_uuid())                 |
| title          : VARCHAR(255) NOT NULL                        |
| description    : TEXT                                         |
| url            : TEXT NOT NULL                                |
| category       : VARCHAR(80) NOT NULL DEFAULT 'General'       |
| file_id        : VARCHAR(120)                                 |
| resource_type  : VARCHAR(50) NOT NULL DEFAULT 'file'          |
| thumbnail_url  : TEXT                                         |
| created_at     : TIMESTAMPTZ NOT NULL DEFAULT now()           |
| updated_at     : TIMESTAMPTZ NOT NULL DEFAULT now()           |
| created_by     : UUID REFERENCES auth.users(id)               |
+---------------------------------------------------------------+
```

---

## 2. Table Definition: `public.resources`

### Column Descriptions

| Column Name | Data Type | Nullable | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | No | `gen_random_uuid()` | Unique primary key identifier for the resource. |
| `title` | `VARCHAR(255)` | No | — | Human-readable title of the resource. |
| `description` | `TEXT` | Yes | `NULL` | Concise summary or notes describing the resource content. |
| `url` | `TEXT` | No | — | Original Google Drive sharing URL or external link. |
| `category` | `VARCHAR(80)` | No | `'General'` | Categorical grouping (e.g., Computer Science, Notes, Lab). |
| `file_id` | `VARCHAR(120)` | Yes | `NULL` | Extracted Google Drive identifier used to generate direct downloads. |
| `resource_type`| `VARCHAR(50)` | No | `'file'` | Type classifier: `file`, `folder`, `document`, `spreadsheet`, `presentation`, `link`. |
| `thumbnail_url`| `TEXT` | Yes | `NULL` | Optional preview image or icon link. |
| `created_at` | `TIMESTAMPTZ` | No | `timezone('utc', now())`| Timestamp when the resource record was first added. |
| `updated_at` | `TIMESTAMPTZ` | No | `timezone('utc', now())`| Timestamp when the resource was last modified. |
| `created_by` | `UUID` | Yes | `NULL` | Foreign key referencing `auth.users(id)` representing the creator. |

---

## 3. SQL Creation Scripts

```sql
-- Create table
CREATE TABLE IF NOT EXISTS public.resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    url TEXT NOT NULL,
    category VARCHAR(80) NOT NULL DEFAULT 'General',
    file_id VARCHAR(120),
    resource_type VARCHAR(50) NOT NULL DEFAULT 'file',
    thumbnail_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Automatic timestamp trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_resources_updated_at ON public.resources;
CREATE TRIGGER set_resources_updated_at
    BEFORE UPDATE ON public.resources
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
```

---

## 4. Required Indexes

To maintain sub-millisecond query performance as resources grow:

```sql
-- Category index for fast filtering
CREATE INDEX IF NOT EXISTS idx_resources_category 
    ON public.resources(category);

-- Timestamp index for sorting newest vs oldest
CREATE INDEX IF NOT EXISTS idx_resources_created_at 
    ON public.resources(created_at DESC);

-- GIN trigram / text search index for fast title and description search
CREATE INDEX IF NOT EXISTS idx_resources_title_trgm 
    ON public.resources USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));
```

---

## 5. Row Level Security (RLS) Policies

Row Level Security ensures that unauthenticated clients cannot insert, update, or delete records, regardless of whether they attempt to call the Supabase REST API directly.

```sql
-- 1. Enable RLS
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

-- 2. Public Read Access: Anyone can read resources
CREATE POLICY "Public can view resources"
    ON public.resources
    FOR SELECT
    USING (true);

-- 3. Authenticated Admin Insert Access
CREATE POLICY "Authenticated users can insert resources"
    ON public.resources
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- 4. Authenticated Admin Update Access
CREATE POLICY "Authenticated users can update resources"
    ON public.resources
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 5. Authenticated Admin Delete Access
CREATE POLICY "Authenticated users can delete resources"
    ON public.resources
    FOR DELETE
    TO authenticated
    USING (true);
```

---

## 6. Admin Role Management Structure

### Authentication Flow
1. **Frontend Authentication**: The administrator visits `/login.html` and enters credentials:
   - Username: `cse` (maps to `cse@drivehub.local` or registered email)
   - Password: `n2027`
2. **Supabase Auth Engine**: `supabase.auth.signInWithPassword({ email, password })` verifies the hashed password using bcrypt.
3. **Session Token**: On successful authentication, Supabase returns a JSON Web Token (JWT) with the role `authenticated`.
4. **RLS Authorization**: When the admin creates, updates, or deletes records via the Admin Dashboard, the Supabase client sends the JWT in the `Authorization: Bearer <token>` header. Supabase PostgreSQL verifies the token against the `authenticated` policies defined above.
5. **Session Expiry & Sign Out**: Calling `supabase.auth.signOut()` clears the local session, instantly revoking write permissions across all endpoints.

### Creating the Initial Admin
In Supabase Dashboard:
1. Navigate to **Authentication** > **Users**.
2. Click **Add User** -> **Create User**.
3. **Email**: `cse@drivehub.local`
4. **Password**: `n2027`
5. **Auto Confirm User**: Checked (Enabled)
6. Click **Create User**.
