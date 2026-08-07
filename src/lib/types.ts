export type Role = "owner" | "coach" | "student";
export type LessonType = "normal" | "puzzles" | "interactive";

export interface Profile {
  id: string;
  email: string;
  name: string;
  role: Role;
  created_at: string;
}

export interface StudentDetails {
  student_id: string;
  phone?: string;
  date_of_birth?: string;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relation?: string;
  parent_name?: string;
  parent_phone?: string;
  parent_email?: string;
  membership_status: "active" | "inactive" | "suspended" | "graduated";
  membership_start_date?: string;
  membership_end_date?: string;
  photo_url?: string;
  bio?: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  created_by: string;
  created_at: string;
}

export interface Lesson {
  id: string;
  course_id: string;
  title: string;
  content: string;
  video_url: string;
  pgn: string;
  fen: string;
  order_index: number;
  lesson_type: LessonType;
  intro_video_url: string;
  created_at: string;
}

export interface Enrollment {
  id: string;
  student_id: string;
  course_id: string;
  assigned_by: string;
  created_at: string;
}

export interface CoachStudent {
  id: string;
  coach_id: string;
  student_id: string;
  created_at: string;
}

export interface Chat {
  id: string;
  coach_id: string;
  student_id: string;
  created_at: string;
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  file_url: string;
  file_type: "pdf" | "image" | "none";
  file_name: string;
  created_at: string;
}

export interface LessonProgress {
  id: string;
  student_id: string;
  lesson_id: string;
  completed: boolean;
  completed_at: string;
}

export interface LessonMove {
  id: string;
  lesson_id: string;
  parent_id: string | null;
  san: string;
  fen: string;
  ply: number;
  note: string;
  order_index: number;
  created_at: string;
}

export interface LessonFile {
  id: string;
  lesson_id: string;
  file_url: string;
  file_type: "pdf" | "image";
  file_name: string;
  created_at: string;
}

export interface LessonPuzzle {
  id: string;
  lesson_id: string;
  fen: string;
  correct_san: string;
  order_index: number;
  created_at: string;
}

export interface LessonInteractiveStep {
  id: string;
  lesson_id: string;
  fen: string;
  correct_san: string;
  prompt: string;
  pause_at_seconds: number;
  video_start_seconds: number;
  video_end_seconds: number;
  congrats_video_url: string;
  congrats_start_seconds: number;
  congrats_end_seconds: number;
  explanation_video_url: string;
  explanation_start_seconds: number;
  explanation_end_seconds: number;
  order_index: number;
  created_at: string;
}

export interface ClassSession {
  id: string;
  course_id: string;
  coach_id: string;
  title: string;
  scheduled_date: string;
  start_time: string;
  duration_minutes: number;
  meeting_url: string;
  status: "scheduled" | "completed" | "cancelled";
  notes: string;
  created_at: string;
}

export interface AttendanceRecord {
  id: string;
  class_id: string;
  student_id: string;
  status: "present" | "absent" | "late" | "excused";
  remarks: string;
  marked_by: string;
  created_at: string;
}

export interface Tournament {
  id: string;
  title: string;
  description: string;
  tournament_date: string;
  end_date: string;
  location: string;
  status: "upcoming" | "registration" | "ongoing" | "completed" | "cancelled";
  max_participants: number;
  format: "swiss" | "round-robin" | "knockout";
  rounds: number;
  created_by: string;
  created_at: string;
  join_link: string;
  platform: string;
  start_datetime: string | null;
  end_datetime: string | null;
  timezone: string;
  tournament_type: string;
  notes: string;
  registration_deadline: string | null;
}

export type ArticleCategory =
  | "Openings" | "Endgames" | "Tactics" | "Strategy"
  | "Tournament Tips" | "Academy News"
  | "Beginner" | "Intermediate" | "Advanced";

export interface Article {
  id: string;
  title: string;
  summary: string;
  blog_url: string;
  cover_image_url: string;
  category: string;
  is_featured: boolean;
  status: "draft" | "published";
  published_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ArticleBookmark {
  id: string;
  article_id: string;
  student_id: string;
  created_at: string;
}

export interface ArticleLike {
  id: string;
  article_id: string;
  student_id: string;
  created_at: string;
}

export interface ArticleProgress {
  id: string;
  article_id: string;
  student_id: string;
  read_at: string;
}

export interface TournamentParticipant {
  id: string;
  tournament_id: string;
  student_id: string;
  registered_at: string;
  final_standing: number;
  rating_change: number;
}

export interface TournamentPairing {
  id: string;
  tournament_id: string;
  round: number;
  board: number;
  white_id: string;
  black_id: string;
  result: string;
  created_at: string;
}

export interface Payment {
  id: string;
  student_id: string;
  amount: number;
  type: "tuition" | "tournament_fee" | "material" | "other";
  status: "paid" | "pending" | "overdue" | "refunded";
  due_date: string;
  paid_date: string;
  invoice_number: string;
  description: string;
  method: string;
  created_by: string;
  created_at: string;
}

export interface Assignment {
  id: string;
  course_id: string;
  coach_id: string;
  title: string;
  instructions: string;
  deadline: string;
  attachment_url: string;
  attachment_name: string;
  max_marks: number;
  created_at: string;
}

export interface AssignmentSubmission {
  id: string;
  assignment_id: string;
  student_id: string;
  submission_url: string;
  submission_text: string;
  submitted_at: string;
  marks: number;
  feedback: string;
  reviewed_by: string;
  reviewed_at: string;
}

export interface ActivityLogEntry {
  id: string;
  type: string;
  message: string;
  actor_id: string;
  related_id: string;
  created_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  attachment_url: string;
  attachment_name: string;
  target_type: "all" | "course" | "coach" | "student";
  target_id: string;
  is_pinned: boolean;
  publish_date: string;
  expiry_date: string;
  created_by: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  category: "payment" | "attendance" | "class" | "system" | "tournament" | "assignment";
  title: string;
  message: string;
  link: string;
  is_read: boolean;
  created_at: string;
}

export interface Resource {
  id: string;
  title: string;
  description: string;
  file_url: string;
  file_type: "video" | "book" | "pgn" | "worksheet" | "tournament_file" | "assignment" | "other";
  category: string;
  folder: string;
  uploaded_by: string;
  download_count: number;
  created_at: string;
}

export interface Certificate {
  id: string;
  student_id: string;
  type: "course_completion" | "tournament_winner" | "tournament_participation" | "attendance";
  title: string;
  course_id: string;
  tournament_id: string;
  issue_date: string;
  verification_code: string;
  created_at: string;
}

export interface AuditLogEntry {
  id: string;
  actor_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface StudentRating {
  id: string;
  student_id: string;
  rating: number;
  tournament_id: string;
  reason: string;
  created_at: string;
}

export interface StudentAchievement {
  id: string;
  student_id: string;
  type: "first_tournament" | "perfect_attendance" | "puzzle_master" | "rapid_champion" | "course_completed";
  title: string;
  earned_at: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  event_date: string;
  end_date: string;
  event_type: "class" | "tournament" | "holiday" | "exam" | "workshop";
  related_id: string;
  created_at: string;
}

export interface GameAnalysis {
  id: string;
  student_id: string;
  pgn: string;
  opponent: string;
  result: "1-0" | "0-1" | "1/2-1/2";
  opening: string;
  move_count: number;
  coach_notes: string;
  is_favorite: boolean;
  created_at: string;
}
