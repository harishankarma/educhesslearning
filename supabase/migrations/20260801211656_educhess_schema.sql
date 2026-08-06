/*
# EduChess Courses — Full Schema

## Overview
Creates the complete data model for a chess academy spaced-repetition + coaching platform.
Roles: owner, coach, student. No public signup — accounts are created by the owner via an
admin edge function that uses the service-role key.

## New Tables
1. `profiles` — mirrors auth.users with name + role (owner/coach/student).
2. `courses` — created by a coach or owner.
3. `lessons` — belongs to a course, ordered, with content/video/pgn/fen.
4. `enrollments` — links a student to a course.
5. `coach_students` — maps a coach to their students (1 coach : N students).
6. `chats` — 1-to-1 conversation between a coach and a student.
7. `messages` — messages in a chat (text + optional file_url/file_type).
8. `lesson_progress` — tracks which lessons a student has completed.

## Security (RLS)
- profiles: users read/update own; coaches read their students; owner reads all.
- courses: coaches read own + owner all; coach/owner insert/update/delete own.
- lessons: visible if the viewer owns the course OR is enrolled in it.
- enrollments: students read own; coaches read for their students; owner all; owner/coach insert.
- coach_students: coach reads own rows; student reads own row; owner all; owner insert/delete.
- chats: coach + student of the chat can read; owner all.
- messages: participants of the chat can read/insert; owner all.
- lesson_progress: student reads/inserts/updates own; coach/owner read for their students.
- Storage bucket `chat-files` is public-read so message bubbles can render images/PDFs;
  only authenticated users can upload.
*/

-- ============================================================
-- PROFILES (created first, no helper deps)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'student' CHECK (role IN ('owner','coach','student')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- COURSES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- LESSONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  video_url text NOT NULL DEFAULT '',
  pgn text NOT NULL DEFAULT '',
  fen text NOT NULL DEFAULT '',
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS lessons_course_order_idx ON public.lessons (course_id, order_index);

-- ============================================================
-- ENROLLMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  assigned_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, course_id)
);
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- COACH_STUDENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.coach_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (coach_id, student_id)
);
ALTER TABLE public.coach_students ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- CHATS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (coach_id, student_id)
);
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  file_url text NOT NULL DEFAULT '',
  file_type text NOT NULL DEFAULT 'none' CHECK (file_type IN ('pdf','image','none')),
  file_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS messages_chat_created_idx ON public.messages (chat_id, created_at);

-- ============================================================
-- LESSON_PROGRESS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  completed boolean NOT NULL DEFAULT true,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, lesson_id)
);
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER FUNCTIONS (after coach_students exists)
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_owner() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner');
$$;

CREATE OR REPLACE FUNCTION public.is_coach() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'coach');
$$;

CREATE OR REPLACE FUNCTION public.my_coaches() RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coach_id FROM public.coach_students WHERE student_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.my_students() RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT student_id FROM public.coach_students WHERE coach_id = auth.uid();
$$;

-- ============================================================
-- POLICIES: PROFILES
-- ============================================================
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT
TO authenticated USING (
  id = auth.uid() OR public.is_owner() OR id IN (SELECT public.my_students())
);

DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE
TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- ============================================================
-- POLICIES: COURSES
-- ============================================================
DROP POLICY IF EXISTS "courses_select" ON public.courses;
CREATE POLICY "courses_select" ON public.courses FOR SELECT
TO authenticated USING (
  created_by = auth.uid()
  OR public.is_owner()
  OR id IN (SELECT course_id FROM public.enrollments WHERE student_id = auth.uid())
);

DROP POLICY IF EXISTS "courses_insert" ON public.courses;
CREATE POLICY "courses_insert" ON public.courses FOR INSERT
TO authenticated WITH CHECK (created_by = auth.uid() AND (public.is_coach() OR public.is_owner()));

DROP POLICY IF EXISTS "courses_update" ON public.courses;
CREATE POLICY "courses_update" ON public.courses FOR UPDATE
TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "courses_delete" ON public.courses;
CREATE POLICY "courses_delete" ON public.courses FOR DELETE
TO authenticated USING (created_by = auth.uid());

-- ============================================================
-- POLICIES: LESSONS
-- ============================================================
DROP POLICY IF EXISTS "lessons_select" ON public.lessons;
CREATE POLICY "lessons_select" ON public.lessons FOR SELECT
TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = lessons.course_id
    AND (
      c.created_by = auth.uid()
      OR public.is_owner()
      OR c.id IN (SELECT course_id FROM public.enrollments WHERE student_id = auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "lessons_insert" ON public.lessons;
CREATE POLICY "lessons_insert" ON public.lessons FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = lessons.course_id AND c.created_by = auth.uid()
  )
);

