// Test script untuk cek apakah quiz bisa di-load dari database
// Jalankan dengan: node test-quiz-loading.js

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testQuizLoading() {
  console.log('🧪 Testing quiz loading from database...');
  
  try {
    // Test 1: Cek apakah ada quiz di database
    console.log('\n1. Checking available quizzes...');
    const { data: quizzes, error: quizzesError } = await supabase
      .from('quizzes')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (quizzesError) {
      console.error('❌ Error loading quizzes:', quizzesError.message);
      return;
    }
    
    console.log(`✅ Found ${quizzes.length} quizzes in database`);
    
    if (quizzes.length > 0) {
      console.log('\n📊 Sample quiz data:');
      const sampleQuiz = quizzes[0];
      console.log({
        id: sampleQuiz.id,
        title: sampleQuiz.title,
        description: sampleQuiz.description,
        category: sampleQuiz.category,
        language: sampleQuiz.language,
        is_public: sampleQuiz.is_public,
        questionsCount: sampleQuiz.questions ? sampleQuiz.questions.length : 0,
        hasQuestions: !!sampleQuiz.questions && sampleQuiz.questions.length > 0
      });
      
      // Test 2: Cek struktur questions
      if (sampleQuiz.questions && sampleQuiz.questions.length > 0) {
        console.log('\n2. Checking question structure...');
        const sampleQuestion = sampleQuiz.questions[0];
        console.log('Sample question:', {
          id: sampleQuestion.id,
          type: sampleQuestion.type,
          question: sampleQuestion.question,
          points: sampleQuestion.points,
          answersCount: sampleQuestion.answers ? sampleQuestion.answers.length : 0,
          correct: sampleQuestion.correct
        });
        
        if (sampleQuestion.answers && sampleQuestion.answers.length > 0) {
          console.log('Sample answer:', sampleQuestion.answers[0]);
        }
      }
      
      // Test 3: Cek filter by category
      console.log('\n3. Testing category filter...');
      const { data: generalQuizzes, error: generalError } = await supabase
        .from('quizzes')
        .select('*')
        .eq('category', 'general');
      
      if (generalError) {
        console.error('❌ Error filtering by category:', generalError.message);
      } else {
        console.log(`✅ Found ${generalQuizzes.length} general category quizzes`);
      }
      
      const { data: techQuizzes, error: techError } = await supabase
        .from('quizzes')
        .select('*')
        .eq('category', 'technology');
      
      if (techError) {
        console.error('❌ Error filtering by category:', techError.message);
      } else {
        console.log(`✅ Found ${techQuizzes.length} technology category quizzes`);
      }
    } else {
      console.log('⚠️  No quizzes found in database');
    }

    console.log('\n🎉 Quiz loading test completed successfully!');
    console.log('\n📝 Summary:');
    console.log(`- Total quizzes: ${quizzes.length}`);
    console.log(`- General quizzes: ${quizzes.filter(q => q.category === 'general').length}`);
    console.log(`- Technology quizzes: ${quizzes.filter(q => q.category === 'technology').length}`);
    console.log(`- Public quizzes: ${quizzes.filter(q => q.is_public).length}`);
    
  } catch (error) {
    console.error('❌ Quiz loading test failed:', error.message);
  }
}

testQuizLoading();
