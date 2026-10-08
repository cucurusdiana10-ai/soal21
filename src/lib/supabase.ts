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

let schemaSyncTriggered = false;

/**
 * Automatically ensures any new table columns exist in Supabase
 * via both the Postgres SECURITY DEFINER RPC and the backend migration endpoint.
 * Caches in sessionStorage so it only executes once per user session.
 */
export async function ensureSupabaseSchemaSynced(): Promise<boolean> {
  if (!supabase) return false;
  if (schemaSyncTriggered) return true;
  
  if (typeof window !== 'undefined' && sessionStorage.getItem('sman21_schema_synced') === '1') {
    schemaSyncTriggered = true;
    return true;
  }
  
  schemaSyncTriggered = true;

  try {
    // 1. Trigger Postgres RPC ensure_schema_columns() directly in Supabase
    const { error: rpcError } = await supabase.rpc('ensure_schema_columns');
    if (!rpcError) {
      if (typeof window !== 'undefined') sessionStorage.setItem('sman21_schema_synced', '1');
      return true;
    }
  } catch {
    // Ignore RPC error and try server endpoint fallback
  }

  try {
    // 2. Fallback to backend schema migration endpoint
    const res = await fetch('/api/sync-schema', { method: 'POST' });
    if (res.ok) {
      if (typeof window !== 'undefined') sessionStorage.setItem('sman21_schema_synced', '1');
      return true;
    }
  } catch {
    // Ignore network error in static environments
  }

  return false;
}

// Run schema sync automatically on client startup
if (typeof window !== 'undefined' && isSupabaseConfigured()) {
  ensureSupabaseSchemaSynced().catch(() => {});
}