DROP POLICY IF EXISTS "lessons_update" ON public.lessons;
CREATE POLICY "lessons_update" ON public.lessons FOR UPDATE
TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.courses c WHERE c.id = lessons.course_id AND c.created_by = auth.uid()
  )
);

DROP POLICY IF EXISTS "lessons_delete" ON public.lessons;
CREATE POLICY "lessons_delete" ON public.lessons FOR DELETE
TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.courses c WHERE c.id = lessons.course_id AND c.created_by = auth.uid()
  )
);

-- ============================================================
-- POLICIES: ENROLLMENTS
-- ============================================================
DROP POLICY IF EXISTS "enrollments_select" ON public.enrollments;
CREATE POLICY "enrollments_select" ON public.enrollments FOR SELECT
TO authenticated USING (
  student_id = auth.uid()
  OR public.is_owner()
  OR student_id IN (SELECT public.my_students())
);

DROP POLICY IF EXISTS "enrollments_insert" ON public.enrollments;
CREATE POLICY "enrollments_insert" ON public.enrollments FOR INSERT
TO authenticated WITH CHECK (public.is_owner() OR assigned_by = auth.uid());

DROP POLICY IF EXISTS "enrollments_delete" ON public.enrollments;
CREATE POLICY "enrollments_delete" ON public.enrollments FOR DELETE
TO authenticated USING (public.is_owner() OR assigned_by = auth.uid());

-- ============================================================
-- POLICIES: COACH_STUDENTS
-- ============================================================
DROP POLICY IF EXISTS "coach_students_select" ON public.coach_students;
CREATE POLICY "coach_students_select" ON public.coach_students FOR SELECT
TO authenticated USING (
  coach_id = auth.uid() OR student_id = auth.uid() OR public.is_owner()
);

DROP POLICY IF EXISTS "coach_students_insert" ON public.coach_students;
CREATE POLICY "coach_students_insert" ON public.coach_students FOR INSERT
TO authenticated WITH CHECK (public.is_owner());

DROP POLICY IF EXISTS "coach_students_delete" ON public.coach_students;
CREATE POLICY "coach_students_delete" ON public.coach_students FOR DELETE
TO authenticated USING (public.is_owner());

-- ============================================================
-- POLICIES: CHATS
-- ============================================================
DROP POLICY IF EXISTS "chats_select" ON public.chats;
CREATE POLICY "chats_select" ON public.chats FOR SELECT
TO authenticated USING (
  coach_id = auth.uid() OR student_id = auth.uid() OR public.is_owner()
);

DROP POLICY IF EXISTS "chats_insert" ON public.chats;
CREATE POLICY "chats_insert" ON public.chats FOR INSERT
TO authenticated WITH CHECK (
  coach_id = auth.uid() OR student_id = auth.uid() OR public.is_owner()
);

-- ============================================================
-- POLICIES: MESSAGES
-- ============================================================
DROP POLICY IF EXISTS "messages_select" ON public.messages;
CREATE POLICY "messages_select" ON public.messages FOR SELECT
TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.chats c
    WHERE c.id = messages.chat_id
    AND (c.coach_id = auth.uid() OR c.student_id = auth.uid() OR public.is_owner())
  )
);

DROP POLICY IF EXISTS "messages_insert" ON public.messages;
CREATE POLICY "messages_insert" ON public.messages FOR INSERT
TO authenticated WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.chats c
    WHERE c.id = messages.chat_id
    AND (c.coach_id = auth.uid() OR c.student_id = auth.uid())
  )
);

-- ============================================================
-- POLICIES: LESSON_PROGRESS
-- ============================================================
DROP POLICY IF EXISTS "lesson_progress_select" ON public.lesson_progress;
CREATE POLICY "lesson_progress_select" ON public.lesson_progress FOR SELECT
TO authenticated USING (
  student_id = auth.uid()
  OR public.is_owner()
  OR student_id IN (SELECT public.my_students())
);

DROP POLICY IF EXISTS "lesson_progress_insert" ON public.lesson_progress;
CREATE POLICY "lesson_progress_insert" ON public.lesson_progress FOR INSERT
TO authenticated WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "lesson_progress_update" ON public.lesson_progress;
CREATE POLICY "lesson_progress_update" ON public.lesson_progress FOR UPDATE
TO authenticated USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

-- ============================================================
-- STORAGE BUCKET: chat-files (public read, auth upload)
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-files', 'chat-files', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "chat_files_read" ON storage.objects;
CREATE POLICY "chat_files_read" ON storage.objects FOR SELECT
TO public USING (bucket_id = 'chat-files');

DROP POLICY IF EXISTS "chat_files_upload" ON storage.objects;
CREATE POLICY "chat_files_upload" ON storage.objects FOR INSERT
TO authenticated WITH CHECK (bucket_id = 'chat-files');

-- ============================================================
-- TRIGGER: auto-create profile on auth user creation
-- The edge function passes name + role in user_metadata so this trigger
-- populates the profiles row automatically.
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
