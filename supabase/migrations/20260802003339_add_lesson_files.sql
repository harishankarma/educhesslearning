-- Lesson files: images and PDFs attached to lessons by coaches
CREATE TABLE IF NOT EXISTS public.lesson_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_type text NOT NULL CHECK (file_type IN ('pdf', 'image')),
  file_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lesson_files ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS lesson_files_lesson_idx ON public.lesson_files (lesson_id);

-- RLS: same visibility as lessons
DROP POLICY IF EXISTS "lesson_files_select" ON public.lesson_files;
CREATE POLICY "lesson_files_select" ON public.lesson_files FOR SELECT
TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.lessons l
    JOIN public.courses c ON c.id = l.course_id
    WHERE l.id = lesson_files.lesson_id
    AND (
      c.created_by = auth.uid()
      OR public.is_owner()
      OR c.id IN (SELECT course_id FROM public.enrollments WHERE student_id = auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "lesson_files_insert" ON public.lesson_files;
CREATE POLICY "lesson_files_insert" ON public.lesson_files FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.lessons l
    JOIN public.courses c ON c.id = l.course_id
    WHERE l.id = lesson_files.lesson_id AND c.created_by = auth.uid()
  )
);

DROP POLICY IF EXISTS "lesson_files_delete" ON public.lesson_files;
CREATE POLICY "lesson_files_delete" ON public.lesson_files FOR DELETE
TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.lessons l
    JOIN public.courses c ON c.id = l.course_id
    WHERE l.id = lesson_files.lesson_id AND c.created_by = auth.uid()
  )
);

-- Storage bucket for lesson files (public read so students can view, auth upload)
INSERT INTO storage.buckets (id, name, public)
VALUES ('lesson-files', 'lesson-files', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "lesson_files_read" ON storage.objects;
CREATE POLICY "lesson_files_read" ON storage.objects FOR SELECT
TO public USING (bucket_id = 'lesson-files');

DROP POLICY IF EXISTS "lesson_files_upload" ON storage.objects;
CREATE POLICY "lesson_files_upload" ON storage.objects FOR INSERT
TO authenticated WITH CHECK (bucket_id = 'lesson-files');

DROP POLICY IF EXISTS "lesson_files_delete" ON storage.objects;
CREATE POLICY "lesson_files_delete" ON storage.objects FOR DELETE
TO authenticated USING (bucket_id = 'lesson-files');
