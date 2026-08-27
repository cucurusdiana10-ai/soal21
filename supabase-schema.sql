-- ============================================================
-- SKEMA LENGKAP DATABASE SUPABASE SMAN 21 GARUT
-- Jalankan di Supabase SQL Editor jika membuat database baru atau memperbarui tabel yang sudah ada.
-- ============================================================

-- Ekstensi UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabel Pengguna (Users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role TEXT NOT NULL CHECK (role IN ('admin', 'guru', 'siswa')),
  username TEXT UNIQUE NOT NULL, -- NISN untuk Siswa, NIP/Username untuk Guru & Admin
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabel Kelas (Classes)
CREATE TABLE IF NOT EXISTS public.classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabel Mata Pelajaran (Subjects)
CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  guru_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabel Anggota Kelas (Class Students)
CREATE TABLE IF NOT EXISTS public.class_students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  UNIQUE(class_id, student_id)
);

-- 5. Tabel Bahan Ajar Interaktif (Teaching Materials)
CREATE TABLE IF NOT EXISTS public.teaching_materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guru_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  subject_name TEXT,
  grade TEXT,
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  content_json JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Tabel Paket Soal & Tugas (Tasks)
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guru_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  material_id UUID REFERENCES public.teaching_materials(id) ON DELETE SET NULL,
  subject_name TEXT,
  title TEXT NOT NULL,
  type TEXT DEFAULT 'pg' CHECK (type IN ('pg', 'essay', 'mixed')),
  content JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Tabel Pengerjaan & Penilaian Siswa (Task Submissions)
CREATE TABLE IF NOT EXISTS public.task_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  answers JSONB DEFAULT '{}'::jsonb,
  score NUMERIC DEFAULT 0,
  feedback TEXT,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(task_id, student_id)
);

-- ============================================================
-- QUERY ALTER TABLE (Untuk database lama yang perlu penyesuaian kolom)
-- ============================================================
ALTER TABLE public.teaching_materials ADD COLUMN IF NOT EXISTS guru_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.teaching_materials ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE;
ALTER TABLE public.teaching_materials ADD COLUMN IF NOT EXISTS subject_name TEXT;
ALTER TABLE public.teaching_materials ADD COLUMN IF NOT EXISTS grade TEXT;
ALTER TABLE public.teaching_materials ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.teaching_materials ADD COLUMN IF NOT EXISTS topic TEXT;
ALTER TABLE public.teaching_materials ADD COLUMN IF NOT EXISTS content_json JSONB;

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS guru_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS subject_name TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'pg';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS content JSONB;

ALTER TABLE public.task_submissions ADD COLUMN IF NOT EXISTS answers JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.task_submissions ADD COLUMN IF NOT EXISTS feedback TEXT;
ALTER TABLE public.task_submissions ADD COLUMN IF NOT EXISTS score NUMERIC DEFAULT 0;

-- Akun default admin
INSERT INTO public.users (role, username, password, name) 
VALUES ('admin', 'admin', 'admin123', 'Administrator Utama')
ON CONFLICT (username) DO NOTHING;
