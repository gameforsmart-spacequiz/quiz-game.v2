const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAnonymousInsert() {
  console.log('Testing anonymous insert into game_sessions...');
  
  // Valid XID characters: 0-9, a-h, j-k, m-n, p-t, v-z
  const xid = '0123456789abcdefghjk'; 
  
  const { error } = await supabase
    .from('game_sessions')
    .insert({
        id: xid,
        game_pin: 'ANON01',
        quiz_id: xid, 
        host_id: xid,
        status: 'waiting',
        application: 'test'
    });
    
  if (error) {
    console.error('❌ Insert failed:', error.message, 'Code:', error.code);
  } else {
    console.log('✅ Anonymous insert SUCCEEDED!');
    // Clean up
    await supabase.from('game_sessions').delete().eq('id', xid);
  }
}

testAnonymousInsert();
