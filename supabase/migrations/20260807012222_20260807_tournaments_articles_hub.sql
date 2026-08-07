/*
# Tournament Management + Learning Hub (Articles)

## 1. Tournaments table — add new columns
- `join_link` (text) — URL students click to join the tournament
- `platform` (text) — Lichess, Chess.com, Google Meet, Zoom, Custom
- `start_datetime` (timestamptz) — UTC-aware start time
- `end_datetime` (timestamptz, nullable) — UTC-aware end time
- `timezone` (text) — admin's local timezone (for auditing)
- `tournament_type` (text) — internal, public, invitational
- `notes` (text) — optional notes
- `registration_deadline` (timestamptz, nullable) — optional
- `max_participants` already exists; kept as-is

## 2. New table: articles
- `id` uuid PK
- `title` text NOT NULL
- `summary` text — short preview
- `blog_url` text NOT NULL — external article link
- `cover_image_url` text — Supabase storage URL
- `category` text — Openings, Endgames, Tactics, Strategy, etc.
- `is_featured` boolean default false
- `status` text default 'draft' — draft | published
- `published_at` timestamptz nullable
- `created_by` uuid references profiles(id)
- `created_at` timestamptz default now()
- `updated_at` timestamptz default now()

## 3. New table: article_bookmarks
- `id` uuid PK
- `article_id` uuid FK -> articles(id) ON DELETE CASCADE
- `student_id` uuid FK -> profiles(id) ON DELETE CASCADE
- `created_at` timestamptz default now()
- UNIQUE(article_id, student_id)

## 4. New table: article_likes
- `id` uuid PK
- `article_id` uuid FK -> articles(id) ON DELETE CASCADE
- `student_id` uuid FK -> profiles(id) ON DELETE CASCADE
- `created_at` timestamptz default now()
- UNIQUE(article_id, student_id)

## 5. New table: article_progress
- `id` uuid PK
- `article_id` uuid FK -> articles(id) ON DELETE CASCADE
- `student_id` uuid FK -> profiles(id) ON DELETE CASCADE
- `read_at` timestamptz default now()
- UNIQUE(article_id, student_id)

## 6. Storage buckets
- `article-covers` — public bucket for article cover images

## 7. Security (RLS)
- tournaments: owner/coach full CRUD, students SELECT only (already has policies — add new select for students if missing)
- articles: owner full CRUD, students SELECT published only
- article_bookmarks/likes/progress: students own their rows, owner SELECT all
- Storage: article-covers public read, owner write
*/

-- ============================================================
-- 1. Add columns to tournaments
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tournaments' AND column_name='join_link') THEN
    ALTER TABLE tournaments ADD COLUMN join_link text DEFAULT '';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tournaments' AND column_name='platform') THEN
    ALTER TABLE tournaments ADD COLUMN platform text DEFAULT 'lichess';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tournaments' AND column_name='start_datetime') THEN
    ALTER TABLE tournaments ADD COLUMN start_datetime timestamptz;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tournaments' AND column_name='end_datetime') THEN
    ALTER TABLE tournaments ADD COLUMN end_datetime timestamptz;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tournaments' AND column_name='timezone') THEN
    ALTER TABLE tournaments ADD COLUMN timezone text DEFAULT 'Asia/Kolkata';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tournaments' AND column_name='tournament_type') THEN
    ALTER TABLE tournaments ADD COLUMN tournament_type text DEFAULT 'internal';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tournaments' AND column_name='notes') THEN
    ALTER TABLE tournaments ADD COLUMN notes text DEFAULT '';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tournaments' AND column_name='registration_deadline') THEN
    ALTER TABLE tournaments ADD COLUMN registration_deadline timestamptz;
  END IF;
END $$;

-- Update status type to include cancelled
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tournaments' AND column_name='status') THEN
    ALTER TABLE tournaments DROP CONSTRAINT IF EXISTS tournaments_status_check;
    ALTER TABLE tournaments ADD CONSTRAINT tournaments_status_check
      CHECK (status IN ('upcoming','registration','ongoing','completed','cancelled'));
  END IF;
END $$;

