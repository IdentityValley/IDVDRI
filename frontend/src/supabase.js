import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pyvcwxkqtqmqwykayrto.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5dmN3eGtxdHFtcXd5a2F5cnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjAyMTEsImV4cCI6MjA3Mjk5NjIxMX0.ZsGqB6ihkQ6B7FzeUhR9wlaw1rY2_0q4ZlkpKzaU3hw'

export const supabase = createClient(supabaseUrl, supabaseKey)
