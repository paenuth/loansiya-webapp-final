import React from 'react';
import { View, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import { useLoan } from '../../contexts/LoanContext';
import TopBar from '../../components/common/TopBar';
import DashboardCard from '../../components/common/DashboardCard';

export default function LoanOfficerDashboard({ navigation }) {
  const { loans, unreadCount, fetchUnreadCount } = useLoan();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  
  // Total clients (all clients)
  const totalLoanClients = loans.length;
  
  // Total Loan List should count all clients that appear in any filter
  // Approved and declined clients always show, pending clients show only if no outstanding balance
  const totalLoanList = loans.filter(loan => {
    const currentStatus = loan.status ? loan.status.toLowerCase() : 'pending';
    const hasOutstandingBalance = loan.loanBalance && loan.loanBalance.amount > 0;
    
    // Include approved and declined clients regardless of balance
    if (currentStatus === 'approved' || currentStatus === 'declined') {
      return true;
    }
    
    // For pending clients, exclude those with outstanding balances
    if (loan.hasPendingApplication === true || (!loan.status)) {
      return !hasOutstandingBalance;
    }
    
    return false;
  }).length;

  const handleNotificationRead = () => {
    // Refresh unread count when notifications are marked as read
    fetchUnreadCount();
  };

  return (
    <View style={styles.container}>
      <TopBar
        navigation={navigation}
        role="Loan Officer"
        showNotifications={true}
        unreadCount={unreadCount}
        onNotificationRead={handleNotificationRead}
      />

      <View style={[styles.content, isMobile && styles.contentMobile]}>
        <View style={[styles.cardRow, isMobile && styles.cardRowMobile]}>
          <DashboardCard
            label="Total Loan Client"
            value={totalLoanClients}
            onPress={() => navigation.navigate('ClientList')}
          />
        <DashboardCard
          label="Total Loan List"
          value={totalLoanList}
          onPress={() => navigation.navigate('TotalLoanList')}
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
