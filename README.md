# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.


-- =====================================================
-- MODULE 1: STAFF IDENTITY & AUDIT TRAIL
-- Run this after your existing schema. Safe to re-run (IF NOT EXISTS / OR REPLACE throughout).
-- =====================================================

-- =====================================================
-- 0. DISABLE TABACO / BALAY SAUDAN
-- Commented out, not dropped — the branch row and its historical
-- sales/expenses/schedules stay in the database untouched.
-- Uncomment to re-seed if you reopen it.
-- =====================================================

-- INSERT INTO branches (id, name, code, password, created_at)
-- VALUES (
--   gen_random_uuid(),
--   'Tabaco (Balay Saudan)',
--   'tabaco',
--   'BalaySaudanAdmin101ok',
--   NOW()
-- )
-- ON CONFLICT (code) DO UPDATE SET
--   name = EXCLUDED.name,
--   password = EXCLUDED.password;

-- If you want it gone from staff-facing branch pickers immediately
-- (without touching its data), do this instead of a DROP:
-- UPDATE branches SET password = password || '-disabled-' || now()::text WHERE code = 'tabaco';
-- (breaks login without deleting anything; reversible)


-- =====================================================
-- 1. EXTENSIONS
-- =====================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- for PIN hashing (crypt/gen_salt)


-- =====================================================
-- 2. STAFF TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,  -- nullable: owner can be branch-less (all-branch access)
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('owner', 'manager', 'staff')),
  pin_hash TEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_branch ON staff(branch_id);

-- Public view for the "Who's on shift?" screen — never exposes pin_hash
CREATE OR REPLACE VIEW staff_public AS
  SELECT id, branch_id, name, role, active, created_at
  FROM staff
  WHERE active = TRUE;

-- PIN verification — the ONLY way the app should check a PIN.
-- Runs as table owner (SECURITY DEFINER) so it can read pin_hash
-- even though anon clients cannot select it directly.
CREATE OR REPLACE FUNCTION verify_staff_pin(p_staff_id UUID, p_pin TEXT)
RETURNS TABLE(id UUID, branch_id UUID, name TEXT, role TEXT)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
    SELECT s.id, s.branch_id, s.name, s.role
    FROM staff s
    WHERE s.id = p_staff_id
      AND s.active = TRUE
      AND s.pin_hash = crypt(p_pin, s.pin_hash);
END;
$$;


-- =====================================================
-- 3. AUDIT LOG TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID,
  staff_id UUID,
  action TEXT NOT NULL CHECK (action IN ('insert', 'update', 'void', 'delete')),
  table_name TEXT NOT NULL,
  record_id UUID,
  before JSONB,
  after JSONB,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_branch ON audit_log(branch_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_record ON audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at);


-- =====================================================
-- 4. NEW COLUMNS ON sales, expenses, schedules, inventory
-- =====================================================
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['sales', 'expenses', 'schedules', 'inventory'] LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES staff(id)', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES staff(id)', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS voided_at TIMESTAMP WITH TIME ZONE', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS voided_by UUID REFERENCES staff(id)', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS void_reason TEXT', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE', t);
  END LOOP;
END $$;

-- is_deleted / voided rows must never appear in totals views you already have —
-- when we get to app changes, every list/report query adds:
--   WHERE is_deleted = FALSE AND voided_at IS NULL


