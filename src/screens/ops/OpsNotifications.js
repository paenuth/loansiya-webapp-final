import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { clientAPI } from '../../services/api';

export default function OpsNotifications({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await clientAPI.notifications.getNotifications('ops_manager');
      setNotifications(response);
    } catch (err) {
      console.error('Failed to fetch ops manager notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
      if (unreadIds.length > 0) {
        await clientAPI.notifications.markAsRead(unreadIds, 'ops_manager');
        await fetchNotifications(); // Refresh notifications
      }
    } catch (err) {
      console.error('Failed to mark notifications as read:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'new_application':
        return '📋';
      default:
        return '📢';
    }
  };

  const handleNotificationPress = async (notification) => {
    // Auto-mark notification as read when clicked
    if (!notification.read) {
      try {
        await clientAPI.notifications.markAsRead([notification.id], 'ops_manager');
        // Refresh notifications to update the UI
        await fetchNotifications();
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    }
    
    // Navigate to pending list for new applications
    if (notification.type === 'new_application') {
      navigation.navigate('OpsPendingList');
    }
  };

  const renderNotification = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        !item.read && styles.unreadNotification,
        isMobile && styles.notificationItemMobile
      ]}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <Text style={styles.notificationIcon}>
            {getNotificationIcon(item.type)}
          </Text>
          <Text style={[styles.notificationTitle, !item.read && styles.unreadTitle]}>
            New Application
          </Text>
          <Text style={styles.notificationTime}>
            {formatDate(item.timestamp)}
          </Text>
        </View>
        <Text style={[styles.notificationMessage, isMobile && styles.notificationMessageMobile]}>
          {item.message}
        </Text>
        {item.cid && (
          <Text style={styles.notificationCid}>
            Client ID: {item.cid}
          </Text>
        )}
      </View>
      {!item.read && <View style={styles.unreadIndicator} />}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, isMobile && styles.headerMobile]}>
        <TouchableOpacity
          style={[styles.backButton, isMobile && styles.backButtonMobile]}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.backButtonText, isMobile && styles.backButtonTextMobile]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, isMobile && styles.titleMobile]}>
          Operations Manager Notifications
        </Text>
        {notifications.some(n => !n.read) && (
          <TouchableOpacity
            style={[styles.markAllButton, isMobile && styles.markAllButtonMobile]}
            onPress={markAllAsRead}
          >
            <Text style={[styles.markAllButtonText, isMobile && styles.markAllButtonTextMobile]}>
              Mark All Read
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyText}>No notifications yet</Text>
          <Text style={styles.emptySubtext}>
            You'll receive notifications when new loan applications are submitted
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderNotification}
          style={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f6f6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Platform.select({ web: 20, default: 16 }),
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 12,
  },
  backButton: {
    padding: 8,
  },
  backButtonMobile: {
    padding: 4,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
  backButtonTextMobile: {
    fontSize: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529',
    flex: 1,
    textAlign: 'center',
  },
  titleMobile: {
    fontSize: 18,
    textAlign: 'left',
    flex: 0,
  },
  markAllButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  markAllButtonMobile: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-end',
  },
  markAllButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  markAllButtonTextMobile: {
    fontSize: 12,
  },
  list: {
    flex: 1,
  },
  notificationItem: {
    backgroundColor: '#fff',
    marginHorizontal: Platform.select({ web: 20, default: 16 }),
    marginVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    position: 'relative',
  },
  notificationItemMobile: {
    marginHorizontal: 12,
  },
  unreadNotification: {
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
    backgroundColor: '#f8f9ff',
  },
  notificationContent: {
    padding: 16,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  notificationIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#212529',
    flex: 1,
  },
  unreadTitle: {
    fontWeight: '600',
  },
  notificationTime: {
    fontSize: 12,
    color: '#6c757d',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#495057',
    lineHeight: 20,
    marginBottom: 4,
  },
  notificationMessageMobile: {
    fontSize: 13,
    lineHeight: 18,
  },
  notificationCid: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '500',
  },
  unreadIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6c757d',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#495057',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 20,
  },
});