const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function fixAndTestPasswords() {
  console.log('=== FIXING PASSWORDS ===\n');
  
  // Generate correct password hash for 'admin123'
  const adminPassword = 'admin123';
  const correctHash = await bcrypt.hash(adminPassword, 10);
  console.log('Correct hash for "admin123":', correctHash);
  console.log('');
  
  // Update admin user
  console.log('Updating admin user...');
  const { error: adminError } = await supabase
    .from('users')
    .update({ password: correctHash })
    .eq('email', 'admin@ecovolt.com');
  
  if (adminError) {
    console.log('Error updating admin:', adminError.message);
  } else {
    console.log('✅ Admin user updated');
  }
  
  // Generate hash for 'test123'
  const testPassword = 'test123';
  const testHash = await bcrypt.hash(testPassword, 10);
  
  // Update test user
  console.log('Updating test user...');
  const { error: testError } = await supabase
    .from('users')
    .update({ password: testHash })
    .eq('email', 'test@ecovolt.com');
  
  if (testError) {
    console.log('Error updating test:', testError.message);
  } else {
    console.log('✅ Test user updated');
  }
  
  console.log('\n=== TESTING LOGIN ===\n');
  
  // Test admin login
  const { data: adminUser } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'admin@ecovolt.com')
    .single();
  
  if (adminUser) {
    const isValid = await bcrypt.compare('admin123', adminUser.password);
    console.log('Admin login test (admin123):', isValid ? '✅ SUCCESS' : '❌ FAILED');
  }
  
  // Test test user login
  const { data: testUser } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'test@ecovolt.com')
    .single();
  
  if (testUser) {
    const isValid = await bcrypt.compare('test123', testUser.password);
    console.log('Test user login (test123):', isValid ? '✅ SUCCESS' : '❌ FAILED');
  }
  
  console.log('\n=== LOGIN CREDENTIALS ===');
  console.log('Admin Login:');
  console.log('  Email: admin@ecovolt.com');
  console.log('  Password: admin123');
  console.log('');
  console.log('Test User Login:');
  console.log('  Email: test@ecovolt.com');
  console.log('  Password: test123');
}

fixAndTestPasswords();