-- Lesson study positions: each lesson can have a starting FEN (already in lessons.fen)
-- This table stores the move tree (variations) with notes, like a Lichess study.
-- A move belongs to a lesson, has a parent move (for variations), a move in SAN,
-- the resulting FEN, and optional notes.

CREATE TABLE IF NOT EXISTS public.lesson_moves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.lesson_moves(id) ON DELETE CASCADE,
  san text NOT NULL,
  fen text NOT NULL,
  ply integer NOT NULL DEFAULT 0,
  note text NOT NULL DEFAULT '',
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lesson_moves ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS lesson_moves_lesson_idx ON public.lesson_moves (lesson_id);
CREATE INDEX IF NOT EXISTS lesson_moves_parent_idx ON public.lesson_moves (parent_id);

-- RLS: same visibility as lessons — coach who owns the course, owner, or enrolled student
DROP POLICY IF EXISTS "lesson_moves_select" ON public.lesson_moves;
CREATE POLICY "lesson_moves_select" ON public.lesson_moves FOR SELECT
TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.lessons l
    JOIN public.courses c ON c.id = l.course_id
    WHERE l.id = lesson_moves.lesson_id
    AND (
      c.created_by = auth.uid()
      OR public.is_owner()
      OR c.id IN (SELECT course_id FROM public.enrollments WHERE student_id = auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "lesson_moves_insert" ON public.lesson_moves;
CREATE POLICY "lesson_moves_insert" ON public.lesson_moves FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.lessons l
    JOIN public.courses c ON c.id = l.course_id
    WHERE l.id = lesson_moves.lesson_id AND c.created_by = auth.uid()
  )
);

DROP POLICY IF EXISTS "lesson_moves_update" ON public.lesson_moves;
CREATE POLICY "lesson_moves_update" ON public.lesson_moves FOR UPDATE
TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.lessons l
    JOIN public.courses c ON c.id = l.course_id
    WHERE l.id = lesson_moves.lesson_id AND c.created_by = auth.uid()
  )
);

DROP POLICY IF EXISTS "lesson_moves_delete" ON public.lesson_moves;
CREATE POLICY "lesson_moves_delete" ON public.lesson_moves FOR DELETE
TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.lessons l
    JOIN public.courses c ON c.id = l.course_id
    WHERE l.id = lesson_moves.lesson_id AND c.created_by = auth.uid()
  )
);
