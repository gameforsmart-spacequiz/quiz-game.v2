// Logic untuk handle data lama (detik) dan data baru (menit)
function getTimeInMinutes(totalTimeMinutes) {
  // Jika nilai > 100, kemungkinan masih dalam detik (legacy data)
  if (totalTimeMinutes > 100) {
    return Math.round(totalTimeMinutes / 60); // Konversi detik ke menit
  }
  // Jika nilai <= 100, sudah dalam menit (data baru)
  return totalTimeMinutes;
}

// Test cases
console.log('🧪 Testing time conversion logic...');

const testCases = [
  { input: 600, expected: 10, description: 'Legacy data (600 detik = 10 menit)' },
  { input: 10, expected: 10, description: 'New data (10 menit)' },
  { input: 30, expected: 30, description: 'New data (30 menit)' },
  { input: 1200, expected: 20, description: 'Legacy data (1200 detik = 20 menit)' },
  { input: 5, expected: 5, description: 'New data (5 menit)' }
];

testCases.forEach(testCase => {
  const result = getTimeInMinutes(testCase.input);
  const status = result === testCase.expected ? '✅' : '❌';
  console.log(`${status} ${testCase.description}: ${testCase.input} → ${result} menit`);
});

console.log('\n📝 Implementation in code:');
console.log('// In PlayContent.tsx and HostContent.tsx');
console.log('const getTimeInMinutes = (totalTimeMinutes) => {');
console.log('  return totalTimeMinutes > 100 ? Math.round(totalTimeMinutes / 60) : totalTimeMinutes;');
console.log('};');
console.log('');
console.log('// Usage:');
console.log('timeLimit: getTimeInMinutes(gameData.total_time_minutes),');