-- =====================================================
-- 5. AUDIT TRIGGER — fires on insert/update on the 4 tables
-- Reads identity off the row itself (created_by / updated_by / voided_by),
-- since there is no per-person DB session to read it from.
-- =====================================================
CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_action TEXT;
  v_staff_id UUID;
  v_branch_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'insert';
    v_staff_id := NEW.created_by;
    v_branch_id := NEW.branch_id;

    INSERT INTO audit_log (branch_id, staff_id, action, table_name, record_id, before, after, reason)
    VALUES (v_branch_id, v_staff_id, v_action, TG_TABLE_NAME, NEW.id, NULL, to_jsonb(NEW), NULL);

    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    v_branch_id := NEW.branch_id;

    -- Distinguish void vs soft-delete vs plain update by what actually changed
    IF (OLD.is_deleted IS DISTINCT FROM TRUE) AND NEW.is_deleted = TRUE THEN
      v_action := 'delete';
      v_staff_id := NEW.updated_by;
    ELSIF OLD.voided_at IS NULL AND NEW.voided_at IS NOT NULL THEN
      v_action := 'void';
      v_staff_id := NEW.voided_by;
    ELSE
      v_action := 'update';
      v_staff_id := NEW.updated_by;
    END IF;

    INSERT INTO audit_log (branch_id, staff_id, action, table_name, record_id, before, after, reason)
    VALUES (v_branch_id, v_staff_id, v_action, TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW), NEW.void_reason);

    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    -- Physical deletes shouldn't happen through the app (staff/managers use
    -- is_deleted / voided_at instead), but if one happens anyway — direct
    -- SQL editor use, a bug, anything — the row is captured here before it's gone.
    INSERT INTO audit_log (branch_id, staff_id, action, table_name, record_id, before, after, reason)
    VALUES (OLD.branch_id, OLD.updated_by, 'delete', TG_TABLE_NAME, OLD.id, to_jsonb(OLD), NULL, 'physical delete (bypassed app soft-delete)');

    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['sales', 'expenses', 'schedules', 'inventory'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS audit_%1$s ON %1$s', t);
    EXECUTE format(
      'CREATE TRIGGER audit_%1$s AFTER INSERT OR UPDATE OR DELETE ON %1$s
       FOR EACH ROW EXECUTE FUNCTION public.log_audit_event()', t
    );
  END LOOP;
END $$;


-- =====================================================
-- 6. RLS
-- Honest scope: without per-person Supabase Auth, RLS can't check "who is
-- making this request" — the anon key is shared by the whole app, same as
-- today. What we CAN do at this layer:
--   - keep pin_hash unreadable to anon clients (no SELECT policy on staff)
--   - expose only staff_public (no pin_hash) for the shift-select screen
--   - keep audit_log writable only by the trigger (SECURITY DEFINER),
--     not directly by anon clients
-- Role rules (staff can't hard-delete, etc.) remain enforced in the app UI,
-- same limitation as the PIN itself.
-- =====================================================

ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- No SELECT policy on staff itself -> anon cannot read pin_hash.
-- staff_public view is what the app queries instead.
DROP POLICY IF EXISTS "staff no direct access" ON staff;

GRANT SELECT ON staff_public TO anon, authenticated;
GRANT EXECUTE ON FUNCTION verify_staff_pin(UUID, TEXT) TO anon, authenticated;

-- audit_log: allow the app to read it (Owner-only page, enforced in app UI),
-- but not insert/update/delete directly — only the trigger (SECURITY DEFINER) can.
DROP POLICY IF EXISTS "audit log read" ON audit_log;
CREATE POLICY "audit log read" ON audit_log
  FOR SELECT USING (true);


-- =====================================================
-- 7. STAFF SEED — Ayala Malls Legazpi only
-- =====================================================
DO $$
DECLARE
  v_ayala_id UUID;
BEGIN
  SELECT id INTO v_ayala_id FROM branches WHERE code = 'ayala';

  IF v_ayala_id IS NULL THEN
    RAISE EXCEPTION 'Branch with code=ayala not found — run the base schema first';
  END IF;

  INSERT INTO staff (branch_id, name, role, pin_hash, active)
  VALUES
    (v_ayala_id, 'Bors', 'staff', crypt('1111', gen_salt('bf')), TRUE),
    (v_ayala_id, 'Sani', 'staff', crypt('2222', gen_salt('bf')), TRUE)
  ON CONFLICT DO NOTHING;
END $$;


-- =====================================================
-- 8. NOTIFY ON VOID / DELETE — mirrors the existing on_sale_insert pattern
-- =====================================================
CREATE OR REPLACE FUNCTION public.notify_audit_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  branch_name TEXT;
  staff_name TEXT;
  title TEXT;
BEGIN
  IF NEW.action NOT IN ('void', 'delete') THEN
    RETURN NEW;
  END IF;

  SELECT name INTO branch_name FROM branches WHERE id = NEW.branch_id;
  SELECT name INTO staff_name FROM staff WHERE id = NEW.staff_id;

  title := upper(NEW.action) || ' by ' || coalesce(staff_name, 'unknown') ||
           ' (' || coalesce(branch_name, 'unknown branch') || ')';

  PERFORM net.http_post(
    url := 'https://ntfy.sh',
    body := jsonb_build_object(
      'topic', 'lookup-sales-x9k2m7qpz4',
      'title', title,
      'message', NEW.table_name || ' record ' || NEW.record_id::text ||
                 ' — reason: ' || coalesce(NEW.reason, 'none given'),
      'tags', jsonb_build_array('warning')
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_audit_void_or_delete ON audit_log;
CREATE TRIGGER on_audit_void_or_delete
AFTER INSERT ON audit_log
FOR EACH ROW EXECUTE FUNCTION public.notify_audit_event();


NOTIFY pgrst, 'reload schema';

-- =====================================================
-- VERIFY
-- =====================================================
-- SELECT s.name, s.role, b.name AS branch FROM staff s JOIN branches b ON b.id = s.branch_id;
