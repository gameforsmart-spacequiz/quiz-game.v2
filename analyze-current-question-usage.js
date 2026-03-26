// Analisis penggunaan current_question di participants
console.log('🔍 Analyzing current_question usage in participants...');

console.log('\n📊 Current Usage:');
console.log('1. Set when player joins: current_question: 0');
console.log('2. Update when player answers: current_question: currentQuestion + 1');
console.log('3. Set when player leaves: current_question: -1');

console.log('\n🤔 Potential Issues if Removed:');
console.log('❌ Host cannot track which question each player is on');
console.log('❌ Cannot show "Player X is on question 3" in host dashboard');
console.log('❌ Cannot detect if player is stuck on a question');
console.log('❌ Cannot show progress bar per player');

console.log('\n✅ Alternative Solutions:');
console.log('1. Calculate from responses array:');
console.log('   const playerProgress = responses.filter(r => r.player_id === playerId).length');
console.log('2. Use currentQuestion state in frontend');
console.log('3. Calculate from question index in UI');

console.log('\n🔧 Implementation:');
console.log('// Calculate player progress from responses');
console.log('function getPlayerProgress(playerId, responses) {');
console.log('  return responses.filter(r => r.player_id === playerId).length;');
console.log('}');
console.log('');
console.log('// Get current question for player');
console.log('function getCurrentQuestion(playerId, responses, totalQuestions) {');
console.log('  const answered = getPlayerProgress(playerId, responses);');
console.log('  return answered < totalQuestions ? answered + 1 : null;');
console.log('}');

console.log('\n📈 Benefits of Removing:');
console.log('✅ Simpler data structure');
console.log('✅ No data duplication');
console.log('✅ Single source of truth (responses)');
console.log('✅ Easier to maintain');

console.log('\n⚠️ Potential Drawbacks:');
console.log('❌ Need to calculate progress on-demand');
console.log('❌ Slightly more complex queries');
console.log('❌ May impact performance with many players');

console.log('\n🎯 Recommendation:');
console.log('✅ REMOVE current_question from participants');
console.log('✅ Calculate progress from responses array');
console.log('✅ Use frontend state for real-time tracking');
