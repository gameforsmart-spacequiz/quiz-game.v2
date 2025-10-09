// Test script untuk cek konversi waktu
console.log('🕐 Testing time conversion logic...');

// Simulasi data dari database
const gameData = {
  total_time_minutes: 10, // 10 menit dari database
  question_limit: "15"
};

console.log('\n📊 Database Data:');
console.log(`total_time_minutes: ${gameData.total_time_minutes} (menit)`);
console.log(`question_limit: ${gameData.question_limit}`);

console.log('\n🔧 Game Settings (SEBELUM perbaikan):');
const oldTimeLimit = gameData.total_time_minutes * 60; // Salah: 10 * 60 = 600 detik
console.log(`timeLimit: ${oldTimeLimit} detik (${oldTimeLimit/60} menit)`);

console.log('\n✅ Game Settings (SESUDAH perbaikan):');
const newTimeLimit = gameData.total_time_minutes; // Benar: 10 menit
console.log(`timeLimit: ${newTimeLimit} menit`);

console.log('\n⏱️ Timer Logic (untuk countdown):');
const timerSeconds = gameData.total_time_minutes * 60; // 10 * 60 = 600 detik untuk timer
const timerMs = gameData.total_time_minutes * 60 * 1000; // 10 * 60 * 1000 = 600000 ms
console.log(`Timer seconds: ${timerSeconds} detik`);
console.log(`Timer milliseconds: ${timerMs} ms`);

console.log('\n📝 Summary:');
console.log('✅ Database: total_time_minutes = 10 (menit)');
console.log('✅ Game Settings: timeLimit = 10 (menit)');
console.log('✅ Timer: 10 * 60 = 600 detik untuk countdown');
console.log('✅ Timer: 10 * 60 * 1000 = 600000 ms untuk JavaScript');

console.log('\n🎯 Expected Results:');
console.log('- Game settings akan menampilkan 10 menit');
console.log('- Timer akan countdown dari 600 detik (10 menit)');
console.log('- Database menyimpan 10 (bukan 600)');
