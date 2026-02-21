// js/supabase-client.js

// 1. We get the createClient function from the global window object (injected by the CDN)
const { createClient } = window.supabase;

// 2. Add your project credentials here
const supabaseUrl = 'https://xbyaauotligcvlebiexp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhieWFhdW90bGlnY3ZsZWJpZXhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MDM2NTgsImV4cCI6MjA4NzA3OTY1OH0.mkSugT40RAhm5AJplfI6rGRxa6968ObQTOmUkoUaP0c';

// 3. Initialize and export the client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);