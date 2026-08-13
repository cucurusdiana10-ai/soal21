import pkg from 'pg';
const { Client } = pkg;

async function setup() {
  const client = new Client({
    user: 'postgres',
    password: '@21GarutJuara',
    host: 'db.vtjtunvkoicwdugnifxi.supabase.co',
    port: 6543,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    
    await client.query(`
      ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE;
      ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS guru_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
      ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS subject_name TEXT;
      
      ALTER TABLE public.teaching_materials ADD COLUMN IF NOT EXISTS guru_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
      ALTER TABLE public.teaching_materials ADD COLUMN IF NOT EXISTS subject_name TEXT;
      ALTER TABLE public.teaching_materials ADD COLUMN IF NOT EXISTS grade TEXT;
      ALTER TABLE public.teaching_materials ADD COLUMN IF NOT EXISTS title TEXT;
    `);

    console.log('Schema updated successfully');
  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}
setup();
