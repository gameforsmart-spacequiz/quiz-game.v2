// Test script untuk cek game creation
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testGameCreation() {
  console.log('🧪 Testing game creation...');
  
  try {
    // Get a sample quiz first
    const { data: quizzes, error: quizError } = await supabase
      .from('quizzes')
      .select('*')
      .limit(1);
    
    if (quizError || !quizzes || quizzes.length === 0) {
      console.error('❌ No quizzes found:', quizError?.message);
      return;
    }
    
    const quiz = quizzes[0];
    console.log(`✅ Found quiz: ${quiz.title}`);
    
    // Test game creation
    const gameId = 'test-game-' + Date.now();
    const gameCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const { data, error } = await supabase
      .from('game_sessions')
      .insert({
        id: gameId,
        game_pin: gameCode,
        quiz_id: quiz.id,
        host_id: "test-host",
        status: "waiting",
        total_time_minutes: 10,
        question_limit: "5",
        participants: [],
        responses: [],
        chat_messages: [],
        current_questions: [],
        application: "gameforsmart.com"
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ Game creation failed:', error.message);
      console.error('Error details:', error);
    } else {
      console.log('✅ Game created successfully!');
      console.log('Game data:', {
        id: data.id,
        game_pin: data.game_pin,
        quiz_id: data.quiz_id,
        host_id: data.host_id,
        status: data.status
      });
      
      // Clean up test data
      await supabase
        .from('game_sessions')
        .delete()
        .eq('id', gameId);
      console.log('🧹 Test data cleaned up');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testGameCreation();
