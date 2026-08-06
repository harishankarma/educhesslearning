/*
# Add Lesson Types: Puzzles & Interactive Lessons

## Overview
Extends the existing `lessons` table to support three types of lessons:
1. **normal** — the existing text/video + chess board lesson (default)
2. **puzzles** — a set of chess positions (FEN) where students must find the correct move
3. **interactive** — a ChessBase-style lesson: YouTube video plays, pauses at checkpoints,
   student must find the best move on the board; correct → congrats video + continue,
   wrong → explanation video + retry

## New Columns on `lessons`
- `lesson_type text NOT NULL DEFAULT 'normal'` — one of 'normal', 'puzzles', 'interactive'
- `intro_video_url text` — optional YouTube link shown at the start of an interactive lesson
  (e.g. a "congrats" video that plays after a correct answer, or an intro)

## New Tables

### `lesson_puzzles`
Puzzle positions for `lesson_type = 'puzzles'` lessons.
- `id` uuid PK
- `lesson_id` uuid FK → lessons(id) ON DELETE CASCADE
- `fen text NOT NULL` — the starting position of the puzzle
- `correct_san text NOT NULL` — the correct move in SAN notation (e.g. "Nf6")
- `order_index int NOT NULL DEFAULT 0` — puzzle order
- `created_at timestamptz DEFAULT now()

### `lesson_interactive_steps`
Ordered checkpoints for `lesson_type = 'interactive'` lessons.
Each step pauses the video and asks the student to find the best move.
- `id` uuid PK
- `lesson_id` uuid FK → lessons(id) ON DELETE CASCADE
- `fen text NOT NULL` — board position shown at this checkpoint
- `correct_san text NOT NULL` — the correct move
- `prompt text` — the question shown (e.g. "What's the best move?")
- `pause_at_seconds int` — when in the video to pause (seconds from start)
- `congrats_video_url text` — YouTube link played on correct answer
- `explanation_video_url text` — YouTube link played on wrong answer
- `order_index int NOT NULL DEFAULT 0`
- `created_at timestamptz DEFAULT now()

## Security
- RLS enabled on both new tables.
- Same ownership pattern as `lesson_files`: coaches (course owners) can CRUD;
  students enrolled in the course can SELECT.
- Uses the same `is_owner()` and `is_coach()` helper functions already defined.
*/

-- Add lesson_type column
DO $$ BEGIN
  ALTER TABLE public.lessons ADD COLUMN lesson_type text NOT NULL DEFAULT 'normal';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.lessons ADD COLUMN intro_video_url text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Add CHECK constraint for lesson_type
DO $$ BEGIN
  ALTER TABLE public.lessons ADD CONSTRAINT lessons_lesson_type_check
    CHECK (lesson_type IN ('normal', 'puzzles', 'interactive'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- lesson_puzzles
-- ============================================================
CREATE TABLE IF NOT EXISTS public.lesson_puzzles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  fen text NOT NULL,
  correct_san text NOT NULL,
  order_index int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lesson_puzzles ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS lesson_puzzles_lesson_idx ON public.lesson_puzzles (lesson_id, order_index);

DROP POLICY IF EXISTS "lesson_puzzles_select" ON public.lesson_puzzles;
CREATE POLICY "lesson_puzzles_select" ON public.lesson_puzzles FOR SELECT
TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.lessons l
    JOIN public.courses c ON c.id = l.course_id
    WHERE l.id = lesson_puzzles.lesson_id
    AND (
      c.created_by = auth.uid()
      OR public.is_owner()
      OR c.id IN (SELECT course_id FROM public.enrollments WHERE student_id = auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "lesson_puzzles_insert" ON public.lesson_puzzles;
CREATE POLICY "lesson_puzzles_insert" ON public.lesson_puzzles FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.lessons l
    JOIN public.courses c ON c.id = l.course_id
    WHERE l.id = lesson_puzzles.lesson_id AND c.created_by = auth.uid()
  )
);

DROP POLICY IF EXISTS "lesson_puzzles_update" ON public.lesson_puzzles;
CREATE POLICY "lesson_puzzles_update" ON public.lesson_puzzles FOR UPDATE
TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.lessons l
    JOIN public.courses c ON c.id = l.course_id
    WHERE l.id = lesson_puzzles.lesson_id AND c.created_by = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.lessons l
    JOIN public.courses c ON c.id = l.course_id
    WHERE l.id = lesson_puzzles.lesson_id AND c.created_by = auth.uid()
  )
);

DROP POLICY IF EXISTS "lesson_puzzles_delete" ON public.lesson_puzzles;
CREATE POLICY "lesson_puzzles_delete" ON public.lesson_puzzles FOR DELETE
TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.lessons l
    JOIN public.courses c ON c.id = l.course_id
    WHERE l.id = lesson_puzzles.lesson_id AND c.created_by = auth.uid()
  )
);

-- ============================================================
-- lesson_interactive_steps
-- ============================================================
CREATE TABLE IF NOT EXISTS public.lesson_interactive_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  fen text NOT NULL,
  correct_san text NOT NULL,
  prompt text,
  pause_at_seconds int NOT NULL DEFAULT 0,
  congrats_video_url text,
  explanation_video_url text,
  order_index int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lesson_interactive_steps ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS lesson_interactive_steps_lesson_idx ON public.lesson_interactive_steps (lesson_id, order_index);

DROP POLICY IF EXISTS "lesson_interactive_steps_select" ON public.lesson_interactive_steps;
CREATE POLICY "lesson_interactive_steps_select" ON public.lesson_interactive_steps FOR SELECT
TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.lessons l
    JOIN public.courses c ON c.id = l.course_id
    WHERE l.id = lesson_interactive_steps.lesson_id
    AND (
      c.created_by = auth.uid()
      OR public.is_owner()
      OR c.id IN (SELECT course_id FROM public.enrollments WHERE student_id = auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "lesson_interactive_steps_insert" ON public.lesson_interactive_steps;
CREATE POLICY "lesson_interactive_steps_insert" ON public.lesson_interactive_steps FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.lessons l
    JOIN public.courses c ON c.id = l.course_id
    WHERE l.id = lesson_interactive_steps.lesson_id AND c.created_by = auth.uid()
  )
);

DROP POLICY IF EXISTS "lesson_interactive_steps_update" ON public.lesson_interactive_steps;
CREATE POLICY "lesson_interactive_steps_update" ON public.lesson_interactive_steps FOR UPDATE
TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.lessons l
    JOIN public.courses c ON c.id = l.course_id
    WHERE l.id = lesson_interactive_steps.lesson_id AND c.created_by = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.lessons l
    JOIN public.courses c ON c.id = l.course_id
    WHERE l.id = lesson_interactive_steps.lesson_id AND c.created_by = auth.uid()
  )
);

DROP POLICY IF EXISTS "lesson_interactive_steps_delete" ON public.lesson_interactive_steps;
CREATE POLICY "lesson_interactive_steps_delete" ON public.lesson_interactive_steps FOR DELETE
TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.lessons l
    JOIN public.courses c ON c.id = l.course_id
    WHERE l.id = lesson_interactive_steps.lesson_id AND c.created_by = auth.uid()
  )
);