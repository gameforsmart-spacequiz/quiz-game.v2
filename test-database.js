// Test script untuk cek database connection
// Jalankan dengan: node test-database.js

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabase() {
  console.log('🧪 Testing database connection...');
  
  try {
    // Test 1: Cek game_sessions table
    console.log('\n1. Testing game_sessions table...');
    const { data: games, error: gamesError } = await supabase
      .from('game_sessions')
      .select('*')
      .limit(1);
    
    if (gamesError) {
      console.error('❌ Error accessing game_sessions:', gamesError.message);
    } else {
      console.log('✅ game_sessions table accessible');
    }

    // Test 2: Cek quizzes table
    console.log('\n2. Testing quizzes table...');
    const { data: quizzes, error: quizzesError } = await supabase
      .from('quizzes')
      .select('*')
      .limit(1);
    
    if (quizzesError) {
      console.error('❌ Error accessing quizzes:', quizzesError.message);
    } else {
      console.log('✅ quizzes table accessible');
      if (quizzes && quizzes.length > 0) {
        console.log('📊 Sample quiz:', {
          id: quizzes[0].id,
          title: quizzes[0].title,
          hasQuestions: !!quizzes[0].questions && quizzes[0].questions.length > 0
        });
      }
    }

    // Test 3: Cek apakah bisa create game session
    console.log('\n3. Testing game session creation...');
    const testGameData = {
      game_pin: 'TEST123',
      quiz_id: quizzes?.[0]?.id || 'test-quiz-id',
      status: 'waiting',
      participants: [],
      responses: [],
      chat_messages: [],
      current_questions: [],
      application: 'gameforsmart.com'
    };

    const { data: newGame, error: createError } = await supabase
      .from('game_sessions')
      .insert(testGameData)
      .select()
      .single();

    if (createError) {
      console.error('❌ Error creating game session:', createError.message);
    } else {
      console.log('✅ Game session created successfully');
      
      // Clean up test data
      await supabase
        .from('game_sessions')
        .delete()
        .eq('id', newGame.id);
      console.log('🧹 Test data cleaned up');
    }

    console.log('\n🎉 Database test completed successfully!');
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
  }
}

testDatabase();
