import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://vtjtunvkoicwdugnifxi.supabase.co', process.env.VITE_SUPABASE_ANON_KEY);
async function test() {
  const { data, error } = await supabase.from('classes').select('*, teacher:users!homeroom_teacher_id(id, name)');
  console.log('Data:', data);
  console.log('Error:', error);
}
test();
