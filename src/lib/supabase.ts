import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://kwpeqfranfwjlrcrqsct.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3cGVxZnJhbmZ3amxyY3Jxc2N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NjAzODcsImV4cCI6MjA4ODIzNjM4N30.F7a8cd7Gx-oR-NWVJF9Tx8JfPyfSBRdsAF4ADXVNRw4'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)