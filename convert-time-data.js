// Script untuk mengkonversi data total_time_minutes dari detik ke menit
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function convertTimeData() {
  console.log('🔄 Converting time data from seconds to minutes...');
  
  try {
    // 1. Cek data yang perlu dikonversi (total_time_minutes > 100)
    console.log('\n1. Checking data that needs conversion...');
    const { data: dataToConvert, error: checkError } = await supabase
      .from('game_sessions')
      .select('id, game_pin, total_time_minutes, application, created_at')
      .gt('total_time_minutes', 100)
      .order('created_at', { ascending: false });

    if (checkError) {
      console.error('❌ Error checking data:', checkError.message);
      return;
    }

    console.log(`Found ${dataToConvert.length} records that need conversion:`);
    dataToConvert.forEach(record => {
      const minutes = Math.round(record.total_time_minutes / 60);
      console.log(`  ${record.game_pin} (${record.application}): ${record.total_time_minutes} → ${minutes} minutes`);
    });

    if (dataToConvert.length === 0) {
      console.log('✅ No data needs conversion!');
      return;
    }

    // 2. Konversi data
    console.log('\n2. Converting data...');
    for (const record of dataToConvert) {
      const newMinutes = Math.round(record.total_time_minutes / 60);
      
      const { error: updateError } = await supabase
        .from('game_sessions')
        .update({ total_time_minutes: newMinutes })
        .eq('id', record.id);

      if (updateError) {
        console.error(`❌ Error updating ${record.game_pin}:`, updateError.message);
      } else {
        console.log(`✅ Updated ${record.game_pin}: ${record.total_time_minutes} → ${newMinutes} minutes`);
      }
    }

    // 3. Verifikasi hasil
    console.log('\n3. Verifying conversion...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('game_sessions')
      .select('id, game_pin, total_time_minutes, application')
      .order('created_at', { ascending: false })
      .limit(5);

    if (verifyError) {
      console.error('❌ Error verifying data:', verifyError.message);
    } else {
      console.log('Recent records after conversion:');
      verifyData.forEach(record => {
        console.log(`  ${record.game_pin} (${record.application}): ${record.total_time_minutes} minutes`);
      });
    }

    console.log('\n🎉 Time data conversion completed!');
    
  } catch (error) {
    console.error('❌ Conversion failed:', error.message);
  }
}

convertTimeData();
