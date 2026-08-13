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
      ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'pg';
      ALTER TABLE public.task_submissions ADD COLUMN IF NOT EXISTS answers JSONB DEFAULT '{}'::jsonb;
      ALTER TABLE public.task_submissions ADD COLUMN IF NOT EXISTS feedback TEXT;
    `);

    console.log('DB updated successfully');
  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}
setup();
