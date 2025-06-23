export const formatDateForDisplay = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Helper function to calculate due date based on loan terms
export const calculateDueDate = (dateApplied, termMonths, repaymentMethod = 'monthly') => {
  if (!dateApplied || !termMonths) return 'N/A';
  
  const startDate = new Date(dateApplied);
  
  if (repaymentMethod.toLowerCase() === 'daily') {
    // For daily payments: start date + (term * 30) days
    const totalDays = termMonths * 30;
    const dueDate = new Date(startDate);
    dueDate.setDate(dueDate.getDate() + totalDays);
    
    return dueDate.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  } else if (repaymentMethod.toLowerCase() === 'weekly') {
    // For weekly payments: start date + (term * 4.33) weeks
    const totalWeeks = Math.ceil(termMonths * 4.33);
    const dueDate = new Date(startDate);
    dueDate.setDate(dueDate.getDate() + (totalWeeks * 7));
    
    return dueDate.toLocaleDateString('en-US', {
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    });
  } else {
    // For monthly payments: start date + term months
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + parseInt(termMonths));
    
    return dueDate.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric', 
      year: 'numeric'
    });
  }
};

// Helper function to get next day's date (for first payment)
export const getNextDay = (currentDate) => {
  const date = new Date(currentDate);
  date.setDate(date.getDate() + 1);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
};