const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  const { data, error } = await supabase
    .from('game_sessions')
    .select('*')
    .limit(1);
    
  if (error) {
    console.error('Error fetching game_sessions:', error);
  } else if (!data || data.length === 0) {
    console.log('No data in game_sessions, checking schema via RPC or other means...');
    // Since I can't easily check information_schema without a better client, 
    // I'll try a dummy insert with just ID to see what it complains about.
    const { error: insertError } = await supabase
        .from('game_sessions')
        .insert({ id: 'dummy-' + Date.now() });
    console.error('Insert error (useful for schema check):', insertError);
  } else {
    console.log('Columns in game_sessions:', JSON.stringify(Object.keys(data[0]), null, 2));
  }
}

checkSchema();
