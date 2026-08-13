import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://vtjtunvkoicwdugnifxi.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0anR1bnZrb2ljd2R1Z25pZnhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0OTM5NjcsImV4cCI6MjEwMjA2OTk2N30.SN0j9CJ68FlEait3W2upnR6LJEeO9KOUpX3pbvu-tS8');

async function test() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', 'admin')
    .eq('password', 'admin123')
    .eq('role', 'admin')
    .eq('status', 'active')
    .single();
    
  console.log('Result:', { data, error });
}
test();
