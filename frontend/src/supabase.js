import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pyvcwxkqtqmqwykayrto.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5dmN3eGtxdHFtcXd5a2F5cnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjAyMTEsImV4cCI6MjA3Mjk5NjIxMX0.ZsGqB6ihkQ6B7FzeUhR9wlaw1rY2_0q4ZlkpKzaU3hw'

export const supabase = createClient(supabaseUrl, supabaseKey)
export const supabaseAnonKey = supabaseKey

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

// Function to inspect table schema
export async function inspectTableSchema() {
  try {
    console.log('Inspecting companies table schema...');
    
    // Try to get one row to see the structure
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .limit(1);
    
    console.log('Table schema inspection:', { data, error });
    
    if (error) {
      console.error('Schema inspection error:', error);
      return { success: false, error };
    }
    
    if (data && data.length > 0) {
      console.log('Table columns:', Object.keys(data[0]));
    } else {
      console.log('Table is empty, cannot inspect schema');
    }
    
    return { success: true, data };
  } catch (err) {
    console.error('Schema inspection error:', err);
    return { success: false, error: err };
  }
}

// Function to test inserting a simple record
export async function testInsertSimpleRecord() {
  try {
    console.log('Testing simple record insert...');
    
    const testRecord = {
      id: 999999,
      name: 'Test Company',
      scores: {},
      perdrg: {},
      overallscore: 5.0
    };
    
    const { data, error } = await supabase
      .from('companies')
      .insert(testRecord)
      .select();
    
    console.log('Simple insert test result:', { data, error });
    
    if (error) {
      console.error('Simple insert failed:', error);
      return { success: false, error };
    }
    
    console.log('Simple insert successful!');
    
    // Clean up test record
    await supabase
      .from('companies')
      .delete()
      .eq('id', 999999);
    
    return { success: true, data };
  } catch (err) {
    console.error('Simple insert error:', err);
    return { success: false, error: err };
  }
}

// Function to check what columns actually exist in the table
export async function checkTableColumns() {
  try {
    console.log('Checking table columns...');
    
    // Try a simple select to see what columns exist
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .limit(1);
    
    console.log('Column check result:', { data, error });
    
    if (error) {
      console.error('Column check failed:', error);
      return { success: false, error };
    }
    
    if (data && data.length > 0) {
      console.log('Available columns:', Object.keys(data[0]));
    } else {
      console.log('Table is empty, trying to insert test record...');
      
      // Try to insert a test record to see what columns are expected
      const testRecord = {
        id: 999998,
        name: 'Schema Test',
        scores: {},
        perdrg: {},
        overallscore: 1.0
      };
      
      const { data: insertData, error: insertError } = await supabase
        .from('companies')
        .insert(testRecord)
        .select();
      
      console.log('Test insert result:', { insertData, insertError });
      
      if (insertError) {
        console.error('Test insert failed:', insertError);
        return { success: false, error: insertError };
      }
      
      console.log('Test insert successful, columns:', Object.keys(insertData[0]));
      
      // Clean up
      await supabase
        .from('companies')
        .delete()
        .eq('id', 999998);
    }
    
    return { success: true, data };
  } catch (err) {
    console.error('Column check error:', err);
    return { success: false, error: err };
  }
}
