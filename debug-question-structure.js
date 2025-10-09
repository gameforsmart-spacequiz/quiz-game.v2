// Debug script untuk menganalisis struktur question
console.log('🔍 Debugging question structure error...');

console.log('\n📊 Possible Causes:');
console.log('1. current_questions dari database kosong atau null');
console.log('2. quizData.questions tidak ada atau invalid');
console.log('3. Question object tidak memiliki choices array');
console.log('4. Data corruption di database');

console.log('\n🔧 Debug Steps:');
console.log('1. Check current_questions in database');
console.log('2. Check quizData.questions structure');
console.log('3. Add validation before regenerateQuestionsWithSeed');
console.log('4. Add fallback to quiz questions');

console.log('\n💡 Solution:');
console.log('// Add validation before calling regenerateQuestionsWithSeed');
console.log('if (!questionsToUse || !Array.isArray(questionsToUse) || questionsToUse.length === 0) {');
console.log('  console.error("Invalid questionsToUse:", questionsToUse);');
console.log('  // Fallback to quiz questions');
console.log('  questionsToUse = quizData.questions;');
console.log('}');
console.log('');
console.log('// Validate each question before processing');
console.log('const validQuestions = questionsToUse.filter(q => q && q.choices && Array.isArray(q.choices));');
console.log('if (validQuestions.length === 0) {');
console.log('  console.error("No valid questions found");');
console.log('  return;');
console.log('}');

