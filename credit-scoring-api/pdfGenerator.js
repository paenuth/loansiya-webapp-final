const PDFDocument = require('pdfkit');

function generatePromissoryNote(clientData, loanData, signature = null, signerName = 'Operations Manager') {
  return new Promise((resolve, reject) => {
    try {
      // Create a new PDF document
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50
      });

      // Create a buffer to store the PDF
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // Add content to the PDF
      // Header
      doc.fontSize(20)
         .text('PROMISSORY NOTE', {
           align: 'center'
         });

      doc.moveDown();
      
      // Date and Amount Section
      const today = new Date().toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });

      // Calculate the correct interest rate based on repayment method
      const calculatedRate = calculateInterestRate(loanData.repaymentMethod, loanData.term);

      doc.fontSize(12)
         .text(`Date: ${today}`)
         .text(`Principal Amount: P${loanData.approvedAmount.toLocaleString()}`)
         .text(`Interest Rate: ${calculatedRate}%`)
         .moveDown();

      // Main Content
      const amountInWords = numberToWords(loanData.approvedAmount);
      let paymentAmount;
      switch(loanData.repaymentMethod.toLowerCase()) {
        case 'daily':
          paymentAmount = calculateDailyPayment(loanData.approvedAmount, loanData.interestRate, loanData.term);
          break;
        case 'weekly':
          paymentAmount = calculateWeeklyPayment(loanData.approvedAmount, loanData.interestRate, loanData.term);
          break;
        default:
          paymentAmount = calculateMonthlyPayment(loanData.approvedAmount, loanData.interestRate, loanData.term);
      }

      doc.text(`FOR VALUE RECEIVED, I, ${clientData.name}, residing at ${clientData.address}, promise to pay to the order of LoanSiya, the principal sum of ${amountInWords} Pesos (P${loanData.approvedAmount.toLocaleString()}), with interest at the rate of ${calculatedRate} percent, beginning on ${getNextDay(today)}.`, {
        align: 'justify'
      });

      doc.moveDown();

      // Payment Terms
      doc.text('1. Payment Terms', {
        underline: true
      })
      .moveDown(0.5);

      const firstPaymentDate = getNextDay(today);
      const finalPaymentDate = getFinalPaymentDate(today, loanData.term, loanData.repaymentMethod);

      switch(loanData.repaymentMethod.toLowerCase()) {
        case 'daily':
          doc.text(`Payment shall be made in daily installments of P${paymentAmount.toLocaleString()}, beginning on ${firstPaymentDate}, and continuing each calendar day thereafter until the full amount of principal and interest has been paid. The final payment shall be due on ${finalPaymentDate}.`);
          break;
        case 'weekly':
          doc.text(`Payment shall be made in weekly installments of P${paymentAmount.toLocaleString()}, beginning on ${firstPaymentDate}, and continuing every seven (7) days thereafter until the full amount of principal and interest has been paid. The final payment shall be due on ${finalPaymentDate}.`);
          break;
        default:
          doc.text(`Payment shall be made in monthly installments of P${paymentAmount.toLocaleString()}, beginning on ${firstPaymentDate}, and continuing on the same day of each month thereafter until the full amount of principal and interest has been paid. The final payment shall be due on ${finalPaymentDate}.`);
      }
      doc.moveDown();

      // Prepayment
      doc.text('2. Prepayment', {
        underline: true
      })
      .moveDown(0.5)
      .text('The Borrower may prepay this Note in whole or in part at any time without penalty. Any prepayment shall first be applied to accrued interest and then to the principal balance.')
      .moveDown();

      // Default
      doc.text('3. Default', {
        underline: true
      })
      .moveDown(0.5)
      .text('In the event of default, including failure to pay any part of the principal or interest as agreed, the Lender may declare the remaining unpaid principal and accrued interest immediately due and payable.')
      .moveDown();

      // Governing Law
      doc.text('4. Governing Law', {
        underline: true
      })
      .moveDown(0.5)
      .text('This Note shall be governed under the laws of the Philippines.')
      .moveDown(2);

      // Signature Section
      doc.text('SIGNED BY:', {
        align: 'left'
      })
      .moveDown();
      
      // Add signature image if provided
      if (signature) {
        try {
          // Convert base64 signature to buffer
          const signatureBuffer = Buffer.from(signature.replace(/^data:image\/[a-z]+;base64,/, ''), 'base64');
          
          // Position signature above the signer name
          const currentY = doc.y;
          const signatureWidth = 120;
          const signatureHeight = 50;
          
          // Use the same x position as the document margin (50)
          const xPosition = 50;
          
          doc.image(signatureBuffer, xPosition, currentY, {
            fit: [signatureWidth, signatureHeight]
          });
          
          // Move to below the signature for the signer name
          doc.y = currentY + signatureHeight + 5;
          
        } catch (error) {
          console.error('Error adding signature to PDF:', error);
          // Fallback to signature line if image fails
          doc.text('_______________________');
          doc.moveDown(0.5);
        }
      } else {
        doc.text('_______________________');
        doc.moveDown(0.5);
      }
      
      // Signer name and title (positioned below signature)
      doc.text(signerName)
         .text('LoanSiya')
         .moveDown();

      // End the document
      doc.end();

    } catch (error) {
      reject(error);
    }
  });
}

