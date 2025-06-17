import React, { createContext, useState, useContext, useEffect } from 'react';
import { clientAPI } from '../services/api';

const LoanContext = createContext();

const POLLING_INTERVAL = 30000; // 30 seconds

export function LoanProvider({ children }) {
  const [loans, setLoans] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch clients when component mounts
  useEffect(() => {
    fetchClients();
  }, []);

  // Set up polling for notifications
  useEffect(() => {
    fetchNotifications(); // Initial fetch

    const interval = setInterval(() => {
      fetchNotifications();
    }, POLLING_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      setError(null);
      const clientData = await clientAPI.getAllClients();
      setLoans(clientData);
    } catch (err) {
      setError(`Failed to fetch clients: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const refreshClientData = async (cid) => {
    try {
      const updatedClient = await clientAPI.getClientById(cid);
      setLoans(prevLoans =>
        prevLoans.map(loan =>
          loan.cid === cid ? updatedClient : loan
        )
      );
      return updatedClient;
    } catch (err) {
      setError(`Failed to refresh client: ${err.message}`);
      throw err;
    }
  };

  // Fetch notifications from the server
  const fetchNotifications = async () => {
    try {
      const response = await clientAPI.notifications.getNotifications();
      setNotifications(response);
      setUnreadCount(response.filter(n => !n.read).length);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  const addNotification = async (notification) => {
    try {
      await clientAPI.notifications.createNotification({
        timestamp: new Date().toISOString(),
        read: false,
        ...notification
      });
      await fetchNotifications(); // Refresh notifications
    } catch (err) {
      console.error('Failed to create notification:', err);
    }
  };

  const markNotificationsAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
      if (unreadIds.length > 0) {
        await clientAPI.notifications.markAsRead(unreadIds);
        await fetchNotifications(); // Refresh notifications
      }
    } catch (err) {
      console.error('Failed to mark notifications as read:', err);
    }
  };

  const clearNotifications = () => {
    // Note: This is now just a visual clear, as we're keeping notifications in the backend
    setNotifications([]);
    setUnreadCount(0);
  };

  const updateLoan = async (cid, updates) => {
    try {
      const loan = loans.find(l => l.cid === cid);
      if (!loan) {
        throw new Error(`Loan not found for CID: ${cid}`);
      }

      // Update local state
      setLoans(prevLoans =>
        prevLoans.map(l =>
          l.cid === cid
            ? { ...l, ...updates }
            : l
        )
      );

      // Create notification in backend if status changed
      if (updates.status === 'Approved' || updates.status === 'Declined') {
        await addNotification({
          cid,
          clientName: loan.name,
          type: 'status_change',
          status: updates.status,
          message: `Loan request for client ${loan.name} has been ${updates.status.toLowerCase()} by Operations Manager`,
          recipientRole: 'loan_officer' // Specify that this is for loan officers
        });
      }

      // Refresh client data to ensure consistency
      const updatedClient = await refreshClientData(cid);
      return updatedClient;
    } catch (err) {
      console.error('Failed to update loan:', err);
      throw err;
    }
  };

  const updateLoanAmount = async (cid, newAmount) => {
    try {
      const targetLoan = loans.find(l => l.cid === cid);
      if (!targetLoan) throw new Error('Client not found');

      // Update amount in the API
      await clientAPI.updateLoanAmount(cid, newAmount);

      // Update local state after API success
      setLoans(prevLoans =>
        prevLoans.map(loan => {
          if (loan.cid === cid) {
            const updatedHistory = [...loan.loans.loanHistory];
            const latestRequestIndex = updatedHistory.findIndex(
              (loan, _, arr) =>
                new Date(loan.dateApplied).getTime() ===
                Math.max(...arr.map(l => new Date(l.dateApplied).getTime()))
            );

            if (latestRequestIndex !== -1) {
              updatedHistory[latestRequestIndex] = {
                ...updatedHistory[latestRequestIndex],
                amount: newAmount,
                decidedAt: new Date().toISOString()
              };
            }

            return {
              ...loan,
              loans: {
                ...loan.loans,
                loanHistory: updatedHistory
              }
            };
          }
          return loan;
        })
      );

      // Create notification in backend
      await addNotification({
        cid,
        clientName: targetLoan.name,
        type: 'amount_change',
        amount: newAmount,
        message: `Loan amount for client ${targetLoan.name} has been updated to ₱${newAmount.toLocaleString()} by Operations Manager`,
        recipientRole: 'loan_officer'
      });

      return await refreshClientData(cid);
    } catch (err) {
      console.error('Failed to update loan amount:', err);
      throw err;
    }
  };

  return (
    <LoanContext.Provider value={{
      loans,
      loading,
      error,
      updateLoan,
      updateLoanAmount,
      refreshClientData,
      notifications,
      unreadCount,
      markNotificationsAsRead,
      clearNotifications,
      fetchNotifications // Export this so components can manually refresh if needed
    }}>
      {children}
    </LoanContext.Provider>
  );
}

export function useLoan() {
  const context = useContext(LoanContext);
  if (!context) {
    throw new Error('useLoan must be used within a LoanProvider');
  }
  return context;
}