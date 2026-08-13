import pkg from 'pg';
const { Client } = pkg;

async function migrate() {
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
    console.log('Connected');

    await client.query(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;

      DO $$
      DECLARE
        new_uid uuid := '3e9cfb01-4b1c-411c-8b2a-906d1862f4b2'; 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = new_uid) THEN
          INSERT INTO auth.users (
            instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
          ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            new_uid,
            'authenticated',
            'authenticated',
            'admin@sekolah.local',
            crypt('admin123', gen_salt('bf')),
            NOW(),
            '{"provider":"email","providers":["email"]}',
            '{}',
            NOW(),
            NOW()
          );
        ELSE
          UPDATE auth.users SET encrypted_password = crypt('admin123', gen_salt('bf')) WHERE id = new_uid;
        END IF;
      END $$;
    `);
    
    // Add FK constraint if it doesn't exist
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'users_id_fkey' AND table_name = 'users'
        ) THEN
          ALTER TABLE public.users ADD CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    console.log('Migration successful');
  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}
migrate();
