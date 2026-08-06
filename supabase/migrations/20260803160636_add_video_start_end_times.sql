/*
# Add Start/End Times for Interactive Lesson Videos

## Overview
The interactive lesson system needs start and end times for:
1. The main lesson video segment per checkpoint (so the coach can set when
   the video starts and when it pauses for the quiz)
2. The congrats video (play from X to Y seconds)
3. The explanation video (play from X to Y seconds)

This replaces the single `pause_at_seconds` column with a richer set of
start/end columns for all three videos.

## Changes to `lesson_interactive_steps`
- `video_start_seconds int NOT NULL DEFAULT 0` — main video starts here for this checkpoint
- `video_end_seconds int NOT NULL DEFAULT 0` — main video pauses here (0 = play to end)
- `congrats_start_seconds int NOT NULL DEFAULT 0`
- `congrats_end_seconds int NOT NULL DEFAULT 0`
- `explanation_start_seconds int NOT NULL DEFAULT 0`
- `explanation_end_seconds int NOT NULL DEFAULT 0`

The existing `pause_at_seconds` column is kept for backwards compatibility
but `video_end_seconds` takes priority.
*/

DO $$ BEGIN
  ALTER TABLE public.lesson_interactive_steps ADD COLUMN video_start_seconds int NOT NULL DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.lesson_interactive_steps ADD COLUMN video_end_seconds int NOT NULL DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.lesson_interactive_steps ADD COLUMN congrats_start_seconds int NOT NULL DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.lesson_interactive_steps ADD COLUMN congrats_end_seconds int NOT NULL DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.lesson_interactive_steps ADD COLUMN explanation_start_seconds int NOT NULL DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.lesson_interactive_steps ADD COLUMN explanation_end_seconds int NOT NULL DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;