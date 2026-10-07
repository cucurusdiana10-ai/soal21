import pkg from 'pg';
const { Client } = pkg;

export async function syncSupabaseSchema() {
  const client = new Client({
    user: 'postgres',
    password: process.env.SUPABASE_DB_PASSWORD || '@21GarutJuara',
    host: process.env.SUPABASE_DB_HOST || 'db.vtjtunvkoicwdugnifxi.supabase.co',
    port: Number(process.env.SUPABASE_DB_PORT || 6543),
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    await client.query(`
      -- Pastikan kolom-kolom dasar pada tasks & teaching_materials tersedia
      ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE;
      ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS guru_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
      ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS subject_name TEXT;
      ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'pg';
      ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS content JSONB;
      ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS kkm NUMERIC DEFAULT 75;

      -- Tabel Arsip Lembar Kerja Peserta Didik (LKPD)
      CREATE TABLE IF NOT EXISTS public.lkpd_records (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        guru_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
        modul_id UUID REFERENCES public.modul_ajar(id) ON DELETE SET NULL,
        title TEXT NOT NULL,
        subject_name TEXT,
        grade TEXT,
        pertemuan_info TEXT,
        content_json JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      ALTER TABLE public.teaching_materials ADD COLUMN IF NOT EXISTS guru_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
      ALTER TABLE public.teaching_materials ADD COLUMN IF NOT EXISTS subject_name TEXT;
      ALTER TABLE public.teaching_materials ADD COLUMN IF NOT EXISTS grade TEXT;
      ALTER TABLE public.teaching_materials ADD COLUMN IF NOT EXISTS title TEXT;

      -- Kolom Monitoring Ujian, Auto-Save Jawaban, dan Reset Login pada task_submissions
      ALTER TABLE public.task_submissions ADD COLUMN IF NOT EXISTS answers JSONB DEFAULT '{}'::jsonb;
      ALTER TABLE public.task_submissions ADD COLUMN IF NOT EXISTS feedback TEXT;
      ALTER TABLE public.task_submissions ADD COLUMN IF NOT EXISTS score NUMERIC DEFAULT NULL;
      ALTER TABLE public.task_submissions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'in_progress';
      ALTER TABLE public.task_submissions ADD COLUMN IF NOT EXISTS session_token TEXT;
      ALTER TABLE public.task_submissions ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;
      ALTER TABLE public.task_submissions ADD COLUMN IF NOT EXISTS login_reset_count INT DEFAULT 0;
      ALTER TABLE public.task_submissions ADD COLUMN IF NOT EXISTS login_reset_at TIMESTAMP WITH TIME ZONE;
      ALTER TABLE public.task_submissions ADD COLUMN IF NOT EXISTS violation_count INT DEFAULT 0;
      ALTER TABLE public.task_submissions ADD COLUMN IF NOT EXISTS violation_logs JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE public.task_submissions ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
      ALTER TABLE public.task_submissions ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
      ALTER TABLE public.task_submissions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

      -- Kolom sesi login pada tabel users
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS active_session_token TEXT;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_exam_locked BOOLEAN DEFAULT FALSE;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS exam_locked_reason TEXT;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS exam_locked_at TIMESTAMP WITH TIME ZONE;

      -- Pastikan index unik (task_id, student_id) tersedia untuk upsert progres ujian
      CREATE UNIQUE INDEX IF NOT EXISTS idx_task_submissions_task_student
        ON public.task_submissions (task_id, student_id);

      -- Buat fungsi RPC di Supabase agar aplikasi frontend juga dapat memicu sinkronisasi kolom otomatis kapan saja
      CREATE OR REPLACE FUNCTION public.ensure_schema_columns()
      RETURNS jsonb
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $func$
      BEGIN
        ALTER TABLE public.task_submissions ADD COLUMN IF NOT EXISTS answers JSONB DEFAULT '{}'::jsonb;
        ALTER TABLE public.task_submissions ADD COLUMN IF NOT EXISTS feedback TEXT;
        ALTER TABLE public.task_submissions ADD COLUMN IF NOT EXISTS score NUMERIC DEFAULT NULL;
        ALTER TABLE public.task_submissions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'in_progress';
        ALTER TABLE public.task_submissions ADD COLUMN IF NOT EXISTS session_token TEXT;
        ALTER TABLE public.task_submissions ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;
        ALTER TABLE public.task_submissions ADD COLUMN IF NOT EXISTS login_reset_count INT DEFAULT 0;
        ALTER TABLE public.task_submissions ADD COLUMN IF NOT EXISTS login_reset_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE public.task_submissions ADD COLUMN IF NOT EXISTS violation_count INT DEFAULT 0;
        ALTER TABLE public.task_submissions ADD COLUMN IF NOT EXISTS violation_logs JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE public.task_submissions ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        ALTER TABLE public.task_submissions ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        ALTER TABLE public.task_submissions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS kkm NUMERIC DEFAULT 75;
        ALTER TABLE public.users ADD COLUMN IF NOT EXISTS active_session_token TEXT;
        ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_exam_locked BOOLEAN DEFAULT FALSE;
        ALTER TABLE public.users ADD COLUMN IF NOT EXISTS exam_locked_reason TEXT;
        ALTER TABLE public.users ADD COLUMN IF NOT EXISTS exam_locked_at TIMESTAMP WITH TIME ZONE;
        PERFORM pg_notify('pgrst', 'reload schema');
        RETURN jsonb_build_object('status', 'ok', 'synced_at', NOW());
      END;
      $func$;

      -- Reload PostgREST schema cache agar Supabase API langsung mengenali kolom baru
      NOTIFY pgrst, 'reload schema';
    `);

    console.log('✅ Supabase schema & columns synced automatically');
    return { success: true };
  } catch (e) {
    console.error('Schema sync warning:', e);
    return { success: false, error: e?.message || String(e) };
  } finally {
    try {
      await client.end();
    } catch {}
  }
}

// Run directly if invoked from CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  syncSupabaseSchema();
}
