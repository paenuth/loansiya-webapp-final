import React from 'react';
import { View, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import { useLoan } from '../../contexts/LoanContext';
import { useOps } from '../../contexts/OpsContext';
import TopBar from '../../components/common/TopBar';
import DashboardCard from '../../components/common/DashboardCard';

export default function OpsDashboardScreen({ navigation }) {
  const { loans } = useLoan();
  const { unreadCount, fetchUnreadCount } = useOps();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  
  const totalClients = loans.length;
  
  // Use the new hasPendingApplication flag to match OpsPendingList logic
  const totalPending = loans.filter(loan =>
    loan.hasPendingApplication === true
  ).length;

  const handleNotificationRead = () => {
    // Refresh unread count when notifications are marked as read
    fetchUnreadCount();
  };

  return (
    <View style={styles.container}>
      <TopBar
        navigation={navigation}
        role="Operations Manager"
        showNotifications={true}
        unreadCount={unreadCount}
        notificationScreen="OpsNotifications"
        onNotificationRead={handleNotificationRead}
      />

      <View style={[styles.content, isMobile && styles.contentMobile]}>
        <View style={[styles.cardRow, isMobile && styles.cardRowMobile]}>
          <DashboardCard
            label="Total Loan Clients"
            value={totalClients}
            onPress={() => navigation.navigate('OpsClientList')}
          />
          <DashboardCard
            label="Total Loan Pending"
            value={totalPending}
            onPress={() => navigation.navigate('OpsPendingList')}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f6f6',
  },
  content: {
    flex: 1,
    padding: Platform.select({ web: 40, default: 20 }),
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentMobile: {
    padding: 16,
  },
  cardRow: {
    flexDirection: 'row',
    gap: Platform.select({ web: 30, default: 15 }),
    flexWrap: 'wrap',
    justifyContent: 'center',
    maxWidth: 1200,
    width: '100%',
  },
  cardRowMobile: {
    gap: 12,
    paddingHorizontal: 10,
  },
});
