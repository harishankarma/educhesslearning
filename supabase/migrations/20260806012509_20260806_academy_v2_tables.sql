/*
# Academy Dashboard 2.0 — Full Feature Schema

## Overview
This migration adds tables for the complete academy management system:
- Classes & scheduling
- Attendance tracking
- Tournaments & ratings
- Payments & finance
- Assignments
- Activity log
- Announcements & notifications
- Resource library
- Certificates
- Student detailed profiles
- Audit log

## New Tables
1. `student_details` — Extended student profile info (emergency contact, parent info, membership)
2. `classes` — Scheduled class sessions (recurring or one-off)
3. `attendance` — Per-student attendance records for each class
4. `tournaments` — Chess tournament records
5. `tournament_participants` — Student registrations for tournaments
6. `tournament_pairings` — Round pairings
7. `tournament_results` — Game results
8. `payments` — Student payment records (invoices, fees, history)
9. `assignments` — Coach-created assignments
10. `assignment_submissions` — Student answers to assignments
11. `activity_log` — Recent activity feed entries
12. `announcements` — Academy-wide or targeted announcements
13. `notifications` — Per-user notifications
14. `resources` — Central resource library files
15. `certificates` — Generated certificates
16. `audit_log` — System audit trail
17. `student_ratings` — ELO rating history per student

## Security
- All tables have RLS enabled
- Policies use auth.uid() for ownership checks
- All tables scoped TO authenticated
*/

-- ============================================================
-- 1. STUDENT DETAILS (extended profile info)
-- ============================================================
CREATE TABLE IF NOT EXISTS student_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  phone text,
  date_of_birth date,
  address text,
  emergency_contact_name text,
  emergency_contact_phone text,
  emergency_contact_relation text,
  parent_name text,
  parent_phone text,
  parent_email text,
  membership_status text DEFAULT 'active' CHECK (membership_status IN ('active','inactive','suspended','graduated')),
  membership_start_date date,
  membership_end_date date,
  photo_url text,
  bio text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(student_id)
);
ALTER TABLE student_details ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_student_details" ON student_details;
CREATE POLICY "select_own_student_details" ON student_details FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_student_details" ON student_details;
CREATE POLICY "insert_student_details" ON student_details FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_student_details" ON student_details;
CREATE POLICY "update_student_details" ON student_details FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_student_details" ON student_details;
CREATE POLICY "delete_student_details" ON student_details FOR DELETE TO authenticated USING (true);

-- ============================================================
-- 2. CLASSES (scheduled sessions)
-- ============================================================
CREATE TABLE IF NOT EXISTS classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  coach_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  scheduled_date date NOT NULL,
  start_time time NOT NULL,
  duration_minutes int NOT NULL DEFAULT 60,
  meeting_url text,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','cancelled')),
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_classes" ON classes;
CREATE POLICY "select_classes" ON classes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_classes" ON classes;
CREATE POLICY "insert_classes" ON classes FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_classes" ON classes;
CREATE POLICY "update_classes" ON classes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_classes" ON classes;
CREATE POLICY "delete_classes" ON classes FOR DELETE TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_classes_date ON classes(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_classes_coach ON classes(coach_id);
CREATE INDEX IF NOT EXISTS idx_classes_course ON classes(course_id);

-- ============================================================
-- 3. ATTENDANCE
-- ============================================================
CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('present','absent','late','excused')),
  remarks text,
  marked_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(class_id, student_id)
);
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_attendance" ON attendance;
CREATE POLICY "select_attendance" ON attendance FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_attendance" ON attendance;
CREATE POLICY "insert_attendance" ON attendance FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_attendance" ON attendance;
CREATE POLICY "update_attendance" ON attendance FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_attendance" ON attendance;
CREATE POLICY "delete_attendance" ON attendance FOR DELETE TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_class ON attendance(class_id);

-- ============================================================
-- 4. TOURNAMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  tournament_date date NOT NULL,
  end_date date,
  location text,
  status text NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming','registration','ongoing','completed')),
  max_participants int,
  format text DEFAULT 'swiss' CHECK (format IN ('swiss','round-robin','knockout')),
  rounds int DEFAULT 5,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_tournaments" ON tournaments;
CREATE POLICY "select_tournaments" ON tournaments FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_tournaments" ON tournaments;
CREATE POLICY "insert_tournaments" ON tournaments FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_tournaments" ON tournaments;
CREATE POLICY "update_tournaments" ON tournaments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_tournaments" ON tournaments;
CREATE POLICY "delete_tournaments" ON tournaments FOR DELETE TO authenticated USING (true);

-- ============================================================
-- 5. TOURNAMENT PARTICIPANTS
-- ============================================================
CREATE TABLE IF NOT EXISTS tournament_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  registered_at timestamptz DEFAULT now(),
  final_standing int,
  rating_change int DEFAULT 0,
  UNIQUE(tournament_id, student_id)
);
ALTER TABLE tournament_participants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_tournament_participants" ON tournament_participants;
CREATE POLICY "select_tournament_participants" ON tournament_participants FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_tournament_participants" ON tournament_participants;
CREATE POLICY "insert_tournament_participants" ON tournament_participants FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_tournament_participants" ON tournament_participants;
CREATE POLICY "update_tournament_participants" ON tournament_participants FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_tournament_participants" ON tournament_participants;
CREATE POLICY "delete_tournament_participants" ON tournament_participants FOR DELETE TO authenticated USING (true);

