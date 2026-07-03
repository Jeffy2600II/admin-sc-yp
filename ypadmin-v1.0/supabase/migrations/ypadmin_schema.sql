-- ═══════════════════════════════════════════════════════════════
-- YP ADMIN · SCHEMA DOCUMENTATION
-- supabase/migrations/ypadmin_schema.sql
-- ───────────────────────────────────────────────────────────────
-- This file documents the database schema that YP Admin expects.
-- It is SHARED with yplabs and ypwork — they all use the same
-- Supabase project / PostgreSQL database.
--
-- If you're starting fresh, run:
--   1. yplabs's `001_create_all_tables_and_enable_realtime.sql`
--      (creates council_users, council_years, council_duty,
--       council_zone_checks, council_join_requests + base RLS)
--   2. ypwork's `ypwork_schema.sql`
--      (creates departments + ypwork_* tables, extends council_users
--       and council_join_requests with department_id/color/national_id,
--       adds RLS, triggers, seed data)
--   3. ypwork's v1.7 → v1.8 → v1.8.1 upgrade SQL files
--      (RLS fixes, anon INSERT for join_requests, realtime additions)
--
-- YP Admin uses these tables:
--   • council_users         — user accounts (admin/member)
--   • council_years         — school years (Buddhist era, e.g. 2568)
--   • council_join_requests — pending membership applications
--   • departments           — student council departments
-- ═══════════════════════════════════════════════════════════════


