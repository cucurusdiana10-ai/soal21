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
      ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_id_fkey;
      ALTER TABLE public.users ADD CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;
    `);

    console.log('Constraint updated successfully');
  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}
setup();
