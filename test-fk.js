const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFK() {
  console.log('Testing host_id FK constraint...');
  const randomHostId = 'guest_' + Date.now();
  
  const { error } = await supabase
    .from('game_sessions')
    .insert({
        id: 'test-' + Date.now(),
        game_pin: 'FKTEST',
        quiz_id: 'any', // maybe quiz_id also has FK?
        host_id: randomHostId,
        status: 'waiting',
        application: 'test'
    });
    
  if (error) {
    if (error.code === '23503') {
      console.log('✅ Found FK constraint violation! Code 23503');
      console.log('Error detail:', error.detail);
    } else {
      console.error('Other error:', error.message, 'Code:', error.code);
    }
  } else {
    console.log('❌ No FK constraint, insert succeeded.');
  }
}

testFK();
