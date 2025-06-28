import React, { createContext, useState, useContext, useEffect } from 'react';
import { clientAPI } from '../services/api';

const OpsContext = createContext();

const POLLING_INTERVAL = 30000; // 30 seconds

export function OpsProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Set up polling for ops manager notifications
  useEffect(() => {
    fetchNotifications(); // Initial fetch

    const interval = setInterval(() => {
      fetchNotifications();
    }, POLLING_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  // Fetch notifications from the server
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await clientAPI.notifications.getNotifications('ops_manager');
      setNotifications(response);
      setUnreadCount(response.filter(n => !n.read).length);
    } catch (err) {
      console.error('Failed to fetch ops manager notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const markNotificationsAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
      if (unreadIds.length > 0) {
        await clientAPI.notifications.markAsRead(unreadIds, 'ops_manager');
        await fetchNotifications(); // Refresh notifications
      }
    } catch (err) {
      console.error('Failed to mark ops manager notifications as read:', err);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await clientAPI.notifications.getNotifications('ops_manager');
      setUnreadCount(response.filter(n => !n.read).length);
    } catch (err) {
      console.error('Failed to fetch ops manager unread count:', err);
    }
  };

  const clearNotifications = () => {
    // Note: This is now just a visual clear, as we're keeping notifications in the backend
    setNotifications([]);
    setUnreadCount(0);
  };

  return (
    <OpsContext.Provider value={{
      notifications,
      unreadCount,
      loading,
      markNotificationsAsRead,
      clearNotifications,
      fetchNotifications, // Export this so components can manually refresh if needed
      fetchUnreadCount // Export this to refresh just the unread count
    }}>
      {children}
    </OpsContext.Provider>
  );
}

export function useOps() {
  const context = useContext(OpsContext);
  if (!context) {
    throw new Error('useOps must be used within an OpsProvider');
  }
  return context;
}