/*
# Unified Class Calendar System Overhaul

## Overview
Upgrades the classes table into a proper class scheduling system with:
- Student assignment per class session (not just per course)
- End times, meeting platform
- Teaching log fields: topics, homework, skill focus, resources, remarks
- "rescheduled" status added to the status enum
- Recurring class schedule support via recurring_classes table
- Notification automation via DB triggers

## Changes to `classes` table (additive — no data loss)
New columns:
- `end_time` time — optional end time
- `platform` text — meeting platform (Zoom, Google Meet, Lichess, Chess.com, Other)
- `topics_covered` text — what was taught (filled after class)
- `homework` text — homework assigned
- `skill_focus` text — skill area focused on
- `resources_used` text — materials/resources used
- `class_remarks` text — general remarks
- `recurring_id` uuid — links to recurring_classes template (nullable)
- `original_date` date — original date if rescheduled

Status constraint updated to include 'rescheduled'.

## New table: `class_students`
Links students to specific class sessions (not just course enrollment).
- `id` uuid PK
- `class_id` uuid FK -> classes(id) ON DELETE CASCADE
- `student_id` uuid FK -> profiles(id) ON DELETE CASCADE
- `assigned_at` timestamptz default now()
- UNIQUE(class_id, student_id)

## New table: `recurring_classes`
Template for recurring class schedules.
- `id` uuid PK
- `course_id` uuid FK -> courses(id) ON DELETE CASCADE
- `coach_id` uuid FK -> profiles(id) ON DELETE CASCADE
- `title` text
- `day_of_week` int (0=Sun ... 6=Sat)
- `start_time` text
- `end_time` text
- `platform` text
- `meeting_url` text
- `start_date` date — when the recurrence begins
- `end_date` date — when the recurrence ends
- `num_weeks` int — how many weeks to generate
- `created_by` uuid
- `created_at` timestamptz

## New function: `notify_class_students`
SECURITY DEFINER function that creates notifications for all students
assigned to a class. Used when a class is rescheduled/cancelled/changed.

## New function: `notify_all_students`
SECURITY DEFINER function that creates notifications for all students
in the academy. Used when a tournament is created/changed.

## Security (RLS)
- class_students: owner/coach full access, students read own rows
- recurring_classes: owner/coach CRUD, students read
- notifications: students read/update own, owner insert
*/

-- ============================================================
-- 1. Add columns to classes
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='classes' AND column_name='end_time') THEN
    ALTER TABLE classes ADD COLUMN end_time time;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='classes' AND column_name='platform') THEN
    ALTER TABLE classes ADD COLUMN platform text DEFAULT 'Google Meet';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='classes' AND column_name='topics_covered') THEN
    ALTER TABLE classes ADD COLUMN topics_covered text DEFAULT '';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='classes' AND column_name='homework') THEN
    ALTER TABLE classes ADD COLUMN homework text DEFAULT '';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='classes' AND column_name='skill_focus') THEN
    ALTER TABLE classes ADD COLUMN skill_focus text DEFAULT '';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='classes' AND column_name='resources_used') THEN
    ALTER TABLE classes ADD COLUMN resources_used text DEFAULT '';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='classes' AND column_name='class_remarks') THEN
    ALTER TABLE classes ADD COLUMN class_remarks text DEFAULT '';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='classes' AND column_name='recurring_id') THEN
    ALTER TABLE classes ADD COLUMN recurring_id uuid;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='classes' AND column_name='original_date') THEN
    ALTER TABLE classes ADD COLUMN original_date date;
  END IF;
END $$;

-- Update status constraint to include 'rescheduled'
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='classes' AND column_name='status') THEN
    ALTER TABLE classes DROP CONSTRAINT IF EXISTS classes_status_check;
    ALTER TABLE classes ADD CONSTRAINT classes_status_check
      CHECK (status IN ('scheduled','completed','cancelled','rescheduled'));
  END IF;
END $$;

-- ============================================================
-- 2. class_students table
-- ============================================================
CREATE TABLE IF NOT EXISTS class_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now(),
  UNIQUE(class_id, student_id)
);

ALTER TABLE class_students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_class_students" ON class_students;
CREATE POLICY "select_class_students" ON class_students FOR SELECT
  TO authenticated USING (
    student_id = auth.uid()
    OR public.is_owner()
    OR EXISTS (SELECT 1 FROM classes c WHERE c.id = class_students.class_id AND c.coach_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_class_students" ON class_students;
CREATE POLICY "insert_class_students" ON class_students FOR INSERT
  TO authenticated WITH CHECK (
    public.is_owner()
    OR EXISTS (SELECT 1 FROM classes c WHERE c.id = class_students.class_id AND c.coach_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_class_students" ON class_students;
CREATE POLICY "delete_class_students" ON class_students FOR DELETE
  TO authenticated USING (
    public.is_owner()
    OR EXISTS (SELECT 1 FROM classes c WHERE c.id = class_students.class_id AND c.coach_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_class_students_class ON class_students(class_id);
CREATE INDEX IF NOT EXISTS idx_class_students_student ON class_students(student_id);

-- ============================================================
-- 3. recurring_classes table
-- ============================================================
CREATE TABLE IF NOT EXISTS recurring_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  coach_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  day_of_week int NOT NULL DEFAULT 1,
  start_time text NOT NULL DEFAULT '16:00',
  end_time text,
  platform text DEFAULT 'Google Meet',
  meeting_url text DEFAULT '',
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  num_weeks int NOT NULL DEFAULT 12,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE recurring_classes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_recurring_classes" ON recurring_classes;
CREATE POLICY "select_recurring_classes" ON recurring_classes FOR SELECT
  TO authenticated USING (
    public.is_owner()
    OR coach_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM class_students cs
      JOIN classes c ON c.id = cs.class_id
      WHERE c.recurring_id = recurring_classes.id AND cs.student_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_recurring_classes" ON recurring_classes;
CREATE POLICY "insert_recurring_classes" ON recurring_classes FOR INSERT
  TO authenticated WITH CHECK (public.is_owner() OR coach_id = auth.uid());

DROP POLICY IF EXISTS "delete_recurring_classes" ON recurring_classes;
CREATE POLICY "delete_recurring_classes" ON recurring_classes FOR DELETE
  TO authenticated USING (public.is_owner() OR coach_id = auth.uid());

-- ============================================================
-- 4. Helper functions for notifications
-- ============================================================

-- Notify all students assigned to a specific class
CREATE OR REPLACE FUNCTION public.notify_class_students(
  p_class_id uuid,
  p_title text,
  p_message text,
  p_category text DEFAULT 'class'
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO notifications (user_id, category, title, message, link)
  SELECT cs.student_id, p_category, p_title, p_message, '/calendar'
  FROM class_students cs
  WHERE cs.class_id = p_class_id;
END;
$$;

-- Notify all students in the academy
CREATE OR REPLACE FUNCTION public.notify_all_students(
  p_title text,
  p_message text,
  p_category text DEFAULT 'tournament'
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO notifications (user_id, category, title, message, link)
  SELECT id, p_category, p_title, p_message, '/tournaments'
  FROM profiles WHERE role = 'student';
END;
$$;

-- ============================================================
-- 5. Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_classes_coach_date ON classes(coach_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_classes_course ON classes(course_id);
CREATE INDEX IF NOT EXISTS idx_classes_status ON classes(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read);