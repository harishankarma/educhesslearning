# EduChess Courses

A spaced-repetition chess training platform with integrated coach–student messaging, built for chess academies. Inspired by Chessable, with role-based access control for academy owners, coaches, and students.

## Features

- **Role-based access**: Owner, Coach, and Student roles with strict permissions
- **Course management**: Coaches create courses with ordered lessons (text, video, PGN/FEN)
- **Student learning**: Students view enrolled courses, watch videos, track progress
- **Realtime messaging**: 1-to-1 coach–student chat with file attachments (PDF, images)
- **No public signup**: Only the academy owner creates accounts

## Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS + Vite
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Realtime, Edge Functions)
- **Icons**: lucide-react

## Getting Started

### 1. Prerequisites

- Node.js 18+
- A Supabase project (already provisioned in this environment)

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Variables

The `.env` file is pre-configured with:
- `VITE_SUPABASE_URL` — your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — your Supabase anon/public key

### 4. Run the Development Server

```bash
npm run dev
```

The app runs at `http://localhost:5173`.

### 5. Build for Production

```bash
npm run build
```

## Database Setup

The database schema, RLS policies, and storage bucket are applied automatically via the Supabase migration system. The following tables are created:

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles with role (owner/coach/student) |
| `courses` | Chess courses created by coaches/owner |
| `lessons` | Ordered lessons within courses |
| `enrollments` | Student-course enrollment mapping |
| `coach_students` | Coach-student assignment mapping |
| `chats` | 1-to-1 chat rooms between coach and student |
| `messages` | Chat messages with optional file attachments |
| `lesson_progress` | Student lesson completion tracking |

### Row Level Security (RLS)

All tables have RLS enabled with role-based policies:
- **Students**: Can only see their own profile, enrolled courses, their chat messages, and their lesson progress
- **Coaches**: Can manage their own courses/lessons, see assigned students, and access their chat messages
- **Owner**: Full access to everything; can create coach and student accounts

### Storage

A public-read bucket `chat-files` is created for chat attachments. Only authenticated users can upload. Allowed file types: PDF, JPG, PNG (10 MB max, enforced client-side).

## Creating the Initial Owner Account

An initial owner account has been pre-created:

- **Email**: `owner@educhess.in`
- **Password**: `owner12345`

Log in with these credentials to start creating coach and student accounts.

To create additional owner accounts manually, insert a row into `auth.users` with `raw_user_meta_data` containing `{"name": "...", "role": "owner"}`. The database trigger automatically creates the matching `profiles` row.

## How It Works

### Owner Flow
1. Log in as the owner
2. Go to **Manage** tab to create coach and student accounts
3. When creating a student, assign them to a coach (this auto-creates a chat room)
4. Go to **Courses** tab to enroll students into courses

### Coach Flow
1. Log in as a coach
2. Go to **Courses** tab to create courses and lessons
3. Add lessons with title, text content, video URL, and optional PGN/FEN
4. Reorder lessons with the up/down arrows
5. Go to **Messages** tab to chat with assigned students

### Student Flow
1. Log in with credentials provided by the academy
2. Go to **Courses** tab to view enrolled courses
3. Open a course, then a lesson to read content and watch videos
4. Mark lessons as completed to track progress
5. Go to **Messages** tab to chat with your assigned coach

## Edge Function

The `admin-create-user` edge function handles account creation. It:
1. Verifies the caller is authenticated and has the `owner` role
2. Uses the service role key to create a new auth user
3. Creates the matching profile row
4. For students: links them to a coach and creates a chat room

## Project Structure

```
src/
├── components/          # Shared UI components
│   ├── ChatWindow.tsx   # Realtime chat with file uploads
│   ├── Layout.tsx       # App shell with sidebar nav
│   ├── Login.tsx        # Sign-in screen
│   └── VideoPlayer.tsx  # YouTube/direct video embedding
├── lib/                 # Utilities and configuration
│   ├── auth.tsx         # Auth context provider
│   ├── supabase.ts      # Supabase client singleton
│   ├── types.ts         # TypeScript types
│   └── utils.ts         # Helper functions
├── pages/               # Role-based dashboards
│   ├── OwnerDashboard.tsx
│   ├── CoachDashboard.tsx
│   └── StudentDashboard.tsx
├── App.tsx              # Role-based router
├── main.tsx             # Entry point
└── index.css            # Global styles

supabase/
└── functions/
    └── admin-create-user/  # Edge function for account creation
```
