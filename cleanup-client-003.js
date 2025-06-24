// Script to clean up duplicate entries in client 003 metrics
// This removes the duplicate "2025-06-24" entries and keeps only one "Declined" entry

const fs = require('fs');

// Sample data showing what we need to clean up
const currentData = {
  "paymentHistoryLog": [
    {
      "onTimePayments": 8,
      "latePayments": 1
    },
    {
      "onTimePayments": 12,
      "latePayments": 1
    }
  ],
  "utilizationData": {
    "totalUsed": 29033,
    "totalCreditLimit": 32147
  },
  "creditHistoryStartDate": "2019-01-01",
  "creditAccounts": [
    {
      "type": "mortgage"
    },
    {
      "type": "auto_loan"
    },
    {
      "type": "student_loan"
    }
  ],
  "loanHistory": [
    {
      "dateApplied": "2023-02-01",
      "status": "Approved"
    },
    {
      "dateApplied": "2023-10-01",
      "status": "Declined"
    },
    // These are the problematic entries - multiple for same date
    {
      "dateApplied": "2025-06-24",
      "status": "pending"      // ← Should be removed
    },
    {
      "dateApplied": "2025-06-24", 
      "status": "Declined"     // ← Keep this one
    },
    {
      "dateApplied": "2025-06-24",
      "status": "Declined"     // ← Should be removed (duplicate)
    }
  ]
};

// Clean up logic
function cleanupLoanHistory(loanHistory) {
  const cleanedHistory = [];
  const dateStatusMap = new Map();
  
  // Process each entry
  loanHistory.forEach(loan => {
    const key = loan.dateApplied;
    
    if (!dateStatusMap.has(key)) {
      // First entry for this date
      dateStatusMap.set(key, loan);
      cleanedHistory.push(loan);
    } else {
      // Duplicate date - only keep if it's a final status (not pending)
      const existing = dateStatusMap.get(key);
      if (existing.status === "pending" && loan.status !== "pending") {
        // Replace pending with final status
        const index = cleanedHistory.findIndex(h => h.dateApplied === key);
        cleanedHistory[index] = loan;
        dateStatusMap.set(key, loan);
      }
      // Otherwise ignore duplicate
    }
  });
  
  return cleanedHistory;
}

// Expected cleaned data
const cleanedData = {
  ...currentData,
  "loanHistory": [
    {
      "dateApplied": "2023-02-01",
      "status": "Approved"
    },
    {
      "dateApplied": "2023-10-01", 
      "status": "Declined"
    },
    {
      "dateApplied": "2025-06-24",
      "status": "Declined"      // ← Only one entry for this date
    }
  ]
};

console.log("🧹 Client 003 Cleanup Script");
console.log("📋 Current entries for 2025-06-24:");
currentData.loanHistory
  .filter(loan => loan.dateApplied === "2025-06-24")
  .forEach((loan, i) => console.log(`  ${i + 1}. ${loan.status}`));

console.log("\n✅ After cleanup:");
cleanedData.loanHistory
  .filter(loan => loan.dateApplied === "2025-06-24")
  .forEach((loan, i) => console.log(`  ${i + 1}. ${loan.status}`));

console.log("\n📝 To manually fix:");
console.log("1. Go to GCS bucket: client-metrics/003-raw.json");
console.log("2. Replace the loanHistory array with the cleaned version");
console.log("3. Remove duplicate 2025-06-24 entries, keep only one 'Declined'");