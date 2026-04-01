const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAnonymousInsert() {
  console.log('Testing anonymous insert into game_sessions...');
  
  const xid = 'c9iqk5m6ed4lbcr11bfg'; // 20 chars valid XID format
  
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
    if (error.code === '23505') {
       console.log('✅ Entry already exists (PK violation), but that means RLS allowed the check!');
    } else {
       console.error('❌ Insert failed:', error.message, 'Code:', error.code);
    }
  } else {
    console.log('✅ Anonymous insert SUCCEEDED!');
    // Clean up
    await supabase.from('game_sessions').delete().eq('id', xid);
  }
}

testAnonymousInsert();