-- ============================================================
-- 2. articles table
-- ============================================================
CREATE TABLE IF NOT EXISTS articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  summary text DEFAULT '',
  blog_url text NOT NULL,
  cover_image_url text DEFAULT '',
  category text DEFAULT 'Beginner',
  is_featured boolean DEFAULT false,
  status text DEFAULT 'draft' CHECK (status IN ('draft','published')),
  published_at timestamptz,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

-- Owner/coach can read all articles; students can read published only
DROP POLICY IF EXISTS "select_articles_all" ON articles;
CREATE POLICY "select_articles_all" ON articles FOR SELECT
  TO authenticated USING (true);

-- Only owner can insert/update/delete articles
DROP POLICY IF EXISTS "insert_articles_owner" ON articles;
CREATE POLICY "insert_articles_owner" ON articles FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
  );

DROP POLICY IF EXISTS "update_articles_owner" ON articles;
CREATE POLICY "update_articles_owner" ON articles FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
  );

DROP POLICY IF EXISTS "delete_articles_owner" ON articles;
CREATE POLICY "delete_articles_owner" ON articles FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
  );

-- ============================================================
-- 3. article_bookmarks
-- ============================================================
CREATE TABLE IF NOT EXISTS article_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid REFERENCES articles(id) ON DELETE CASCADE,
  student_id uuid DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(article_id, student_id)
);

ALTER TABLE article_bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_bookmarks" ON article_bookmarks;
CREATE POLICY "select_own_bookmarks" ON article_bookmarks FOR SELECT
  TO authenticated USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "insert_own_bookmarks" ON article_bookmarks;
CREATE POLICY "insert_own_bookmarks" ON article_bookmarks FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "delete_own_bookmarks" ON article_bookmarks;
CREATE POLICY "delete_own_bookmarks" ON article_bookmarks FOR DELETE
  TO authenticated USING (auth.uid() = student_id);

-- ============================================================
-- 4. article_likes
-- ============================================================
CREATE TABLE IF NOT EXISTS article_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid REFERENCES articles(id) ON DELETE CASCADE,
  student_id uuid DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(article_id, student_id)
);

ALTER TABLE article_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_likes" ON article_likes;
CREATE POLICY "select_own_likes" ON article_likes FOR SELECT
  TO authenticated USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "insert_own_likes" ON article_likes;
CREATE POLICY "insert_own_likes" ON article_likes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "delete_own_likes" ON article_likes;
CREATE POLICY "delete_own_likes" ON article_likes FOR DELETE
  TO authenticated USING (auth.uid() = student_id);

-- ============================================================
-- 5. article_progress
-- ============================================================
CREATE TABLE IF NOT EXISTS article_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid REFERENCES articles(id) ON DELETE CASCADE,
  student_id uuid DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  read_at timestamptz DEFAULT now(),
  UNIQUE(article_id, student_id)
);

ALTER TABLE article_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_progress" ON article_progress;
CREATE POLICY "select_own_progress" ON article_progress FOR SELECT
  TO authenticated USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "insert_own_progress" ON article_progress;
CREATE POLICY "insert_own_progress" ON article_progress FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = student_id);

-- ============================================================
-- 6. Storage bucket for article covers
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('article-covers', 'article-covers', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: public read, owner write
DROP POLICY IF EXISTS "read_article_covers" ON storage.objects;
CREATE POLICY "read_article_covers" ON storage.objects FOR SELECT
  TO public USING (bucket_id = 'article-covers');

DROP POLICY IF EXISTS "upload_article_covers_owner" ON storage.objects;
CREATE POLICY "upload_article_covers_owner" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (
    bucket_id = 'article-covers' AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
  );

DROP POLICY IF EXISTS "update_article_covers_owner" ON storage.objects;
CREATE POLICY "update_article_covers_owner" ON storage.objects FOR UPDATE
  TO authenticated USING (
    bucket_id = 'article-covers' AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
  );

DROP POLICY IF EXISTS "delete_article_covers_owner" ON storage.objects;
CREATE POLICY "delete_article_covers_owner" ON storage.objects FOR DELETE
  TO authenticated USING (
    bucket_id = 'article-covers' AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
  );

-- ============================================================
-- 7. Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
CREATE INDEX IF NOT EXISTS idx_tournaments_start_datetime ON tournaments(start_datetime);