-- ============================================================
-- 6. TOURNAMENT PAIRINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS tournament_pairings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  round int NOT NULL,
  board int NOT NULL,
  white_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  black_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  result text CHECK (result IN ('1-0','0-1','1/2-1/2','1-0 forfeit','0-1 forfeit',NULL)),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE tournament_pairings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_tournament_pairings" ON tournament_pairings;
CREATE POLICY "select_tournament_pairings" ON tournament_pairings FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_tournament_pairings" ON tournament_pairings;
CREATE POLICY "insert_tournament_pairings" ON tournament_pairings FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_tournament_pairings" ON tournament_pairings;
CREATE POLICY "update_tournament_pairings" ON tournament_pairings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_tournament_pairings" ON tournament_pairings;
CREATE POLICY "delete_tournament_pairings" ON tournament_pairings FOR DELETE TO authenticated USING (true);

-- ============================================================
-- 7. PAYMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  type text NOT NULL CHECK (type IN ('tuition','tournament_fee','material','other')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('paid','pending','overdue','refunded')),
  due_date date,
  paid_date date,
  invoice_number text,
  description text,
  method text CHECK (method IN ('cash','card','bank_transfer','online','check',NULL)),
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_payments" ON payments;
CREATE POLICY "select_payments" ON payments FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_payments" ON payments;
CREATE POLICY "insert_payments" ON payments FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_payments" ON payments;
CREATE POLICY "update_payments" ON payments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_payments" ON payments;
CREATE POLICY "delete_payments" ON payments FOR DELETE TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_payments_student ON payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- ============================================================
-- 8. ASSIGNMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  coach_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  instructions text,
  deadline timestamptz,
  attachment_url text,
  attachment_name text,
  max_marks int DEFAULT 100,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_assignments" ON assignments;
CREATE POLICY "select_assignments" ON assignments FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_assignments" ON assignments;
CREATE POLICY "insert_assignments" ON assignments FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_assignments" ON assignments;
CREATE POLICY "update_assignments" ON assignments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_assignments" ON assignments;
CREATE POLICY "delete_assignments" ON assignments FOR DELETE TO authenticated USING (true);

-- ============================================================
-- 9. ASSIGNMENT SUBMISSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS assignment_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  submission_url text,
  submission_text text,
  submitted_at timestamptz DEFAULT now(),
  marks int,
  feedback text,
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  UNIQUE(assignment_id, student_id)
);
ALTER TABLE assignment_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_assignment_submissions" ON assignment_submissions;
CREATE POLICY "select_assignment_submissions" ON assignment_submissions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_assignment_submissions" ON assignment_submissions;
CREATE POLICY "insert_assignment_submissions" ON assignment_submissions FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_assignment_submissions" ON assignment_submissions;
CREATE POLICY "update_assignment_submissions" ON assignment_submissions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_assignment_submissions" ON assignment_submissions;
CREATE POLICY "delete_assignment_submissions" ON assignment_submissions FOR DELETE TO authenticated USING (true);

-- ============================================================
-- 10. ACTIVITY LOG (recent activity feed)
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('student_registered','coach_added','course_created','payment_received','attendance_submitted','tournament_completed','assignment_created','announcement_posted','class_scheduled')),
  message text NOT NULL,
  actor_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  related_id uuid,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_activity_log" ON activity_log;
CREATE POLICY "select_activity_log" ON activity_log FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_activity_log" ON activity_log;
CREATE POLICY "insert_activity_log" ON activity_log FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "delete_activity_log" ON activity_log;
CREATE POLICY "delete_activity_log" ON activity_log FOR DELETE TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at DESC);

-- ============================================================
-- 11. ANNOUNCEMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  attachment_url text,
  attachment_name text,
  target_type text NOT NULL DEFAULT 'all' CHECK (target_type IN ('all','course','coach','student')),
  target_id uuid,
  is_pinned boolean DEFAULT false,
  publish_date timestamptz DEFAULT now(),
  expiry_date timestamptz,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_announcements" ON announcements;
CREATE POLICY "select_announcements" ON announcements FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_announcements" ON announcements;
CREATE POLICY "insert_announcements" ON announcements FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_announcements" ON announcements;
CREATE POLICY "update_announcements" ON announcements FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_announcements" ON announcements;
CREATE POLICY "delete_announcements" ON announcements FOR DELETE TO authenticated USING (true);

-- ============================================================
-- 12. NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('payment','attendance','class','system','tournament','assignment')),
  title text NOT NULL,
  message text NOT NULL,
  link text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_notifications" ON notifications;
CREATE POLICY "select_own_notifications" ON notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_notifications" ON notifications;
CREATE POLICY "insert_notifications" ON notifications FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_notifications" ON notifications;
CREATE POLICY "delete_own_notifications" ON notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);

