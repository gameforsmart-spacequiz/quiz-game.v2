// Script untuk cek data berdasarkan application identifier
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkApplicationData() {
  console.log('🔍 Checking application data in game_sessions...');
  
  try {
    // Get all applications
    const { data: allData, error: allError } = await supabase
      .from('game_sessions')
      .select('application')
      .not('application', 'is', null);

    if (allError) {
      console.error('❌ Error fetching data:', allError.message);
      return;
    }

    // Count by application
    const appCounts = {};
    allData.forEach(row => {
      const app = row.application || 'null';
      appCounts[app] = (appCounts[app] || 0) + 1;
    });

    console.log('\n📊 Game Sessions by Application:');
    Object.entries(appCounts).forEach(([app, count]) => {
      console.log(`  ${app}: ${count} sessions`);
    });

    // Get recent space-quiz sessions
    console.log('\n🚀 Recent space-quiz sessions:');
    const { data: spaceQuizData, error: spaceQuizError } = await supabase
      .from('game_sessions')
      .select('id, game_pin, status, created_at, participants')
      .eq('application', 'space-quiz')
      .order('created_at', { ascending: false })
      .limit(5);

    if (spaceQuizError) {
      console.error('❌ Error fetching space-quiz data:', spaceQuizError.message);
    } else {
      spaceQuizData.forEach(session => {
        const participantCount = session.participants ? session.participants.length : 0;
        console.log(`  ${session.game_pin} - ${session.status} - ${participantCount} participants - ${session.created_at}`);
      });
    }

    // Get recent gameforsmart.com sessions for comparison
    console.log('\n🌐 Recent gameforsmart.com sessions:');
    const { data: gameforsmartData, error: gameforsmartError } = await supabase
      .from('game_sessions')
      .select('id, game_pin, status, created_at, participants')
      .eq('application', 'gameforsmart.com')
      .order('created_at', { ascending: false })
      .limit(5);

    if (gameforsmartError) {
      console.error('❌ Error fetching gameforsmart.com data:', gameforsmartError.message);
    } else {
      gameforsmartData.forEach(session => {
        const participantCount = session.participants ? session.participants.length : 0;
        console.log(`  ${session.game_pin} - ${session.status} - ${participantCount} participants - ${session.created_at}`);
      });
    }

    console.log('\n✅ Application data check completed!');
    
  } catch (error) {
    console.error('❌ Check failed:', error.message);
  }
}

checkApplicationData();
