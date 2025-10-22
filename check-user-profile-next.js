// Script untuk cek data user kiro59005 di database menggunakan Next.js env
// Jalankan dengan: npx next dev --port 3001 & node check-user-profile-next.js

const { createClient } = require('@supabase/supabase-js');

// Load environment variables from .env.local or system
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 Environment check:');
console.log('Supabase URL:', supabaseUrl ? 'Set' : 'Not set');
console.log('Supabase Key:', supabaseKey ? 'Set' : 'Not set');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Please make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUserProfile() {
  console.log('\n🔍 Checking user profile for kiro59005...');
  
  try {
    // Cek di tabel profiles berdasarkan username
    console.log('\n1. Searching by username "kiro59005"...');
    const { data: profileByUsername, error: usernameError } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', 'kiro59005')
      .single();
    
    if (usernameError) {
      console.log('❌ Error searching by username:', usernameError.message);
      console.log('Error code:', usernameError.code);
    } else if (profileByUsername) {
      console.log('✅ Found profile by username:');
      console.log(JSON.stringify(profileByUsername, null, 2));
    } else {
      console.log('❌ No profile found with username "kiro59005"');
    }

    // Cek di tabel profiles berdasarkan email yang mengandung kiro59005
    console.log('\n2. Searching by email containing "kiro59005"...');
    const { data: profileByEmail, error: emailError } = await supabase
      .from('profiles')
      .select('*')
      .ilike('email', '%kiro59005%');
    
    if (emailError) {
      console.log('❌ Error searching by email:', emailError.message);
    } else if (profileByEmail && profileByEmail.length > 0) {
      console.log('✅ Found profiles by email:');
      profileByEmail.forEach((profile, index) => {
        console.log(`${index + 1}.`, JSON.stringify(profile, null, 2));
      });
    } else {
      console.log('❌ No profiles found with email containing "kiro59005"');
    }

    // Cek semua profiles untuk melihat struktur data
    console.log('\n3. Checking all profiles structure...');
    const { data: allProfiles, error: allError } = await supabase
      .from('profiles')
      .select('id, username, email, fullname, auth_user_id, created_at')
      .limit(10);
    
    if (allError) {
      console.log('❌ Error fetching all profiles:', allError.message);
    } else {
      console.log('📊 Sample profiles in database:');
      allProfiles.forEach((profile, index) => {
        console.log(`${index + 1}. Username: ${profile.username}, Email: ${profile.email}, Auth ID: ${profile.auth_user_id}`);
      });
    }

    // Cek apakah ada user dengan email yang mirip
    console.log('\n4. Searching for similar usernames...');
    const { data: similarProfiles, error: similarError } = await supabase
      .from('profiles')
      .select('*')
      .ilike('username', '%kiro%');
    
    if (similarError) {
      console.log('❌ Error searching similar usernames:', similarError.message);
    } else if (similarProfiles && similarProfiles.length > 0) {
      console.log('✅ Found similar usernames:');
      similarProfiles.forEach((profile, index) => {
        console.log(`${index + 1}.`, JSON.stringify(profile, null, 2));
      });
    } else {
      console.log('❌ No profiles found with similar usernames');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkUserProfile();

