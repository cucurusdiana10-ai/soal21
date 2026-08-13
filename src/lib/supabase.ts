import { createClient } from '@supabase/supabase-js';

// Hardcode the keys provided by the user to avoid being overridden by stale environment variables
const supabaseUrl = 'https://vtjtunvkoicwdugnifxi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0anR1bnZrb2ljd2R1Z25pZnhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0OTM5NjcsImV4cCI6MjEwMjA2OTk2N30.SN0j9CJ68FlEait3W2upnR6LJEeO9KOUpX3pbvu-tS8';

// We export a function to check if Supabase is configured
export const isSupabaseConfigured = () => {
  return Boolean(supabaseUrl && supabaseAnonKey);
};

// Only initialize if keys are present to avoid crashing
export const supabase = isSupabaseConfigured() 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;
