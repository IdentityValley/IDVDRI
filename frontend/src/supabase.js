import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pyvcwxkqtqmqwykayrto.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5dmN3eGtxdHFtcXd5a2F5cnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjAyMTEsImV4cCI6MjA3Mjk5NjIxMX0.ZsGqB6ihkQ6B7FzeUhR9wlaw1rY2_0q4ZlkpKzaU3hw'

export const supabase = createClient(supabaseUrl, supabaseKey)

// Test function to verify Supabase connection
export async function testSupabaseConnection() {
  try {
    console.log('Testing Supabase connection...');
    console.log('URL:', supabaseUrl);
    console.log('Key:', supabaseKey.substring(0, 20) + '...');
    
    const { data, error } = await supabase
      .from('companies')
      .select('count')
      .limit(1);
    
    console.log('Connection test result:', { data, error });
    
    if (error) {
      console.error('Supabase connection failed:', error);
      return { success: false, error };
    }
    
    console.log('Supabase connection successful!');
    return { success: true, data };
  } catch (err) {
    console.error('Supabase connection error:', err);
    return { success: false, error: err };
  }
}
