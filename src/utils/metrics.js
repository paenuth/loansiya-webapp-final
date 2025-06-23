/**
 * Utility functions for calculating dashboard metrics
 */

export const calculateLoanMetrics = (loans) => {
  const totalLoanClients = loans.length;
  
  const totalPending = loans.filter(loan =>
    loan.status === 'Pending' ||
    !loan.status
  ).length;
  
  const totalApproved = loans.filter(loan =>
    loan.status === 'Approved'
  ).length;

  const totalRejected = loans.filter(loan =>
    loan.status === 'Rejected'
  ).length;

  const pendingPercentage = totalLoanClients > 0 
    ? ((totalPending / totalLoanClients) * 100).toFixed(1)
    : 0;

  const approvalRate = totalLoanClients > 0
    ? ((totalApproved / totalLoanClients) * 100).toFixed(1)
    : 0;

  return {
    totalLoanClients,
    totalPending,
    totalApproved,
    totalRejected,
    pendingPercentage: Number(pendingPercentage),
    approvalRate: Number(approvalRate)
  };
};

export const getCardType = (metric, thresholds = {}) => {
  const {
    warningThreshold = 70,
    dangerThreshold = 90
  } = thresholds;

  if (metric >= dangerThreshold) return 'warning';
  if (metric >= warningThreshold) return 'secondary';
  return 'primary';
};