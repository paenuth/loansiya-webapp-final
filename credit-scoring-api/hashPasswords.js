require('dotenv').config();
const bcrypt = require('bcrypt');
const { Storage } = require('@google-cloud/storage');

// Initialize Google Cloud Storage
const storage = new Storage({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
});

// Use the loansiya-accounts bucket for officer data
const bucket = storage.bucket('loansiya-accounts');

async function hashPasswords() {
  try {
    console.log('🔐 Starting password hashing process...\n');
    
    // Download current officers data from GCS
    console.log('📥 Downloading current loan_officers.json from GCS...');
    const [file] = await bucket.file('loan_officers.json').download();
    const officers = JSON.parse(file.toString());
    
    console.log(`👥 Found ${officers.length} officers to process:`);
    officers.forEach(officer => {
      console.log(`   - ${officer.username} (${officer.fullName}) - Status: ${officer.status}`);
    });
    
    console.log('\n🔨 Hashing passwords...');
    
    // Hash passwords for all officers
    const hashedOfficers = await Promise.all(
      officers.map(async (officer, index) => {
        const originalPassword = officer.password;
        const hashedPassword = await bcrypt.hash(officer.password, 10);
        
        console.log(`   ✅ ${index + 1}/${officers.length} - ${officer.username}: "${originalPassword}" → [HASHED]`);
        
        return {
          ...officer,
          password: hashedPassword,
        };
      })
    );

    console.log('\n📤 Uploading hashed passwords back to GCS...');
    
    // Upload the updated officers data back to GCS
    await bucket.file('loan_officers.json').save(
      JSON.stringify(hashedOfficers, null, 2),
      { 
        contentType: 'application/json',
        metadata: {
          updated: new Date().toISOString(),
          note: 'Passwords hashed with bcrypt'
        }
      }
    );

    console.log('✅ SUCCESS! Passwords have been hashed and updated in GCS.');
    console.log('\n📋 Summary:');
    console.log(`   • ${officers.length} officer passwords hashed`);
    console.log('   • Original passwords replaced with bcrypt hashes');
    console.log('   • Data updated in loansiya-accounts/loan_officers.json');
    console.log('\n🚀 You can now use the secure login API endpoint!');
    
  } catch (error) {
    console.error('❌ Error hashing passwords:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('   • Make sure your .env file has GOOGLE_APPLICATION_CREDENTIALS set');
    console.error('   • Verify the service account has access to loansiya-accounts bucket');
    console.error('   • Check that loan_officers.json exists in the bucket');
    process.exit(1);
  }
}

// Run the script
console.log('🔐 LoanSiya Password Hashing Script');
console.log('====================================\n');

hashPasswords();