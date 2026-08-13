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
      ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS homeroom_teacher_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
    `);

    console.log('Column added successfully');
  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}
setup();
