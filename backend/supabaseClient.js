require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials in .env file");
  process.exit(1);
}

// Service role client bypasses RLS for administrative backend operations
// Note: If you want user-specific context, the backend should accept the user's JWT
const supabase = createClient(supabaseUrl, supabaseServiceKey);

module.exports = supabase;
