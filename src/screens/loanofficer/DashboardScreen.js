import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useLoan } from '../../contexts/LoanContext';
import TopBar from '../../components/common/TopBar';
import DashboardCard from '../../components/common/DashboardCard';

export default function LoanOfficerDashboard({ navigation }) {
  const { loans, unreadCount } = useLoan();
  
  const totalLoanClients = loans.length;
  const totalLoanPending = loans.filter(loan =>
    loan.status === 'Pending' ||
    !loan.status
  ).length;

  return (
    <View style={styles.container}>
      <TopBar
        navigation={navigation}
        role="Loan Officer"
        showNotifications={true}
        unreadCount={unreadCount}
      />

      <View style={styles.content}>
        <View style={styles.cardRow}>
          <DashboardCard
            label="Total Loan Client"
            value={totalLoanClients}
            onPress={() => navigation.navigate('ClientList')}
          />
        <DashboardCard
          label="Total Loan List"
          value={totalLoanClients}
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
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardRow: {
    flexDirection: 'row',
    gap: 20,
  },
});
