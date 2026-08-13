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
      CREATE OR REPLACE FUNCTION public.sync_user_to_auth()
      RETURNS trigger AS $$
      DECLARE
        user_email text;
      BEGIN
        user_email := NEW.username || '@sekolah.local';

        IF TG_OP = 'INSERT' THEN
          INSERT INTO auth.users (
            instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, 
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at
          ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            NEW.id, 'authenticated', 'authenticated', user_email,
            crypt(NEW.password, gen_salt('bf')),
            NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW()
          );
        ELSIF TG_OP = 'UPDATE' THEN
          IF NEW.password <> OLD.password THEN
            UPDATE auth.users SET encrypted_password = crypt(NEW.password, gen_salt('bf')) WHERE id = NEW.id;
          END IF;
          IF NEW.username <> OLD.username THEN
            UPDATE auth.users SET email = user_email WHERE id = NEW.id;
          END IF;
        ELSIF TG_OP = 'DELETE' THEN
          DELETE FROM auth.users WHERE id = OLD.id;
        END IF;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;

      DROP TRIGGER IF EXISTS sync_user_to_auth_trigger ON public.users;
      CREATE TRIGGER sync_user_to_auth_trigger
      AFTER INSERT OR UPDATE OR DELETE ON public.users
      FOR EACH ROW EXECUTE FUNCTION public.sync_user_to_auth();
    `);

    console.log('Trigger created successfully');
  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}
setup();
