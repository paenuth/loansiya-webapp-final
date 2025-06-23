require('dotenv').config();
const bcrypt = require('bcrypt');
const { Storage } = require('@google-cloud/storage');

// Initialize Google Cloud Storage
const storage = new Storage({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
});

// Use the loansiya-accounts bucket for all user data
const bucket = storage.bucket('loansiya-accounts');

// Define all user files to hash
const userFiles = [
  { filename: 'loan_officers.json', displayName: 'Loan Officers' },
  { filename: 'ops_managers.json', displayName: 'Operations Managers' },
  { filename: 'it_admins.json', displayName: 'IT Administrators' }
];

async function hashAllPasswords() {
  try {
    console.log('🔐 Starting password hashing process for all user types...\n');
    
    let totalUsers = 0;
    
    for (const userFile of userFiles) {
      try {
        console.log(`📥 Processing ${userFile.displayName} (${userFile.filename})...`);
        
        // Download current user data from GCS
        const [file] = await bucket.file(userFile.filename).download();
        const users = JSON.parse(file.toString());
        
        console.log(`👥 Found ${users.length} users in ${userFile.filename}:`);
        users.forEach(user => {
          console.log(`   - ${user.username} (${user.fullName}) - Status: ${user.status}`);
        });
        
        console.log(`🔨 Hashing passwords for ${userFile.displayName}...`);
        
        // Hash passwords for all users
        const hashedUsers = await Promise.all(
          users.map(async (user, index) => {
            const originalPassword = user.password;
            const hashedPassword = await bcrypt.hash(user.password, 10);
            
            console.log(`   ✅ ${index + 1}/${users.length} - ${user.username}: "${originalPassword}" → [HASHED]`);
            
            return {
              ...user,
              password: hashedPassword,
            };
          })
        );

        console.log(`📤 Uploading hashed ${userFile.displayName} back to GCS...`);
        
        // Upload the updated user data back to GCS
        await bucket.file(userFile.filename).save(
          JSON.stringify(hashedUsers, null, 2),
          { 
            contentType: 'application/json',
            metadata: {
              updated: new Date().toISOString(),
              note: 'Passwords hashed with bcrypt'
            }
          }
        );

        console.log(`✅ SUCCESS! ${userFile.displayName} passwords hashed and updated.\n`);
        totalUsers += users.length;
        
      } catch (fileError) {
        console.log(`⚠️  ${userFile.filename} not found or error processing: ${fileError.message}\n`);
        continue; // Continue to next file
      }
    }
    
    console.log('🎉 ALL DONE!');
    console.log('📋 Summary:');
    console.log(`   • ${totalUsers} total user passwords hashed`);
    console.log('   • Original passwords replaced with bcrypt hashes');
    console.log('   • All user types supported: Loan Officers, Ops Managers, IT Admins');
    console.log('\n🚀 You can now use the secure login API endpoint for all user types!');
    
  } catch (error) {
    console.error('❌ Error hashing passwords:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('   • Make sure your .env file has GOOGLE_APPLICATION_CREDENTIALS set');
    console.error('   • Verify the service account has access to loansiya-accounts bucket');
    console.error('   • Check that the JSON files exist in the bucket');
    process.exit(1);
  }
}

// Run the script
console.log('🔐 LoanSiya Universal Password Hashing Script');
console.log('==============================================\n');

hashAllPasswords();