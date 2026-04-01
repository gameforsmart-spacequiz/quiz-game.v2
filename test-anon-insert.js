const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAnonymousInsert() {
  console.log('Testing anonymous insert into game_sessions...');
  
  // Requirement: valid 20-char XID for id and host_id
  const xid = 'c9iqk5m6ed4lbcr11bfg'; 
  
  const { error } = await supabase
    .from('game_sessions')
    .insert({
        id: 'test' + Date.now().toString().slice(-16), // ensure 20 chars? No, XID format
        game_pin: 'ANON01',
        quiz_id: 'c9iqk5m6ed4lbcr11bfg', 
        host_id: 'c9iqk5m6ed4lbcr11bfg',
        status: 'waiting',
        application: 'test'
    });
    
  if (error) {
    console.error('❌ Insert failed:', error.message, 'Code:', error.code);
  } else {
    console.log('✅ Anonymous insert SUCCEEDED!');
    // Clean up
    await supabase.from('game_sessions').delete().eq('game_pin', 'ANON01');
  }
}

testAnonymousInsert();
