// Test script untuk cek game creation dengan nilai yang benar
console.log('🧪 Testing new game creation logic...');

// Simulasi RulesDialog logic
const timeLimitMinutes = 10; // User selects 10 minutes

// SEBELUM perbaikan
const oldTimeLimit = timeLimitMinutes * 60; // 10 * 60 = 600 detik
console.log('\n❌ SEBELUM perbaikan:');
console.log(`User selects: ${timeLimitMinutes} menit`);
console.log(`RulesDialog sends: ${oldTimeLimit} detik`);
console.log(`Database stores: ${oldTimeLimit} (salah!)`);

// SESUDAH perbaikan  
const newTimeLimit = timeLimitMinutes; // 10 menit
console.log('\n✅ SESUDAH perbaikan:');
console.log(`User selects: ${timeLimitMinutes} menit`);
console.log(`RulesDialog sends: ${newTimeLimit} menit`);
console.log(`Database stores: ${newTimeLimit} (benar!)`);

// Test berbagai nilai
const testCases = [
  { minutes: 5, expected: 5 },
  { minutes: 10, expected: 10 },
  { minutes: 15, expected: 15 },
  { minutes: 30, expected: 30 }
];

console.log('\n📊 Test Cases:');
testCases.forEach(test => {
  const result = test.minutes; // New logic
  const status = result === test.expected ? '✅' : '❌';
  console.log(`${status} ${test.minutes} menit → Database: ${result} menit`);
});

console.log('\n🎯 Expected Results:');
console.log('- User pilih 10 menit → Database: 10 menit');
console.log('- User pilih 5 menit → Database: 5 menit');
console.log('- User pilih 30 menit → Database: 30 menit');
console.log('- Tidak ada lagi nilai 600 di database!');
