import { createClient } from '@supabase/supabase-js';

// Replace these with your actual Supabase project URL and anon key
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://jwszynfaykpouzwxlevj.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3c3p5bmZheWtwb3V6d3hsZXZqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTMxOTgwOSwiZXhwIjoyMDk2ODk1ODA5fQ.8zfebp6zD8ZU9HptCZ9VjjLxbF9agXNQ2i9tbGn8sN8';

export const supabase = createClient(supabaseUrl, supabaseKey);