-- ─── council_users (extended by ypwork) ──────────────────────────
CREATE TABLE IF NOT EXISTS public.council_users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_uid        UUID UNIQUE,
    full_name       TEXT NOT NULL,
    student_id      TEXT DEFAULT '',
    email           TEXT DEFAULT '',
    year            INTEGER NOT NULL,
    role            TEXT DEFAULT 'member' CHECK (role IN ('admin','member')),
    approved        BOOLEAN DEFAULT FALSE,
    disabled        BOOLEAN DEFAULT FALSE,
    account_type    TEXT DEFAULT 'student' CHECK (account_type IN ('student','teacher','other')),
    -- ypwork extension columns:
    department_id   TEXT REFERENCES public.departments(id) ON DELETE SET NULL,
    color           TEXT DEFAULT '#0EA5E9',
    national_id     TEXT DEFAULT '',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── council_years ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.council_years (
    year        INTEGER PRIMARY KEY,
    closed      BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── council_join_requests (extended by ypwork) ──────────────────
CREATE TABLE IF NOT EXISTS public.council_join_requests (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name       TEXT NOT NULL,
    student_id      TEXT DEFAULT '',
    year            INTEGER NOT NULL,
    email           TEXT DEFAULT '',
    account_type    TEXT DEFAULT 'student',
    -- ypwork extension columns:
    department_id   TEXT REFERENCES public.departments(id),
    national_id     TEXT DEFAULT '',
    message         TEXT DEFAULT '',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── departments (ypwork-owned) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.departments (
    id                  TEXT PRIMARY KEY,
    name                TEXT NOT NULL,
    color               TEXT DEFAULT '#0EA5E9',
    icon                TEXT DEFAULT '👥',
    description         TEXT DEFAULT '',
    head_user_auth_uid  TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);


-- ═══════════════════════════════════════════════════════════════
-- RLS POLICIES (must match yplabs + ypwork)
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.council_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.council_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.council_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- service_role: full access (bypasses RLS automatically — no policy needed)

-- council_users: authenticated can SELECT all (admin needs to see everyone)
--                users can only UPDATE/DELETE their own row (via auth.uid() = auth_uid)
CREATE POLICY "council_users_select_authenticated"
    ON public.council_users FOR SELECT
    TO authenticated USING (true);

CREATE POLICY "council_users_update_self_or_admin"
    ON public.council_users FOR UPDATE
    TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "council_users_delete_admin"
    ON public.council_users FOR DELETE
    TO authenticated USING (true);

CREATE POLICY "council_users_insert_admin"
    ON public.council_users FOR INSERT
    TO authenticated WITH CHECK (true);

-- council_years: anyone can SELECT (register page needs to list years)
CREATE POLICY "council_years_select_anyone"
    ON public.council_years FOR SELECT
    TO anon, authenticated USING (true);

CREATE POLICY "council_years_modify_admin"
    ON public.council_years FOR ALL
    TO authenticated USING (true) WITH CHECK (true);

-- council_join_requests: anon + authenticated can INSERT (public registration)
--                        authenticated can SELECT all + DELETE (admin approval)
CREATE POLICY "council_join_requests_insert_anyone"
    ON public.council_join_requests FOR INSERT
    TO anon, authenticated WITH CHECK (true);

CREATE POLICY "council_join_requests_select_authenticated"
    ON public.council_join_requests FOR SELECT
    TO authenticated USING (true);

CREATE POLICY "council_join_requests_delete_admin"
    ON public.council_join_requests FOR DELETE
    TO authenticated USING (true);

-- departments: anon + authenticated can SELECT (register page needs to list)
--              authenticated can do anything
CREATE POLICY "departments_select_anyone"
    ON public.departments FOR SELECT
    TO anon, authenticated USING (true);

CREATE POLICY "departments_modify_admin"
    ON public.departments FOR ALL
    TO authenticated USING (true) WITH CHECK (true);


-- ═══════════════════════════════════════════════════════════════
-- REALTIME (Supabase Realtime publication)
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.council_users REPLICA IDENTITY FULL;
ALTER TABLE public.council_years REPLICA IDENTITY FULL;
ALTER TABLE public.council_join_requests REPLICA IDENTITY FULL;
ALTER TABLE public.departments REPLICA IDENTITY FULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'council_users'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.council_users;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'council_years'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.council_years;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'council_join_requests'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.council_join_requests;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'departments'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.departments;
    END IF;
END $$;


-- ═══════════════════════════════════════════════════════════════
-- TRIGGERS: auto-update updated_at on departments
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.ypadmin_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS departments_updated_at ON public.departments;
CREATE TRIGGER departments_updated_at
    BEFORE UPDATE ON public.departments
    FOR EACH ROW
    EXECUTE FUNCTION public.ypadmin_set_updated_at();


-- ═══════════════════════════════════════════════════════════════
-- SEED DATA (departments — same as ypwork)
-- ═══════════════════════════════════════════════════════════════
INSERT INTO public.departments (id, name, color, icon, description) VALUES
    ('d1', 'ฝ่ายบริหาร',       '#0EA5E9', '👥', 'ประธาน รองประธาน และเลขานุการสภานักเรียน — ดูแลภาพรวมและประสานงานระหว่างฝ่าย'),
    ('d2', 'ฝ่ายกิจกรรม',       '#22D3EE', '🎨', 'ดูแลกิจกรรมวันสำคัญ พิธีการ การแสดง และการจัดงานของโรงเรียน'),
    ('d3', 'ฝ่ายวิชาการ',       '#0EA5E9', '📚', 'ดูแลการแข่งขันทางวิชาการ การส่งเสริมความรู้ และร่วมมือกับครูที่ปรึกษาวิชาการ'),
    ('d4', 'ฝ่ายทำเนียบ',       '#F59E0B', '📋', 'ดูแลเอกสาร การประชุม การเก็บบันทึก และระเบียบต่าง ๆ ของสภานักเรียน'),
    ('d5', 'ฝ่ายการเงิน',       '#EC4899', '💰', 'ดูแลงบประมาณ การเบิกจ่าย การรับบริจาค และการระดมทุนของสภานักเรียน'),
    ('d6', 'ฝ่ายประชาสัมพันธ์', '#D946EF', '📢', 'ดูแลการประชาสัมพันธ์ โซเชียลมีเดีย ป้ายประกาศ และการติดต่อกับภายนอก')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    color = EXCLUDED.color,
    icon = EXCLUDED.icon,
    description = EXCLUDED.description;


-- ═══════════════════════════════════════════════════════════════
-- CREATING AN ADMIN USER (manual — first time setup)
-- ═══════════════════════════════════════════════════════════════
-- 1. In Supabase Dashboard → Authentication → Users → "Add user"
--    - Email: student_38001@yplabs.internal  (for a student)
--             or admin@school.ac.th           (for a teacher)
--    - Password: 38001 (for student) or your chosen password (for teacher)
--    - Check "Auto Confirm User"
--
-- 2. Get the user's auth_uid (UUID) from the user list
--
-- 3. Insert the council_users row (run in SQL Editor):
--    INSERT INTO public.council_users (
--      auth_uid, full_name, student_id, year, role,
--      approved, disabled, account_type,
--      department_id, color, national_id
--    ) VALUES (
--      'PASTE-AUTH-UID-HERE',
--      'ชื่อ แอดมิน',
--      '38001',           -- student_id (or empty for teacher)
--      68,                -- year (Buddhist era short, e.g. 68 = 2568)
--      'admin',           -- role MUST be 'admin' for YP Admin access
--      true,              -- approved
--      false,             -- disabled
--      'student',         -- account_type
--      'd1',              -- department_id
--      '#0EA5E9',         -- color
--      '1100501245621'    -- national_id (13 digits) — only for students
--    );
-- ═══════════════════════════════════════════════════════════════