// Helper function to convert numbers to words
function numberToWords(num) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

  if (num === 0) return 'Zero';

  function convert(n) {
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convert(n % 100) : '');
    if (n < 1000000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
    return convert(Math.floor(n / 1000000)) + ' Million' + (n % 1000000 ? ' ' + convert(n % 1000000) : '');
  }

  return convert(num);
}

// Helper function to calculate monthly payment
function calculateMonthlyPayment(principal, annualRate, termMonths) {
  const monthlyRate = (annualRate / 100) / 12;
  const payment = principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths) / (Math.pow(1 + monthlyRate, termMonths) - 1);
  return Math.round(payment);
}

// Helper function to get next day's date
function getNextDay(currentDate) {
  const date = new Date(currentDate);
  date.setDate(date.getDate() + 1);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}

// Helper function to calculate daily payment
function calculateDailyPayment(principal, annualRate, termMonths) {
  // Daily rate is 3.5% × number of months
  const dailyRate = 3.5 * termMonths;
  const totalAmount = principal * (1 + (dailyRate / 100));
  const days = termMonths * 30; // Approximate days in the loan term
  return Math.round(totalAmount / days);
}

// Helper function to calculate weekly payment
function calculateWeeklyPayment(principal, annualRate, termMonths) {
  // Weekly rate is 28% × (months ÷ 12)
  const weeklyRate = 28 * (termMonths / 12);
  const totalAmount = principal * (1 + (weeklyRate / 100));
  const weeks = Math.ceil(termMonths * 4.33); // Approximate weeks in the loan term
  return Math.round(totalAmount / weeks);
}

// Helper function to calculate monthly payment
function calculateMonthlyPayment(principal, annualRate, termMonths) {
  // Monthly rate is (28% ÷ 12) × months
  const monthlyRate = (28 / 12) * termMonths;
  const totalAmount = principal * (1 + (monthlyRate / 100));
  return Math.round(totalAmount / termMonths);
}

// Helper function to calculate interest rate based on repayment method
function calculateInterestRate(method, termMonths) {
  switch(method.toLowerCase()) {
    case 'daily':
      return 3.5 * termMonths;
    case 'weekly':
      return 28 * (termMonths / 12);
    default: // monthly
      return (28 / 12) * termMonths;
  }
}

// Helper function to get final payment date
function getFinalPaymentDate(startDate, termMonths, repaymentMethod = 'monthly') {
  if (repaymentMethod.toLowerCase() === 'daily') {
    // For daily payments: first payment date (June 24) + 89 days = final payment date
    const firstPaymentDate = new Date(startDate);
    firstPaymentDate.setDate(firstPaymentDate.getDate() + 1); // Next day after start date
    
    const totalDays = termMonths * 30;
    const finalDate = new Date(firstPaymentDate);
    finalDate.setDate(finalDate.getDate() + totalDays - 1);
    
    return finalDate.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  } else if (repaymentMethod.toLowerCase() === 'weekly') {
    // For weekly payments
    const firstPaymentDate = new Date(startDate);
    firstPaymentDate.setDate(firstPaymentDate.getDate() + 1);
    
    const totalWeeks = Math.ceil(termMonths * 4.33);
    const finalDate = new Date(firstPaymentDate);
    finalDate.setDate(finalDate.getDate() + (totalWeeks - 1) * 7);
    
    return finalDate.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  } else {
    // For monthly payments
    const finalDate = new Date(startDate);
    finalDate.setMonth(finalDate.getMonth() + parseInt(termMonths));
    return finalDate.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  }
}

module.exports = {
  generatePromissoryNote
};