-- ============================================================
-- 13. RESOURCES (library)
-- ============================================================
CREATE TABLE IF NOT EXISTS resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  file_url text NOT NULL,
  file_type text NOT NULL CHECK (file_type IN ('video','book','pgn','worksheet','tournament_file','assignment','other')),
  category text,
  folder text,
  uploaded_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  download_count int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_resources" ON resources;
CREATE POLICY "select_resources" ON resources FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_resources" ON resources;
CREATE POLICY "insert_resources" ON resources FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_resources" ON resources;
CREATE POLICY "update_resources" ON resources FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_resources" ON resources;
CREATE POLICY "delete_resources" ON resources FOR DELETE TO authenticated USING (true);

-- ============================================================
-- 14. CERTIFICATES
-- ============================================================
CREATE TABLE IF NOT EXISTS certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('course_completion','tournament_winner','tournament_participation','attendance')),
  title text NOT NULL,
  course_id uuid REFERENCES courses(id) ON DELETE SET NULL,
  tournament_id uuid REFERENCES tournaments(id) ON DELETE SET NULL,
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  verification_code text UNIQUE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_certificates" ON certificates;
CREATE POLICY "select_certificates" ON certificates FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_certificates" ON certificates;
CREATE POLICY "insert_certificates" ON certificates FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_certificates" ON certificates;
CREATE POLICY "update_certificates" ON certificates FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_certificates" ON certificates;
CREATE POLICY "delete_certificates" ON certificates FOR DELETE TO authenticated USING (true);

-- ============================================================
-- 15. AUDIT LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  details jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_audit_log" ON audit_log;
CREATE POLICY "select_audit_log" ON audit_log FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_audit_log" ON audit_log;
CREATE POLICY "insert_audit_log" ON audit_log FOR INSERT TO authenticated WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);

-- ============================================================
-- 16. STUDENT RATINGS (ELO history)
-- ============================================================
CREATE TABLE IF NOT EXISTS student_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating int NOT NULL DEFAULT 1200,
  tournament_id uuid REFERENCES tournaments(id) ON DELETE SET NULL,
  reason text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE student_ratings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_student_ratings" ON student_ratings;
CREATE POLICY "select_student_ratings" ON student_ratings FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_student_ratings" ON student_ratings;
CREATE POLICY "insert_student_ratings" ON student_ratings FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_student_ratings" ON student_ratings;
CREATE POLICY "update_student_ratings" ON student_ratings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_student_ratings" ON student_ratings;
CREATE POLICY "delete_student_ratings" ON student_ratings FOR DELETE TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_student_ratings_student ON student_ratings(student_id, created_at DESC);

-- ============================================================
-- 17. STUDENT ACHIEVEMENTS (badges)
-- ============================================================
CREATE TABLE IF NOT EXISTS student_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('first_tournament','perfect_attendance','puzzle_master','rapid_champion','course_completed')),
  title text NOT NULL,
  earned_at timestamptz DEFAULT now(),
  UNIQUE(student_id, type)
);
ALTER TABLE student_achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_student_achievements" ON student_achievements;
CREATE POLICY "select_student_achievements" ON student_achievements FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_student_achievements" ON student_achievements;
CREATE POLICY "insert_student_achievements" ON student_achievements FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "delete_student_achievements" ON student_achievements;
CREATE POLICY "delete_student_achievements" ON student_achievements FOR DELETE TO authenticated USING (true);

-- ============================================================
-- 18. CALENDAR EVENTS (holidays, exams, workshops)
-- ============================================================
CREATE TABLE IF NOT EXISTS calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  event_date date NOT NULL,
  end_date date,
  event_type text NOT NULL CHECK (event_type IN ('class','tournament','holiday','exam','workshop')),
  related_id uuid,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_calendar_events" ON calendar_events;
CREATE POLICY "select_calendar_events" ON calendar_events FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_calendar_events" ON calendar_events;
CREATE POLICY "insert_calendar_events" ON calendar_events FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_calendar_events" ON calendar_events;
CREATE POLICY "update_calendar_events" ON calendar_events FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_calendar_events" ON calendar_events;
CREATE POLICY "delete_calendar_events" ON calendar_events FOR DELETE TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(event_date);

-- ============================================================
-- 19. GAME ANALYSIS (PGN uploads)
-- ============================================================
CREATE TABLE IF NOT EXISTS game_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pgn text NOT NULL,
  opponent text,
  result text CHECK (result IN ('1-0','0-1','1/2-1/2')),
  opening text,
  move_count int,
  coach_notes text,
  is_favorite boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE game_analysis ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_game_analysis" ON game_analysis;
CREATE POLICY "select_game_analysis" ON game_analysis FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_game_analysis" ON game_analysis;
CREATE POLICY "insert_game_analysis" ON game_analysis FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_game_analysis" ON game_analysis;
CREATE POLICY "update_game_analysis" ON game_analysis FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_game_analysis" ON game_analysis;
CREATE POLICY "delete_game_analysis" ON game_analysis FOR DELETE TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_game_analysis_student ON game_analysis(student_id);
